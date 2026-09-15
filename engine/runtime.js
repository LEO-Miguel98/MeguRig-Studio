"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;
  const E = ROOT.MeguEngine;
  const P = ROOT.MeguProjectV7;
  const X = ROOT.MeguExpressionMixer;
  if (!E || !P || !X) throw new Error("MeguEngine, MeguProjectV7 and MeguExpressionMixer must load before runtime.js");

  const TRANSFORM_KEYS = ["x", "y", "rotation", "scaleX", "scaleY", "opacity"];

  function cloneWarp(warp) {
    if (!warp || !Number.isInteger(warp.cols) || !Number.isInteger(warp.rows) || !Array.isArray(warp.points)) return null;
    if (warp.points.length !== warp.cols * warp.rows) return null;
    return {
      cols: warp.cols,
      rows: warp.rows,
      bounds: {
        x: E.finite(warp.bounds?.x, 0),
        y: E.finite(warp.bounds?.y, 0),
        width: Math.max(1e-8, Math.abs(E.finite(warp.bounds?.width, 1))),
        height: Math.max(1e-8, Math.abs(E.finite(warp.bounds?.height, 1))),
      },
      points: warp.points.map((point, index) => ({
        u: E.finite(point?.u, (index % warp.cols) / Math.max(1, warp.cols - 1)),
        v: E.finite(point?.v, Math.floor(index / warp.cols) / Math.max(1, warp.rows - 1)),
        dx: E.finite(point?.dx, 0),
        dy: E.finite(point?.dy, 0),
      })),
    };
  }

  function sameWarpTopology(a, b) {
    return Boolean(a && b && a.cols === b.cols && a.rows === b.rows && a.points?.length === b.points?.length);
  }

  function sampleWarp(track, parameters, baseWarp) {
    if (!baseWarp || !Array.isArray(track?.keys) || !track.keys.length) return null;
    const pseudoKeys = [];
    for (const key of track.keys) {
      const warp = cloneWarp(key?.form?.warp);
      if (!sameWarpTopology(baseWarp, warp)) return null;
      pseudoKeys.push({
        values: key.values,
        form: {
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
          vertices: warp.points.map((point) => ({ x: point.dx, y: point.dy })),
        },
      });
    }
    const sampled = E.sampleND(pseudoKeys, track.axes, parameters);
    if (!sampled?.vertices || sampled.vertices.length !== baseWarp.points.length) return null;
    const out = cloneWarp(baseWarp);
    out.points.forEach((point, index) => {
      point.dx = E.finite(sampled.vertices[index]?.x, point.dx);
      point.dy = E.finite(sampled.vertices[index]?.y, point.dy);
    });
    return out;
  }

  function baseForm(node) {
    return {
      transform: E.cloneForm({ transform: node?.transform || {} }).transform,
      vertices: Array.isArray(node?.mesh?.vertices)
        ? node.mesh.vertices.map((point) => ({ x: E.finite(point?.x, 0), y: E.finite(point?.y, 0) }))
        : null,
      warp: cloneWarp(node?.warp),
    };
  }

  function addFormDelta(target, sampled, base) {
    if (!sampled) return target;
    for (const key of TRANSFORM_KEYS) {
      target.transform[key] += E.finite(sampled.transform?.[key], base.transform[key]) - base.transform[key];
    }
    if (target.vertices && sampled.vertices && base.vertices && sampled.vertices.length === target.vertices.length && base.vertices.length === target.vertices.length) {
      target.vertices.forEach((point, index) => {
        point.x += E.finite(sampled.vertices[index]?.x, base.vertices[index].x) - base.vertices[index].x;
        point.y += E.finite(sampled.vertices[index]?.y, base.vertices[index].y) - base.vertices[index].y;
      });
    }
    if (sameWarpTopology(target.warp, sampled.warp) && sameWarpTopology(base.warp, sampled.warp)) {
      target.warp.points.forEach((point, index) => {
        point.dx += E.finite(sampled.warp.points[index]?.dx, base.warp.points[index].dx) - base.warp.points[index].dx;
        point.dy += E.finite(sampled.warp.points[index]?.dy, base.warp.points[index].dy) - base.warp.points[index].dy;
      });
    }
    target.transform.opacity = E.clamp(target.transform.opacity, 0, 1);
    target.transform.scaleX = E.clamp(target.transform.scaleX, 0.001, 50);
    target.transform.scaleY = E.clamp(target.transform.scaleY, 0.001, 50);
    return target;
  }

  function evaluateLocalForm(node, parameters) {
    const base = baseForm(node);
    const out = {
      transform: { ...base.transform },
      vertices: base.vertices?.map((point) => ({ ...point })) || null,
      warp: cloneWarp(base.warp),
    };
    for (const track of Array.isArray(node?.tracks) ? node.tracks : []) {
      if (!Array.isArray(track?.axes) || !track.axes.length || !Array.isArray(track?.keys) || !track.keys.length) continue;
      const sampled = E.sampleND(track.keys, track.axes, parameters);
      if (sampled && base.warp) sampled.warp = sampleWarp(track, parameters, base.warp);
      addFormDelta(out, sampled, base);
    }
    return out;
  }

  class Runtime {
    constructor(project) {
      const inspection = P.inspectV7(project);
      if (!inspection.ok) throw new Error(`Invalid project v7: ${inspection.issues.join(" ")}`);
      this.project = project;
      this.nodes = new Map(project.nodes.map((node) => [String(node.id), node]));
      this.parameters = E.sanitizeParameterState(project.parameters);
      this.expressionLayers = [];
      this.physics = new Map();
      for (const node of project.nodes) {
        if (!node?.physics?.enabled || !node.physics.segments) continue;
        this.physics.set(String(node.id), E.createSpringChain(node.physics.segments, {
          stiffness: node.physics.stiffness,
          damping: node.physics.damping,
          gravity: node.physics.gravity || 0,
          maxAngle: node.physics.maxAngle || 30,
        }));
      }
    }

    setParameters(values = {}) {
      this.parameters = E.sanitizeParameterState({ ...this.parameters, ...values });
      return this.parameters;
    }

    setExpressionLayers(layers = []) {
      this.expressionLayers = Array.isArray(layers) ? layers.slice(0, 32) : [];
    }

    effectiveParameters() {
      return X.mix(this.parameters, this.expressionLayers);
    }

    physicsAngles(dt, parameters) {
      const result = new Map();
      const input = E.finite(parameters.ParamAngleX, 0) * 0.55 + E.finite(parameters.ParamBodyAngleZ, 0) * 0.8 + E.finite(parameters.ParamAngleZ, 0) * 0.25;
      for (const [nodeId, chain] of this.physics) {
        const angles = E.stepSpringChain(chain, -input, dt);
        result.set(nodeId, angles.at(-1) || 0);
      }
      return result;
    }

    evaluateFrame(dt = 1 / 60) {
      const parameters = this.effectiveParameters();
      const physicsAngles = this.physicsAngles(dt, parameters);
      const local = new Map();
      for (const [id, node] of this.nodes) {
        const form = evaluateLocalForm(node, parameters);
        if (physicsAngles.has(id)) form.transform.rotation += physicsAngles.get(id);
        local.set(id, form);
      }

      const dynamicNodes = [...this.nodes.values()].map((node) => ({
        id: String(node.id),
        parentId: node.parentId == null ? null : String(node.parentId),
        type: node.type,
        transform: local.get(String(node.id))?.transform || node.transform,
        warp: local.get(String(node.id))?.warp || node.warp || null,
      }));
      const dynamicMap = E.buildNodeMap(dynamicNodes);

      const drawables = [];
      for (const node of this.project.nodes) {
        if (node?.type !== "layer" || node.visible === false) continue;
        const form = local.get(String(node.id));
        const vertices = form?.vertices;
        if (!vertices || !node?.mesh?.uvs || !node?.mesh?.triangles) continue;
        const worldVertices = vertices.map((point) => E.evaluatePoint(String(node.id), point, dynamicMap));
        drawables.push({
          nodeId: String(node.id),
          resourceId: node.resourceId,
          drawOrder: Math.round(E.finite(node.drawOrder, 0)),
          opacity: E.clamp(E.finite(form.transform.opacity, 1), 0, 1),
          mesh: {
            vertices: worldVertices,
            uvs: node.mesh.uvs.map((uv) => ({ u: E.finite(uv?.u, 0), v: E.finite(uv?.v, 0) })),
            triangles: [...node.mesh.triangles],
          },
          clipIds: Array.isArray(node.clipIds) ? node.clipIds.map(String) : [],
        });
      }
      drawables.sort((a, b) => a.drawOrder - b.drawOrder || a.nodeId.localeCompare(b.nodeId));
      return { parameters, drawables, localForms: local };
    }
  }

  ROOT.MeguRuntime = Object.freeze({ Runtime, evaluateLocalForm, addFormDelta, cloneWarp, sampleWarp });
})();
