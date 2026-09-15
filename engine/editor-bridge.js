"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;
  const E = ROOT.MeguEngine;
  const P = ROOT.MeguProjectV7;
  if (!E || !P) throw new Error("MeguEngine and MeguProjectV7 must load before editor-bridge.js");

  const MAX_IMPORTS = 100;
  const DEFAULT_TRANSFORM = Object.freeze({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 });

  function finiteDimension(value, fallback = 1) {
    const n = Math.round(E.finite(value, fallback));
    return E.clamp(n, 1, 8192);
  }

  function uniqueId(base, used) {
    base = P.safeId(base, "item");
    let id = base;
    let index = 2;
    while (used.has(id)) id = `${base}-${index++}`;
    used.add(id);
    return id;
  }

  function meshForImage(width, height, cols = 4, rows = 5) {
    width = finiteDimension(width);
    height = finiteDimension(height);
    const grid = E.makeGridMesh(cols, rows);
    const mesh = {
      vertices: grid.vertices.map((point) => ({
        x: (point.x - 0.5) * width,
        y: (point.y - 0.5) * height,
      })),
      uvs: grid.uvs.map((point) => ({ u: point.u, v: point.v })),
      triangles: [...grid.triangles],
    };
    const validation = E.validateMesh(mesh);
    if (!validation.ok) throw new Error(validation.errors.join(" "));
    return mesh;
  }

  function meshBounds(mesh) {
    const vertices = Array.isArray(mesh?.vertices) ? mesh.vertices : [];
    if (!vertices.length) return { x: -50, y: -50, width: 100, height: 100 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of vertices) {
      const x = E.finite(point?.x, 0);
      const y = E.finite(point?.y, 0);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  function createProjectFromImages(items = [], canvas = {}) {
    const descriptors = Array.isArray(items) ? items.slice(0, MAX_IMPORTS) : [];
    const width = E.clamp(Math.round(E.finite(canvas.width, 1200)), 320, 8192);
    const height = E.clamp(Math.round(E.finite(canvas.height, 1200)), 320, 8192);
    const used = new Set(["root"]);
    const resources = [];
    const nodes = [{
      id: "root",
      type: "group",
      parentId: null,
      name: "Model Root",
      transform: { ...DEFAULT_TRANSFORM },
      tracks: [],
    }];

    descriptors.forEach((raw, index) => {
      const fileName = P.safeName(raw?.fileName || raw?.name || `layer-${index + 1}.png`, `layer-${index + 1}.png`);
      const resourceId = uniqueId(`tex-${fileName.replace(/\.[^.]+$/, "")}`, used);
      const nodeId = uniqueId(raw?.id || fileName.replace(/\.[^.]+$/, "") || `layer-${index + 1}`, used);
      const imageWidth = finiteDimension(raw?.width, 512);
      const imageHeight = finiteDimension(raw?.height, 512);
      resources.push({ id: resourceId, type: "image", fileName, width: imageWidth, height: imageHeight });
      nodes.push({
        id: nodeId,
        type: "layer",
        parentId: "root",
        name: P.safeName(raw?.name || fileName, `Layer ${index + 1}`),
        role: P.safeId(raw?.role || "art", "art"),
        resourceId,
        drawOrder: Math.round(E.finite(raw?.drawOrder, index)),
        visible: raw?.visible !== false,
        transform: {
          x: E.finite(raw?.x, width / 2),
          y: E.finite(raw?.y, height / 2),
          rotation: E.finite(raw?.rotation, 0),
          scaleX: E.clamp(E.finite(raw?.scaleX, 1), 0.01, 20),
          scaleY: E.clamp(E.finite(raw?.scaleY, 1), 0.01, 20),
          opacity: E.clamp(E.finite(raw?.opacity, 1), 0, 1),
        },
        mesh: meshForImage(imageWidth, imageHeight, raw?.cols || 4, raw?.rows || 5),
        tracks: [],
        clipIds: [],
        physics: { enabled: false, segments: 0, stiffness: 12, damping: 0.82, gravity: 0, maxAngle: 30 },
      });
    });

    const project = {
      schema: P.SCHEMA,
      meta: { generatedAt: new Date().toISOString(), editor: "MeguRig v7 Lab" },
      canvas: { width, height },
      resources,
      nodes,
      parameters: E.sanitizeParameterState({}),
      expressions: Object.create(null),
      markers: [],
    };
    const inspection = P.inspectV7(project);
    if (!inspection.ok) throw new Error(inspection.issues.join(" "));
    return project;
  }

  function nodeById(project, id) {
    return project?.nodes?.find((node) => String(node.id) === String(id)) || null;
  }

  function descendants(project, nodeId) {
    const out = new Set();
    const queue = [String(nodeId)];
    while (queue.length) {
      const parent = queue.shift();
      for (const node of project?.nodes || []) {
        if (String(node.parentId) !== parent || out.has(String(node.id))) continue;
        out.add(String(node.id));
        queue.push(String(node.id));
      }
    }
    return out;
  }

  function reparentNode(project, nodeId, parentId) {
    const node = nodeById(project, nodeId);
    const parent = parentId == null ? null : nodeById(project, parentId);
    if (!node) throw new Error("Node not found.");
    if (parentId != null && !parent) throw new Error("Parent node not found.");
    if (String(nodeId) === "root") throw new Error("Root cannot be reparented.");
    if (parent && (String(parent.id) === String(node.id) || descendants(project, node.id).has(String(parent.id)))) {
      throw new Error("Reparenting would create a hierarchy cycle.");
    }
    node.parentId = parent ? String(parent.id) : null;
    const inspection = P.inspectV7(project);
    if (!inspection.ok) throw new Error(inspection.issues.join(" "));
    return node;
  }

  function wrapNode(project, childId, type = "warp", options = {}) {
    const child = nodeById(project, childId);
    if (!child || String(child.id) === "root") throw new Error("Select a non-root node to wrap.");
    if (!["warp", "rotation", "group"].includes(type)) throw new Error("Unsupported deformer type.");
    const used = new Set((project.nodes || []).map((node) => String(node.id)));
    const id = uniqueId(options.id || `${type}-${child.id}`, used);
    const bounds = meshBounds(child.mesh);
    const deformer = {
      id,
      type,
      parentId: child.parentId == null ? "root" : String(child.parentId),
      name: P.safeName(options.name || `${type === "warp" ? "Warp" : type === "rotation" ? "Rotation" : "Group"} · ${child.name}`, "Deformer"),
      transform: { ...DEFAULT_TRANSFORM },
      tracks: [],
    };
    if (type === "warp") deformer.warp = E.createWarpGrid(options.cols || 3, options.rows || 3, bounds);
    const insertAt = Math.max(1, project.nodes.indexOf(child));
    project.nodes.splice(insertAt, 0, deformer);
    child.parentId = id;
    const inspection = P.inspectV7(project);
    if (!inspection.ok) {
      project.nodes.splice(insertAt, 1);
      child.parentId = deformer.parentId;
      throw new Error(inspection.issues.join(" "));
    }
    return deformer;
  }

  function captureForm(node) {
    if (!node) throw new Error("Node not found.");
    return {
      transform: {
        x: E.finite(node.transform?.x, 0),
        y: E.finite(node.transform?.y, 0),
        rotation: E.finite(node.transform?.rotation, 0),
        scaleX: E.finite(node.transform?.scaleX, 1),
        scaleY: E.finite(node.transform?.scaleY, 1),
        opacity: E.clamp(E.finite(node.transform?.opacity, 1), 0, 1),
      },
      vertices: Array.isArray(node.mesh?.vertices)
        ? node.mesh.vertices.map((point) => ({ x: E.finite(point?.x, 0), y: E.finite(point?.y, 0) }))
        : null,
      warp: node.warp ? {
        cols: node.warp.cols,
        rows: node.warp.rows,
        bounds: { ...node.warp.bounds },
        points: node.warp.points.map((point) => ({ u: point.u, v: point.v, dx: E.finite(point.dx, 0), dy: E.finite(point.dy, 0) })),
      } : null,
    };
  }

  function normalizeAxes(axes) {
    const known = E.STANDARD_PARAMETERS;
    const result = [...new Set((Array.isArray(axes) ? axes : [axes]).map(String).filter((id) => known[id]))].slice(0, 3);
    if (!result.length) throw new Error("Choose at least one valid parameter axis.");
    return result;
  }

  function captureKey(project, nodeId, axes, values = project?.parameters || {}) {
    const node = nodeById(project, nodeId);
    if (!node) throw new Error("Node not found.");
    axes = normalizeAxes(axes);
    node.tracks ||= [];
    let track = node.tracks.find((candidate) => Array.isArray(candidate.axes) && candidate.axes.length === axes.length && candidate.axes.every((axis, index) => axis === axes[index]));
    if (!track) {
      track = { axes: [...axes], blendMode: "interpolate", keys: [] };
      node.tracks.push(track);
    }
    const sanitized = E.sanitizeParameterState(values);
    const keyValues = Object.fromEntries(axes.map((axis) => [axis, sanitized[axis]]));
    const existing = track.keys.find((key) => axes.every((axis) => Math.abs(E.finite(key.values?.[axis], 0) - keyValues[axis]) < 1e-8));
    const key = { values: keyValues, form: captureForm(node) };
    if (existing) Object.assign(existing, key);
    else track.keys.push(key);
    track.keys.sort((a, b) => axes.reduce((sum, axis) => sum + E.finite(a.values?.[axis], 0) - E.finite(b.values?.[axis], 0), 0));
    return key;
  }

  function removeKey(project, nodeId, axes, values = project?.parameters || {}) {
    const node = nodeById(project, nodeId);
    if (!node) return false;
    axes = normalizeAxes(axes);
    const trackIndex = (node.tracks || []).findIndex((candidate) => Array.isArray(candidate.axes) && candidate.axes.length === axes.length && candidate.axes.every((axis, index) => axis === axes[index]));
    if (trackIndex < 0) return false;
    const track = node.tracks[trackIndex];
    const sanitized = E.sanitizeParameterState(values);
    const index = track.keys.findIndex((key) => axes.every((axis) => Math.abs(E.finite(key.values?.[axis], 0) - sanitized[axis]) < 1e-8));
    if (index < 0) return false;
    track.keys.splice(index, 1);
    if (!track.keys.length) node.tracks.splice(trackIndex, 1);
    return true;
  }

  ROOT.MeguEditorBridge = Object.freeze({
    meshForImage,
    meshBounds,
    createProjectFromImages,
    nodeById,
    descendants,
    reparentNode,
    wrapNode,
    captureForm,
    captureKey,
    removeKey,
  });
})();
