"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;
  const E = ROOT.MeguEngine;
  if (!E) throw new Error("MeguEngine must be loaded before project-v7.js");

  const SCHEMA = "megurig.project.v7";
  const MAX_NODES = 300;
  const MAX_PARAMETERS = 128;
  const MAX_TRACKS_PER_NODE = 64;
  const MAX_KEYS_PER_TRACK = 128;
  const MAX_EXPRESSIONS = 64;
  const MAX_MARKERS = 64;
  const RESERVED = new Set(["__proto__", "prototype", "constructor"]);

  const LEGACY_TO_V7_PARAMETER = Object.freeze({
    ParamAngleX: "ParamAngleX",
    ParamAngleY: "ParamAngleY",
    ParamBodyAngleZ: "ParamBodyAngleZ",
    ParamMouthOpenY: "ParamMouthOpenY",
  });

  function safeName(value, fallback = "Item") {
    const result = String(value ?? "")
      .replace(/[<>\u0000-\u001f]/g, "_")
      .trim()
      .slice(0, 100);
    return result || fallback;
  }

  function safeId(value, fallback = "node") {
    let result = String(value ?? "")
      .replace(/[^a-zA-Z0-9_.:-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    if (!result || RESERVED.has(result)) result = fallback;
    return result;
  }

  function uniqueId(base, used) {
    base = safeId(base, "node");
    let id = base;
    let index = 2;
    while (used.has(id)) id = `${base}-${index++}`;
    used.add(id);
    return id;
  }

  function normalizeDimensions(raw) {
    const width = Math.round(E.finite(raw?.width, 0));
    const height = Math.round(E.finite(raw?.height, 0));
    if (width < 1 || height < 1 || width * height > 80_000_000) return null;
    return { width, height };
  }

  function dimensionsFor(fileName, dimensionsByFile) {
    if (!dimensionsByFile) return null;
    if (dimensionsByFile instanceof Map) {
      return normalizeDimensions(dimensionsByFile.get(fileName) ?? dimensionsByFile.get(fileName.toLowerCase()));
    }
    if (typeof dimensionsByFile === "object") {
      return normalizeDimensions(dimensionsByFile[fileName] ?? dimensionsByFile[fileName.toLowerCase()]);
    }
    return null;
  }

  function legacyGridToMesh(grid, dimensions) {
    if (!grid || !dimensions) return null;
    const cols = Math.round(E.finite(grid.cols, 0));
    const rows = Math.round(E.finite(grid.rows, 0));
    if (cols < 2 || rows < 2 || cols > 64 || rows > 64) return null;
    if (!Array.isArray(grid.points) || grid.points.length !== cols * rows) return null;
    const vertices = [];
    const uvs = [];
    for (let index = 0; index < grid.points.length; index++) {
      const point = grid.points[index] || {};
      const col = index % cols;
      const row = Math.floor(index / cols);
      const u = E.clamp(E.finite(point.u, col / (cols - 1)), 0, 1);
      const v = E.clamp(E.finite(point.v, row / (rows - 1)), 0, 1);
      const ox = E.clamp(E.finite(point.ox, 0), -dimensions.width * 4, dimensions.width * 4);
      const oy = E.clamp(E.finite(point.oy, 0), -dimensions.height * 4, dimensions.height * 4);
      vertices.push({
        x: (u - 0.5) * dimensions.width + ox,
        y: (v - 0.5) * dimensions.height + oy,
      });
      uvs.push({ u, v });
    }
    const triangles = [];
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const a = row * cols + col;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        triangles.push(a, b, d, a, d, c);
      }
    }
    const mesh = { vertices, uvs, triangles };
    return E.validateMesh(mesh).ok ? mesh : null;
  }

  function cleanLegacyTransform(transform = {}) {
    return {
      x: E.clamp(E.finite(transform.x, 0), -10000, 10000),
      y: E.clamp(E.finite(transform.y, 0), -10000, 10000),
      rotation: E.clamp(E.finite(transform.rotation, 0), -360, 360),
      scaleX: E.clamp(E.finite(transform.scaleX, E.finite(transform.scale, 1)), 0.01, 20),
      scaleY: E.clamp(E.finite(transform.scaleY, E.finite(transform.scale, 1)), 0.01, 20),
      opacity: E.clamp(E.finite(transform.opacity, 1), 0, 1),
    };
  }

  function migrateLegacyTrack(parameterId, items, dimensions) {
    if (!Array.isArray(items) || !items.length) return null;
    const mapped = LEGACY_TO_V7_PARAMETER[parameterId] || parameterId;
    const keys = items.slice(0, MAX_KEYS_PER_TRACK).map((item) => ({
      values: { [mapped]: E.finite(item?.value, 0) },
      form: {
        transform: cleanLegacyTransform(item?.transform),
        vertices: legacyGridToMesh(item?.mesh, dimensions)?.vertices || null,
      },
    })).sort((a, b) => a.values[mapped] - b.values[mapped]);
    return { axes: [mapped], blendMode: "interpolate", keys };
  }

  function migrateExpressions(expressions) {
    const out = Object.create(null);
    if (!expressions || typeof expressions !== "object") return out;
    for (const [rawName, raw] of Object.entries(expressions).slice(0, MAX_EXPRESSIONS)) {
      const name = safeName(rawName, "Expression");
      if (RESERVED.has(name)) continue;
      out[name] = {
        mode: "parameter-layer",
        values: {
          ParamAngleX: { mode: "add", value: E.clamp(E.finite(raw?.headX, 0), -30, 30) },
          ParamAngleY: { mode: "add", value: E.clamp(E.finite(raw?.headY, 0), -30, 30) },
          ParamBodyAngleZ: { mode: "add", value: E.clamp(E.finite(raw?.bodyZ, 0), -10, 10) },
          ParamEyeLOpen: { mode: "multiply", value: E.clamp(E.finite(raw?.eyeOpen, 100) / 100, 0, 1) },
          ParamEyeROpen: { mode: "multiply", value: E.clamp(E.finite(raw?.eyeOpen, 100) / 100, 0, 1) },
          ParamMouthOpenY: { mode: "override", value: E.clamp(E.finite(raw?.mouthOpen, 0) / 100, 0, 1) },
        },
      };
    }
    return out;
  }

  function migrateV6(project, dimensionsByFile = null) {
    if (!project || typeof project !== "object" || !/^megurig\.project\.v[2-6]$/.test(String(project.schema || ""))) {
      throw new Error("migrateV6 expects a MeguRig project v2-v6 object.");
    }
    if (!Array.isArray(project.layers)) throw new Error("Legacy project layers are missing.");

    const warnings = [];
    const usedIds = new Set(["root"]);
    const resources = [];
    const nodes = [{
      id: "root",
      type: "group",
      parentId: null,
      name: "Model Root",
      transform: cleanLegacyTransform({}),
    }];

    for (const [index, layer] of project.layers.slice(0, MAX_NODES - 1).entries()) {
      const fileName = safeName(layer?.fileName || layer?.name || `layer-${index}.png`, `layer-${index}.png`);
      const dimensions = dimensionsFor(fileName, dimensionsByFile);
      const resourceId = uniqueId(`tex-${fileName.replace(/\.[^.]+$/, "")}`, usedIds);
      resources.push({
        id: resourceId,
        type: "image",
        fileName,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
      });

      const nodeId = uniqueId(layer?.id || `layer-${index + 1}`, usedIds);
      const mesh = legacyGridToMesh(layer?.mesh, dimensions);
      if (layer?.mesh && !mesh) warnings.push(`${fileName}: mesh migration is pending artwork dimensions/reattachment.`);
      const tracks = [];
      for (const [parameterId, items] of Object.entries(layer?.keyforms || {}).slice(0, MAX_TRACKS_PER_NODE)) {
        const track = migrateLegacyTrack(parameterId, items, dimensions);
        if (track) tracks.push(track);
      }
      nodes.push({
        id: nodeId,
        type: "layer",
        parentId: "root",
        name: safeName(layer?.name || fileName, `Layer ${index + 1}`),
        role: safeId(layer?.role || "art", "art"),
        resourceId,
        drawOrder: Math.round(E.finite(layer?.z, index)),
        visible: layer?.visible !== false,
        pivot: {
          x: E.clamp(E.finite(layer?.pivot?.x, 0.5), 0, 1),
          y: E.clamp(E.finite(layer?.pivot?.y, 0.5), 0, 1),
        },
        transform: cleanLegacyTransform(layer?.transform),
        mesh,
        legacyGrid: mesh ? null : (layer?.mesh ? JSON.parse(JSON.stringify(layer.mesh)) : null),
        tracks,
        clipIds: [],
        physics: {
          enabled: Boolean(layer?.physics?.enabled),
          stiffness: E.clamp(8 + E.finite(layer?.physics?.strength, 0.25) * 28, 1, 80),
          damping: E.clamp(E.finite(layer?.physics?.damping, 0.8), 0.05, 0.999),
          segments: Boolean(layer?.physics?.enabled) ? 2 : 0,
        },
      });
    }

    const p = project.parameters || {};
    const parameters = E.sanitizeParameterState({
      ParamAngleX: p.ParamAngleX,
      ParamAngleY: p.ParamAngleY,
      ParamAngleZ: 0,
      ParamBodyAngleX: 0,
      ParamBodyAngleY: 0,
      ParamBodyAngleZ: p.ParamBodyAngleZ,
      ParamEyeLOpen: p.ParamEyeLOpen ?? p.ParamEyeOpen,
      ParamEyeROpen: p.ParamEyeROpen ?? p.ParamEyeOpen,
      ParamEyeBallX: 0,
      ParamEyeBallY: 0,
      ParamBrowLY: 0,
      ParamBrowRY: 0,
      ParamBrowLForm: 0,
      ParamBrowRForm: 0,
      ParamMouthOpenY: p.ParamMouthOpenY,
      ParamMouthForm: 0,
      ParamMouthX: 0,
      ParamBreath: 0,
    });

    return {
      schema: SCHEMA,
      meta: {
        generatedAt: new Date().toISOString(),
        migratedFrom: String(project.schema),
        migrationWarnings: warnings,
      },
      canvas: {
        width: Math.max(1, Math.round(E.finite(project.scene?.width, 1200))),
        height: Math.max(1, Math.round(E.finite(project.scene?.height, 1200))),
      },
      resources,
      nodes,
      parameters,
      expressions: migrateExpressions(project.expressions),
      markers: Array.isArray(project.markers)
        ? project.markers.slice(0, MAX_MARKERS).map((marker) => ({
            type: safeName(marker?.type || "Marker", "Marker"),
            x: E.clamp(E.finite(marker?.x, 0), -100000, 100000),
            y: E.clamp(E.finite(marker?.y, 0), -100000, 100000),
          }))
        : [],
    };
  }

  function inspectV7(project) {
    const issues = [];
    const warnings = [];
    if (!project || project.schema !== SCHEMA) issues.push("Unsupported project schema.");
    const nodes = Array.isArray(project?.nodes) ? project.nodes : [];
    const resources = Array.isArray(project?.resources) ? project.resources : [];
    if (!nodes.length) issues.push("Project has no scene nodes.");
    if (nodes.length > MAX_NODES) issues.push("Project exceeds the node limit.");
    if (resources.length > MAX_NODES) issues.push("Project exceeds the resource limit.");
    const ids = new Set();
    for (const node of nodes) {
      const id = String(node?.id || "");
      if (!id || RESERVED.has(id)) issues.push("Node has an invalid id.");
      if (ids.has(id)) issues.push(`Duplicate node id: ${id}`);
      ids.add(id);
      if (node?.mesh) {
        const result = E.validateMesh(node.mesh);
        if (!result.ok) issues.push(`${id || "node"}: ${result.errors[0]}`);
      }
      const tracks = Array.isArray(node?.tracks) ? node.tracks : [];
      if (tracks.length > MAX_TRACKS_PER_NODE) issues.push(`${id}: too many parameter tracks.`);
      for (const track of tracks) {
        if (!Array.isArray(track?.axes) || !track.axes.length || track.axes.length > 3) issues.push(`${id}: invalid track axes.`);
        if (!Array.isArray(track?.keys) || track.keys.length > MAX_KEYS_PER_TRACK) issues.push(`${id}: invalid key count.`);
      }
    }
    for (const node of nodes) {
      if (node?.parentId && !ids.has(String(node.parentId))) issues.push(`${node.id}: missing parent '${node.parentId}'.`);
    }
    try {
      E.resolveWorldMatrices(nodes.map((node) => ({
        id: node.id,
        parentId: node.parentId,
        type: node.type,
        transform: node.transform,
        warp: node.warp,
      })));
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "Invalid node hierarchy.");
    }
    const parameters = project?.parameters && typeof project.parameters === "object" ? project.parameters : {};
    if (Object.keys(parameters).length > MAX_PARAMETERS) issues.push("Project exceeds the parameter limit.");
    const expressions = project?.expressions && typeof project.expressions === "object" ? project.expressions : {};
    if (Object.keys(expressions).length > MAX_EXPRESSIONS) issues.push("Project exceeds the expression limit.");
    if (Array.isArray(project?.meta?.migrationWarnings)) warnings.push(...project.meta.migrationWarnings.map(String));
    return { ok: issues.length === 0, issues, warnings };
  }

  ROOT.MeguProjectV7 = Object.freeze({
    SCHEMA,
    safeName,
    safeId,
    legacyGridToMesh,
    migrateV6,
    inspectV7,
  });
})();
