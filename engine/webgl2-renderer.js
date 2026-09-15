"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;

  const VERTEX_SHADER = `#version 300 es
  precision highp float;
  in vec2 a_position;
  in vec2 a_uv;
  uniform vec2 u_resolution;
  out vec2 v_uv;
  void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
    v_uv = a_uv;
  }`;

  const FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  uniform sampler2D u_texture;
  uniform float u_opacity;
  in vec2 v_uv;
  out vec4 outColor;
  void main() {
    vec4 color = texture(u_texture, v_uv);
    outColor = vec4(color.rgb, color.a * u_opacity);
  }`;

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not allocate WebGL shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation error.";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function link(gl, vertexSource = VERTEX_SHADER, fragmentSource = FRAGMENT_SHADER) {
    const program = gl.createProgram();
    if (!program) throw new Error("Could not allocate WebGL program.");
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unknown shader link error.";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function packMesh(mesh, transform = null) {
    const validation = ROOT.MeguEngine?.validateMesh?.(mesh);
    if (validation && !validation.ok) throw new Error(validation.errors.join(" "));
    if (!Array.isArray(mesh?.vertices) || !Array.isArray(mesh?.uvs) || !Array.isArray(mesh?.triangles)) {
      throw new Error("Renderer mesh is incomplete.");
    }
    const positions = new Float32Array(mesh.vertices.length * 2);
    const uvs = new Float32Array(mesh.uvs.length * 2);
    const matrix = transform && ROOT.MeguEngine?.matrixFromTransform
      ? ROOT.MeguEngine.matrixFromTransform(transform)
      : null;
    mesh.vertices.forEach((vertex, index) => {
      const source = { x: finite(vertex?.x), y: finite(vertex?.y) };
      const point = matrix && ROOT.MeguEngine?.applyMatrix
        ? ROOT.MeguEngine.applyMatrix(matrix, source)
        : source;
      positions[index * 2] = point.x;
      positions[index * 2 + 1] = point.y;
      uvs[index * 2] = finite(mesh.uvs[index]?.u);
      uvs[index * 2 + 1] = finite(mesh.uvs[index]?.v);
    });
    const maxIndex = Math.max(0, ...mesh.triangles.map((value) => Number(value) || 0));
    const IndexArray = maxIndex > 65535 ? Uint32Array : Uint16Array;
    return { positions, uvs, indices: new IndexArray(mesh.triangles) };
  }

  class WebGL2Renderer {
    constructor(canvas, options = {}) {
      if (!canvas?.getContext) throw new Error("A canvas element is required.");
      const gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: Boolean(options.preserveDrawingBuffer),
      });
      if (!gl) throw new Error("WebGL2 is unavailable in this browser/device.");
      this.canvas = canvas;
      this.gl = gl;
      this.program = link(gl);
      this.positionBuffer = gl.createBuffer();
      this.uvBuffer = gl.createBuffer();
      this.indexBuffer = gl.createBuffer();
      this.vao = gl.createVertexArray();
      this.positionLocation = gl.getAttribLocation(this.program, "a_position");
      this.uvLocation = gl.getAttribLocation(this.program, "a_uv");
      this.resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");
      this.opacityLocation = gl.getUniformLocation(this.program, "u_opacity");
      this.textureLocation = gl.getUniformLocation(this.program, "u_texture");
      this.textures = new Set();
      this.lost = false;
      this.onContextLost = (event) => {
        event.preventDefault();
        this.lost = true;
      };
      this.onContextRestored = () => {
        this.lost = false;
      };
      canvas.addEventListener?.("webglcontextlost", this.onContextLost, false);
      canvas.addEventListener?.("webglcontextrestored", this.onContextRestored, false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.program);
      gl.uniform1i(this.textureLocation, 0);
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.enableVertexAttribArray(this.uvLocation);
      gl.vertexAttribPointer(this.uvLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bindVertexArray(null);
    }

    resize(width, height, devicePixelRatio = 1) {
      const dpr = Math.max(1, Math.min(2, finite(devicePixelRatio, 1)));
      const w = Math.max(1, Math.round(finite(width, this.canvas.clientWidth || 1) * dpr));
      const h = Math.max(1, Math.round(finite(height, this.canvas.clientHeight || 1) * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.gl.viewport(0, 0, w, h);
      return { width: w, height: h, dpr };
    }

    clear() {
      if (this.lost) return;
      const gl = this.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    createTexture(source) {
      if (this.lost) throw new Error("WebGL context is lost.");
      const gl = this.gl;
      const texture = gl.createTexture();
      if (!texture) throw new Error("Could not allocate WebGL texture.");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      this.textures.add(texture);
      return texture;
    }

    deleteTexture(texture) {
      if (!texture) return;
      this.gl.deleteTexture(texture);
      this.textures.delete(texture);
    }

    drawMesh(texture, mesh, options = {}) {
      if (this.lost) return false;
      const gl = this.gl;
      const packed = packMesh(mesh, options.transform);
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, packed.positions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, packed.uvs, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, packed.indices, gl.DYNAMIC_DRAW);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.opacityLocation, Math.max(0, Math.min(1, finite(options.opacity, 1))));
      const type = packed.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      gl.drawElements(gl.TRIANGLES, packed.indices.length, type, 0);
      gl.bindVertexArray(null);
      return true;
    }

    dispose() {
      const gl = this.gl;
      for (const texture of this.textures) gl.deleteTexture(texture);
      this.textures.clear();
      gl.deleteBuffer(this.positionBuffer);
      gl.deleteBuffer(this.uvBuffer);
      gl.deleteBuffer(this.indexBuffer);
      gl.deleteVertexArray(this.vao);
      gl.deleteProgram(this.program);
      this.canvas.removeEventListener?.("webglcontextlost", this.onContextLost, false);
      this.canvas.removeEventListener?.("webglcontextrestored", this.onContextRestored, false);
    }
  }

  ROOT.MeguWebGL2 = Object.freeze({ WebGL2Renderer, packMesh, VERTEX_SHADER, FRAGMENT_SHADER });
})();
