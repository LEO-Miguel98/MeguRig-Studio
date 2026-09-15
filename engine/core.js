"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;
  const EPSILON = 1e-8;

  const STANDARD_PARAMETERS = Object.freeze({
    ParamAngleX: { min: -30, default: 0, max: 30, group: "head" },
    ParamAngleY: { min: -30, default: 0, max: 30, group: "head" },
    ParamAngleZ: { min: -30, default: 0, max: 30, group: "head" },
    ParamBodyAngleX: { min: -10, default: 0, max: 10, group: "body" },
    ParamBodyAngleY: { min: -10, default: 0, max: 10, group: "body" },
    ParamBodyAngleZ: { min: -10, default: 0, max: 10, group: "body" },
    ParamEyeLOpen: { min: 0, default: 1, max: 1, group: "eyes" },
    ParamEyeROpen: { min: 0, default: 1, max: 1, group: "eyes" },
    ParamEyeBallX: { min: -1, default: 0, max: 1, group: "eyes" },
    ParamEyeBallY: { min: -1, default: 0, max: 1, group: "eyes" },
    ParamBrowLY: { min: -1, default: 0, max: 1, group: "brows" },
    ParamBrowRY: { min: -1, default: 0, max: 1, group: "brows" },
    ParamBrowLForm: { min: -1, default: 0, max: 1, group: "brows" },
    ParamBrowRForm: { min: -1, default: 0, max: 1, group: "brows" },
    ParamMouthOpenY: { min: 0, default: 0, max: 1, group: "mouth" },
    ParamMouthForm: { min: -1, default: 0, max: 1, group: "mouth" },
    ParamMouthX: { min: -1, default: 0, max: 1, group: "mouth" },
    ParamBreath: { min: 0, default: 0, max: 1, group: "body" },
  });

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sanitizeParameterState(values = {}, definitions = STANDARD_PARAMETERS) {
    const out = Object.create(null);
    for (const [id, def] of Object.entries(definitions)) {
      out[id] = clamp(finite(values[id], def.default), def.min, def.max);
    }
    return out;
  }

  function identityMatrix() {
    return [1, 0, 0, 1, 0, 0];
  }

  function multiplyMatrix(a, b) {
    return [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5],
    ];
  }

  function matrixFromTransform(transform = {}) {
    const x = finite(transform.x, 0);
    const y = finite(transform.y, 0);
    const rotation = finite(transform.rotation, 0) * Math.PI / 180;
    const scaleX = finite(transform.scaleX, finite(transform.scale, 1));
    const scaleY = finite(transform.scaleY, finite(transform.scale, 1));
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return [cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y];
  }

  function applyMatrix(matrix, point) {
    const x = finite(point?.x, 0);
    const y = finite(point?.y, 0);
    return {
      x: matrix[0] * x + matrix[2] * y + matrix[4],
      y: matrix[1] * x + matrix[3] * y + matrix[5],
    };
  }

  function makeGridMesh(cols = 4, rows = 5) {
    cols = clamp(Math.round(finite(cols, 4)), 2, 64);
    rows = clamp(Math.round(finite(rows, 5)), 2, 64);
    const vertices = [];
    const uvs = [];
    const triangles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const u = col / (cols - 1);
        const v = row / (rows - 1);
        vertices.push({ x: u, y: v });
        uvs.push({ u, v });
      }
    }
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const a = row * cols + col;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        triangles.push(a, b, d, a, d, c);
      }
    }
    return { cols, rows, vertices, uvs, triangles };
  }

  function validateMesh(mesh, maxVertices = 4096) {
    const errors = [];
    if (!mesh || typeof mesh !== "object") return { ok: false, errors: ["Mesh is missing."] };
    const vertices = Array.isArray(mesh.vertices) ? mesh.vertices : [];
    const uvs = Array.isArray(mesh.uvs) ? mesh.uvs : [];
    const triangles = Array.isArray(mesh.triangles) ? mesh.triangles : [];
    if (vertices.length < 3) errors.push("Mesh requires at least three vertices.");
    if (vertices.length > maxVertices) errors.push("Mesh exceeds the vertex limit.");
    if (uvs.length !== vertices.length) errors.push("UV count must match vertex count.");
    if (!triangles.length || triangles.length % 3 !== 0) errors.push("Triangle indices must be a non-empty multiple of three.");
    vertices.forEach((point, index) => {
      if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) errors.push(`Vertex ${index} is invalid.`);
    });
    uvs.forEach((point, index) => {
      if (!Number.isFinite(Number(point?.u)) || !Number.isFinite(Number(point?.v))) errors.push(`UV ${index} is invalid.`);
    });
    for (const value of triangles) {
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || index >= vertices.length) {
        errors.push("Triangle index is outside the vertex array.");
        break;
      }
    }
    if (!errors.length) {
      for (let i = 0; i < triangles.length; i += 3) {
        const a = vertices[triangles[i]];
        const b = vertices[triangles[i + 1]];
        const c = vertices[triangles[i + 2]];
        const area2 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (Math.abs(area2) < EPSILON) {
          errors.push(`Triangle ${i / 3} is degenerate.`);
          break;
        }
      }
    }
    return { ok: errors.length === 0, errors };
  }

  function cloneForm(form = {}) {
    return {
      transform: {
        x: finite(form.transform?.x, 0),
        y: finite(form.transform?.y, 0),
        rotation: finite(form.transform?.rotation, 0),
        scaleX: finite(form.transform?.scaleX, finite(form.transform?.scale, 1)),
        scaleY: finite(form.transform?.scaleY, finite(form.transform?.scale, 1)),
        opacity: clamp(finite(form.transform?.opacity, 1), 0, 1),
      },
      vertices: Array.isArray(form.vertices)
        ? form.vertices.map((point) => ({ x: finite(point?.x, 0), y: finite(point?.y, 0) }))
        : null,
    };
  }

  function blendForm(a, b, t) {
    t = clamp(finite(t, 0), 0, 1);
    a = cloneForm(a);
    b = cloneForm(b);
    const transform = {};
    for (const key of ["x", "y", "rotation", "scaleX", "scaleY", "opacity"]) {
      transform[key] = lerp(a.transform[key], b.transform[key], t);
    }
    let vertices = null;
    if (a.vertices && b.vertices && a.vertices.length === b.vertices.length) {
      vertices = a.vertices.map((point, index) => ({
        x: lerp(point.x, b.vertices[index].x, t),
        y: lerp(point.y, b.vertices[index].y, t),
      }));
    } else if (a.vertices || b.vertices) {
      vertices = (t < 0.5 ? a.vertices : b.vertices)?.map((point) => ({ ...point })) || null;
    }
    return { transform, vertices };
  }

  function axisBracket(values, value) {
    const unique = [...new Set(values.map((item) => finite(item, 0)))].sort((a, b) => a - b);
    if (!unique.length) return null;
    value = finite(value, unique[0]);
    if (value <= unique[0]) return { low: unique[0], high: unique[0], t: 0 };
    if (value >= unique.at(-1)) return { low: unique.at(-1), high: unique.at(-1), t: 0 };
    for (let i = 0; i < unique.length - 1; i++) {
      if (value >= unique[i] && value <= unique[i + 1]) {
        const span = unique[i + 1] - unique[i];
        return { low: unique[i], high: unique[i + 1], t: span > EPSILON ? (value - unique[i]) / span : 0 };
      }
    }
    return null;
  }

  function keyDistance(key, requested, axes) {
    let distance = 0;
    for (const axis of axes) distance += Math.abs(finite(key.values?.[axis], 0) - requested[axis]);
    return distance;
  }

  function findCorner(keys, requested, axes) {
    const exact = keys.find((key) => axes.every((axis) => finite(key.values?.[axis], NaN) === requested[axis]));
    if (exact) return exact;
    let nearest = null;
    let best = Infinity;
    for (const key of keys) {
      const distance = keyDistance(key, requested, axes);
      if (distance < best) {
        best = distance;
        nearest = key;
      }
    }
    return nearest;
  }

  function sampleND(keys, axes, state) {
    if (!Array.isArray(keys) || !keys.length || !Array.isArray(axes) || !axes.length) return null;
    const brackets = axes.map((axis) => axisBracket(keys.map((key) => key.values?.[axis]), state?.[axis]));
    if (brackets.some((bracket) => !bracket)) return null;
    const corners = 1 << axes.length;
    let weighted = null;
    let total = 0;
    for (let mask = 0; mask < corners; mask++) {
      const requested = Object.create(null);
      let weight = 1;
      axes.forEach((axis, index) => {
        const bracket = brackets[index];
        const high = Boolean(mask & (1 << index));
        requested[axis] = high ? bracket.high : bracket.low;
        weight *= bracket.low === bracket.high ? 1 : (high ? bracket.t : 1 - bracket.t);
      });
      if (weight <= EPSILON) continue;
      const key = findCorner(keys, requested, axes);
      if (!key?.form) continue;
      if (!weighted) {
        weighted = cloneForm(key.form);
        total = weight;
      } else {
        const nextTotal = total + weight;
        weighted = blendForm(weighted, key.form, weight / nextTotal);
        total = nextTotal;
      }
    }
    return weighted;
  }

  function createWarpGrid(cols = 3, rows = 3, bounds = { x: 0, y: 0, width: 1, height: 1 }) {
    cols = clamp(Math.round(finite(cols, 3)), 2, 16);
    rows = clamp(Math.round(finite(rows, 3)), 2, 16);
    const points = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        points.push({ u: col / (cols - 1), v: row / (rows - 1), dx: 0, dy: 0 });
      }
    }
    return {
      cols,
      rows,
      bounds: {
        x: finite(bounds?.x, 0),
        y: finite(bounds?.y, 0),
        width: Math.max(EPSILON, Math.abs(finite(bounds?.width, 1))),
        height: Math.max(EPSILON, Math.abs(finite(bounds?.height, 1))),
      },
      points,
    };
  }

  function warpPoint(point, warp) {
    if (!warp?.points || !Number.isInteger(warp.cols) || !Number.isInteger(warp.rows)) return { ...point };
    if (warp.points.length !== warp.cols * warp.rows) return { ...point };
    const bounds = warp.bounds || { x: 0, y: 0, width: 1, height: 1 };
    const nx = clamp((finite(point?.x, 0) - finite(bounds.x, 0)) / Math.max(EPSILON, finite(bounds.width, 1)), 0, 1);
    const ny = clamp((finite(point?.y, 0) - finite(bounds.y, 0)) / Math.max(EPSILON, finite(bounds.height, 1)), 0, 1);
    const gx = nx * (warp.cols - 1);
    const gy = ny * (warp.rows - 1);
    const x0 = Math.min(warp.cols - 2, Math.floor(gx));
    const y0 = Math.min(warp.rows - 2, Math.floor(gy));
    const tx = gx - x0;
    const ty = gy - y0;
    const index = (x, y) => y * warp.cols + x;
    const p00 = warp.points[index(x0, y0)];
    const p10 = warp.points[index(x0 + 1, y0)];
    const p01 = warp.points[index(x0, y0 + 1)];
    const p11 = warp.points[index(x0 + 1, y0 + 1)];
    const dx0 = lerp(finite(p00?.dx, 0), finite(p10?.dx, 0), tx);
    const dx1 = lerp(finite(p01?.dx, 0), finite(p11?.dx, 0), tx);
    const dy0 = lerp(finite(p00?.dy, 0), finite(p10?.dy, 0), tx);
    const dy1 = lerp(finite(p01?.dy, 0), finite(p11?.dy, 0), tx);
    return {
      x: finite(point?.x, 0) + lerp(dx0, dx1, ty),
      y: finite(point?.y, 0) + lerp(dy0, dy1, ty),
    };
  }

  function buildNodeMap(nodes) {
    const map = new Map();
    for (const raw of Array.isArray(nodes) ? nodes : []) {
      const id = String(raw?.id || "").trim();
      if (!id || map.has(id)) throw new Error("Every engine node requires a unique id.");
      map.set(id, {
        id,
        parentId: raw?.parentId == null ? null : String(raw.parentId),
        type: ["layer", "rotation", "warp", "group"].includes(raw?.type) ? raw.type : "group",
        transform: raw?.transform || {},
        warp: raw?.warp || null,
      });
    }
    return map;
  }

  function lineage(nodeId, map) {
    const chain = [];
    const seen = new Set();
    let current = map.get(nodeId);
    if (!current) throw new Error(`Unknown node '${nodeId}'.`);
    while (current) {
      if (seen.has(current.id)) throw new Error("Deformer hierarchy contains a cycle.");
      seen.add(current.id);
      chain.push(current);
      if (!current.parentId) break;
      current = map.get(current.parentId);
      if (!current) throw new Error("Deformer hierarchy references a missing parent.");
    }
    return chain.reverse();
  }

  function evaluatePoint(nodeId, point, nodes) {
    const map = nodes instanceof Map ? nodes : buildNodeMap(nodes);
    let result = { x: finite(point?.x, 0), y: finite(point?.y, 0) };
    for (const node of lineage(nodeId, map)) {
      if (node.type === "warp" && node.warp) result = warpPoint(result, node.warp);
      result = applyMatrix(matrixFromTransform(node.transform), result);
    }
    return result;
  }

  function resolveWorldMatrices(nodes) {
    const map = nodes instanceof Map ? nodes : buildNodeMap(nodes);
    const out = new Map();
    const visiting = new Set();
    function visit(id) {
      if (out.has(id)) return out.get(id);
      if (visiting.has(id)) throw new Error("Deformer hierarchy contains a cycle.");
      const node = map.get(id);
      if (!node) throw new Error(`Unknown node '${id}'.`);
      visiting.add(id);
      const local = matrixFromTransform(node.transform);
      const world = node.parentId ? multiplyMatrix(visit(node.parentId), local) : local;
      visiting.delete(id);
      out.set(id, world);
      return world;
    }
    for (const id of map.keys()) visit(id);
    return out;
  }

  function createSpringChain(count = 3, options = {}) {
    count = clamp(Math.round(finite(count, 3)), 1, 32);
    return {
      stiffness: clamp(finite(options.stiffness, 12), 0.01, 200),
      damping: clamp(finite(options.damping, 0.82), 0.01, 0.9999),
      gravity: finite(options.gravity, 0),
      maxAngle: clamp(Math.abs(finite(options.maxAngle, 35)), 1, 180),
      segments: Array.from({ length: count }, () => ({ angle: 0, velocity: 0 })),
    };
  }

  function stepSpringChain(chain, inputAngle, dt) {
    if (!chain?.segments?.length) return [];
    dt = clamp(finite(dt, 1 / 60), 1 / 1000, 0.05);
    let target = clamp(finite(inputAngle, 0), -chain.maxAngle, chain.maxAngle);
    for (let index = 0; index < chain.segments.length; index++) {
      const segment = chain.segments[index];
      const lag = 1 / (1 + index * 0.45);
      const desired = target * lag + chain.gravity * (index + 1);
      segment.velocity += (desired - segment.angle) * chain.stiffness * dt;
      segment.velocity *= Math.pow(chain.damping, dt * 60);
      segment.angle += segment.velocity * dt * 60;
      segment.angle = clamp(segment.angle, -chain.maxAngle, chain.maxAngle);
      target = segment.angle;
    }
    return chain.segments.map((segment) => segment.angle);
  }

  const API = Object.freeze({
    STANDARD_PARAMETERS,
    finite,
    clamp,
    lerp,
    sanitizeParameterState,
    identityMatrix,
    multiplyMatrix,
    matrixFromTransform,
    applyMatrix,
    makeGridMesh,
    validateMesh,
    cloneForm,
    blendForm,
    sampleND,
    createWarpGrid,
    warpPoint,
    buildNodeMap,
    evaluatePoint,
    resolveWorldMatrices,
    createSpringChain,
    stepSpringChain,
  });

  ROOT.MeguEngine = API;
})();
