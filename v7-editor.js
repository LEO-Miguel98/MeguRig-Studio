"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const MAX_ART_BYTES = 25 * 1024 * 1024;
  const MAX_PROJECT_BYTES = 8 * 1024 * 1024;
  const PARAMETER_IDS = [
    "ParamAngleX", "ParamAngleY", "ParamAngleZ",
    "ParamBodyAngleX", "ParamBodyAngleY", "ParamBodyAngleZ",
    "ParamEyeLOpen", "ParamEyeROpen", "ParamEyeBallX", "ParamEyeBallY",
    "ParamBrowLY", "ParamBrowRY", "ParamMouthOpenY", "ParamMouthForm", "ParamBreath",
  ];

  const ui = {
    artInput: $("artInput"), projectInput: $("projectInput"), saveProject: $("saveProject"), validateProject: $("validateProject"),
    sceneTree: $("sceneTree"), nodeCount: $("nodeCount"), wrapWarp: $("wrapWarp"), wrapRotation: $("wrapRotation"), selectedName: $("selectedName"),
    nodeX: $("nodeX"), nodeY: $("nodeY"), nodeRotation: $("nodeRotation"), nodeScaleX: $("nodeScaleX"), nodeScaleY: $("nodeScaleY"), nodeOpacity: $("nodeOpacity"),
    drawOrder: $("drawOrder"), drawOrderLabel: $("drawOrderLabel"), nodeVisible: $("nodeVisible"), meshPanel: $("meshPanel"), meshVertex: $("meshVertex"), meshX: $("meshX"), meshY: $("meshY"), resetMesh: $("resetMesh"),
    warpPanel: $("warpPanel"), warpPoint: $("warpPoint"), warpDx: $("warpDx"), warpDy: $("warpDy"), resetWarp: $("resetWarp"), parameterControls: $("parameterControls"),
    trackAxes: $("trackAxes"), captureKey: $("captureKey"), deleteKey: $("deleteKey"), trackSummary: $("trackSummary"), physicsPanel: $("physicsPanel"), physicsEnabled: $("physicsEnabled"),
    physicsSegments: $("physicsSegments"), physicsSegmentsOut: $("physicsSegmentsOut"), physicsStiffness: $("physicsStiffness"), physicsStiffnessOut: $("physicsStiffnessOut"), physicsDamping: $("physicsDamping"), physicsDampingOut: $("physicsDampingOut"),
    stage: $("stage"), overlay: $("overlay"), stageWrap: $("stageWrap"), emptyState: $("emptyState"), status: $("status"), validationStatus: $("validationStatus"), modeLabel: $("modeLabel"), fps: $("fps"),
  };

  const E = window.MeguEngine;
  const P = window.MeguProjectV7;
  const B = window.MeguEditorBridge;
  const R = window.MeguRuntime;
  const G = window.MeguWebGL2;
  if (!E || !P || !B || !R || !G) {
    ui.status.textContent = "Engine failed to load. Refresh the page.";
    return;
  }

  let renderer;
  try {
    renderer = new G.WebGL2Renderer(ui.stage, { preserveDrawingBuffer: false });
  } catch (error) {
    ui.status.textContent = error instanceof Error ? error.message : "WebGL2 initialization failed.";
    return;
  }

  const state = {
    project: null,
    runtime: null,
    selectedId: null,
    textures: new Map(),
    pendingLegacy: null,
    lastFrame: null,
    lastTime: performance.now(),
    fpsFrames: 0,
    fpsTime: performance.now(),
  };

  function setStatus(message) {
    ui.status.textContent = String(message || "");
  }

  function selectedNode() {
    return state.project ? B.nodeById(state.project, state.selectedId) : null;
  }

  function clearTextures() {
    for (const texture of state.textures.values()) renderer.deleteTexture(texture);
    state.textures.clear();
  }

  function configureCanvas() {
    const project = state.project;
    if (!project) return;
    const width = Math.max(1, Math.round(E.finite(project.canvas?.width, 1200)));
    const height = Math.max(1, Math.round(E.finite(project.canvas?.height, 1200)));
    renderer.resize(width, height, 1);
    ui.overlay.width = width;
    ui.overlay.height = height;
    ui.stageWrap.style.aspectRatio = `${width} / ${height}`;
  }

  function rebuildRuntime() {
    if (!state.project) {
      state.runtime = null;
      return;
    }
    state.runtime = new R.Runtime(state.project);
    state.runtime.setParameters(state.project.parameters || {});
  }

  function setProject(project, message = "Project ready.") {
    const inspection = P.inspectV7(project);
    if (!inspection.ok) throw new Error(inspection.issues.join(" "));
    state.project = project;
    state.pendingLegacy = null;
    state.selectedId = project.nodes.find((node) => node.type === "layer")?.id || project.nodes[0]?.id || null;
    configureCanvas();
    rebuildRuntime();
    renderSceneTree();
    renderParameters();
    syncSelectedControls();
    validateProject();
    ui.saveProject.disabled = false;
    ui.validateProject.disabled = false;
    ui.emptyState.hidden = state.textures.size > 0;
    setStatus(message);
  }

  function nodeTypeLabel(node) {
    return node.type === "layer" ? "ART" : node.type === "warp" ? "WARP" : node.type === "rotation" ? "ROT" : "GROUP";
  }

  function renderSceneTree() {
    ui.sceneTree.textContent = "";
    if (!state.project) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Import separated artwork to begin.";
      ui.sceneTree.append(p);
      ui.nodeCount.textContent = "0";
      return;
    }
    const nodes = state.project.nodes || [];
    ui.nodeCount.textContent = String(nodes.length);
    const byParent = new Map();
    for (const node of nodes) {
      const key = node.parentId == null ? "__root__" : String(node.parentId);
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(node);
    }
    const addChildren = (parentKey, depth) => {
      for (const node of byParent.get(parentKey) || []) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `scene-node${String(node.id) === String(state.selectedId) ? " active" : ""}`;
        button.style.paddingLeft = `${10 + depth * 18}px`;
        const name = document.createElement("span");
        name.textContent = node.name || node.id;
        const type = document.createElement("small");
        type.textContent = nodeTypeLabel(node);
        button.append(name, type);
        button.addEventListener("click", () => {
          state.selectedId = String(node.id);
          renderSceneTree();
          syncSelectedControls();
        });
        ui.sceneTree.append(button);
        addChildren(String(node.id), depth + 1);
      }
    };
    addChildren("__root__", 0);
  }

  function clampTransform(node) {
    node.transform ||= {};
    node.transform.x = E.clamp(E.finite(node.transform.x, 0), -10000, 10000);
    node.transform.y = E.clamp(E.finite(node.transform.y, 0), -10000, 10000);
    node.transform.rotation = E.clamp(E.finite(node.transform.rotation, 0), -360, 360);
    node.transform.scaleX = E.clamp(E.finite(node.transform.scaleX, 1), 0.01, 20);
    node.transform.scaleY = E.clamp(E.finite(node.transform.scaleY, 1), 0.01, 20);
    node.transform.opacity = E.clamp(E.finite(node.transform.opacity, 1), 0, 1);
  }

  function fillSelect(select, count, formatter) {
    const previous = Math.min(Math.max(0, Number(select.value) || 0), Math.max(0, count - 1));
    select.textContent = "";
    for (let index = 0; index < count; index++) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = formatter(index);
      select.append(option);
    }
    select.value = String(previous);
  }

  function syncMeshPoint() {
    const node = selectedNode();
    const index = Number(ui.meshVertex.value) || 0;
    const point = node?.mesh?.vertices?.[index];
    ui.meshX.value = point ? String(Math.round(point.x * 100) / 100) : "0";
    ui.meshY.value = point ? String(Math.round(point.y * 100) / 100) : "0";
  }

  function syncWarpPoint() {
    const node = selectedNode();
    const index = Number(ui.warpPoint.value) || 0;
    const point = node?.warp?.points?.[index];
    ui.warpDx.value = point ? String(Math.round(point.dx * 100) / 100) : "0";
    ui.warpDy.value = point ? String(Math.round(point.dy * 100) / 100) : "0";
  }

  function syncPhysics() {
    const node = selectedNode();
    const physics = node?.physics || {};
    ui.physicsEnabled.checked = Boolean(physics.enabled);
    ui.physicsSegments.value = String(E.clamp(Math.round(E.finite(physics.segments, 3)) || 3, 1, 8));
    ui.physicsStiffness.value = String(E.clamp(E.finite(physics.stiffness, 12), 1, 60));
    ui.physicsDamping.value = String(Math.round(E.clamp(E.finite(physics.damping, 0.82), 0.5, 0.99) * 100));
    syncPhysicsOutputs();
  }

  function syncPhysicsOutputs() {
    ui.physicsSegmentsOut.value = ui.physicsSegments.value;
    ui.physicsStiffnessOut.value = ui.physicsStiffness.value;
    ui.physicsDampingOut.value = (Number(ui.physicsDamping.value) / 100).toFixed(2);
  }

  function syncSelectedControls() {
    const node = selectedNode();
    const controls = [ui.nodeX, ui.nodeY, ui.nodeRotation, ui.nodeScaleX, ui.nodeScaleY, ui.nodeOpacity, ui.trackAxes, ui.captureKey, ui.deleteKey];
    for (const control of controls) control.disabled = !node;
    ui.wrapWarp.disabled = !node || node.id === "root";
    ui.wrapRotation.disabled = !node || node.id === "root";
    if (!node) {
      ui.selectedName.textContent = "None";
      ui.meshPanel.hidden = true;
      ui.warpPanel.hidden = true;
      ui.physicsPanel.hidden = true;
      renderTrackSummary();
      return;
    }
    clampTransform(node);
    ui.selectedName.textContent = `${node.name || node.id} · ${node.type}`;
    ui.modeLabel.textContent = `${nodeTypeLabel(node)} · ${node.name || node.id}`;
    ui.nodeX.value = String(node.transform.x);
    ui.nodeY.value = String(node.transform.y);
    ui.nodeRotation.value = String(node.transform.rotation);
    ui.nodeScaleX.value = String(node.transform.scaleX);
    ui.nodeScaleY.value = String(node.transform.scaleY);
    ui.nodeOpacity.value = String(node.transform.opacity);
    const isLayer = node.type === "layer";
    ui.drawOrderLabel.hidden = !isLayer;
    ui.drawOrder.disabled = !isLayer;
    ui.drawOrder.value = String(Math.round(E.finite(node.drawOrder, 0)));
    ui.nodeVisible.disabled = !isLayer;
    ui.nodeVisible.checked = node.visible !== false;
    ui.meshPanel.hidden = !isLayer || !node.mesh;
    ui.physicsPanel.hidden = !isLayer;
    ui.warpPanel.hidden = node.type !== "warp" || !node.warp;
    if (!ui.meshPanel.hidden) {
      fillSelect(ui.meshVertex, node.mesh.vertices.length, (index) => `Vertex ${index + 1}`);
      syncMeshPoint();
    }
    if (!ui.warpPanel.hidden) {
      fillSelect(ui.warpPoint, node.warp.points.length, (index) => {
        const point = node.warp.points[index];
        return `Point ${index + 1} · ${(point.u * 100).toFixed(0)}%, ${(point.v * 100).toFixed(0)}%`;
      });
      syncWarpPoint();
    }
    if (isLayer) syncPhysics();
    renderTrackSummary();
  }

  function updateSelectedTransform() {
    const node = selectedNode();
    if (!node) return;
    node.transform ||= {};
    node.transform.x = Number(ui.nodeX.value);
    node.transform.y = Number(ui.nodeY.value);
    node.transform.rotation = Number(ui.nodeRotation.value);
    node.transform.scaleX = Number(ui.nodeScaleX.value);
    node.transform.scaleY = Number(ui.nodeScaleY.value);
    node.transform.opacity = Number(ui.nodeOpacity.value);
    clampTransform(node);
  }

  function renderParameters() {
    ui.parameterControls.textContent = "";
    if (!state.project) return;
    for (const id of PARAMETER_IDS) {
      const def = E.STANDARD_PARAMETERS[id];
      if (!def) continue;
      const row = document.createElement("div");
      row.className = "parameter-row";
      const label = document.createElement("label");
      label.htmlFor = `param-${id}`;
      label.textContent = id.replace(/^Param/, "");
      const slider = document.createElement("input");
      slider.id = `param-${id}`;
      slider.type = "range";
      slider.min = String(def.min);
      slider.max = String(def.max);
      slider.step = def.max - def.min <= 2 ? "0.01" : "1";
      slider.value = String(E.finite(state.project.parameters?.[id], def.default));
      const output = document.createElement("output");
      const sync = () => {
        const value = E.clamp(Number(slider.value), def.min, def.max);
        state.project.parameters[id] = value;
        state.runtime?.setParameters({ [id]: value });
        output.value = Math.abs(value) < 10 && def.max - def.min <= 2 ? value.toFixed(2) : String(Math.round(value * 100) / 100);
      };
      slider.addEventListener("input", sync);
      sync();
      row.append(label, slider, output);
      ui.parameterControls.append(row);
    }
  }

  function axesFromUI() {
    return String(ui.trackAxes.value || "ParamAngleX").split(",").filter(Boolean);
  }

  function renderTrackSummary() {
    ui.trackSummary.textContent = "";
    const node = selectedNode();
    if (!node || !Array.isArray(node.tracks) || !node.tracks.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = node ? "No keyform tracks on this node yet." : "Select a node, pose it, set parameters, then capture.";
      ui.trackSummary.append(p);
      return;
    }
    for (const track of node.tracks) {
      const pill = document.createElement("div");
      pill.className = "track-pill";
      pill.textContent = `${(track.axes || []).join(" × ")} · ${(track.keys || []).length} keyform${track.keys?.length === 1 ? "" : "s"}`;
      ui.trackSummary.append(pill);
    }
  }

  function validateProject() {
    if (!state.project) {
      ui.validationStatus.textContent = "No project";
      return null;
    }
    const result = P.inspectV7(state.project);
    ui.validationStatus.textContent = result.ok ? `v7 valid · ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}` : `${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}`;
    return result;
  }

  async function decodeArtwork(file) {
    if (!(file instanceof File)) throw new Error("Invalid artwork file.");
    if (!["image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name}: only PNG/WebP layers are accepted.`);
    if (file.size < 1 || file.size > MAX_ART_BYTES) throw new Error(`${file.name}: file exceeds the 25 MB limit.`);
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      return { file, source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      return { file, source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function resourceForFile(fileName) {
    const target = String(fileName || "").toLowerCase();
    return state.project?.resources?.find((resource) => String(resource.fileName || "").toLowerCase() === target) || null;
  }

  async function attachArtwork(files) {
    const list = [...files].slice(0, 100);
    if (!list.length) return;
    setStatus(`Decoding ${list.length} local artwork layer${list.length === 1 ? "" : "s"}…`);
    const decoded = [];
    try {
      for (const file of list) decoded.push(await decodeArtwork(file));
      if (state.pendingLegacy) {
        const dimensions = Object.create(null);
        for (const item of decoded) {
          dimensions[item.file.name] = { width: item.width, height: item.height };
          dimensions[item.file.name.toLowerCase()] = { width: item.width, height: item.height };
        }
        clearTextures();
        const migrated = P.migrateV6(state.pendingLegacy, dimensions);
        setProject(migrated, `Migrated ${state.pendingLegacy.schema} to v7 and attached local artwork.`);
      } else if (!state.project) {
        const maxWidth = Math.max(...decoded.map((item) => item.width), 1200);
        const maxHeight = Math.max(...decoded.map((item) => item.height), 1600);
        clearTextures();
        const project = B.createProjectFromImages(decoded.map((item, index) => ({
          fileName: item.file.name,
          name: item.file.name.replace(/\.[^.]+$/, ""),
          width: item.width,
          height: item.height,
          drawOrder: index,
        })), { width: Math.min(4096, maxWidth), height: Math.min(4096, maxHeight) });
        setProject(project, `Created v7 project from ${decoded.length} textured layer${decoded.length === 1 ? "" : "s"}.`);
      }

      let attached = 0;
      for (const item of decoded) {
        const resource = resourceForFile(item.file.name);
        if (!resource) continue;
        resource.width = item.width;
        resource.height = item.height;
        const previous = state.textures.get(resource.id);
        if (previous) renderer.deleteTexture(previous);
        state.textures.set(resource.id, renderer.createTexture(item.source));
        attached++;
      }
      ui.emptyState.hidden = state.textures.size > 0;
      setStatus(`${attached} artwork texture${attached === 1 ? "" : "s"} attached locally. No artwork was uploaded.`);
      validateProject();
    } finally {
      for (const item of decoded) item.close?.();
      ui.artInput.value = "";
    }
  }

  async function openProject(file) {
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_PROJECT_BYTES) throw new Error("Project JSON is empty or exceeds the 8 MB limit.");
    const raw = JSON.parse(await file.text());
    clearTextures();
    if (raw?.schema === P.SCHEMA) {
      const inspection = P.inspectV7(raw);
      if (!inspection.ok) throw new Error(inspection.issues.join(" "));
      setProject(raw, "Opened v7 project. Reattach its artwork files to render textures.");
      ui.emptyState.hidden = false;
    } else if (/^megurig\.project\.v[2-6]$/.test(String(raw?.schema || ""))) {
      state.project = null;
      state.runtime = null;
      state.pendingLegacy = raw;
      state.selectedId = null;
      renderSceneTree();
      ui.saveProject.disabled = true;
      ui.validateProject.disabled = true;
      ui.emptyState.hidden = false;
      setStatus(`Loaded ${raw.schema}. Select Import / reattach art to complete safe v7 mesh migration.`);
    } else {
      throw new Error("Unsupported MeguRig project schema.");
    }
    ui.projectInput.value = "";
  }

  function saveProject() {
    if (!state.project) return;
    const inspection = validateProject();
    if (!inspection?.ok) {
      setStatus(`Export blocked: ${inspection?.issues?.[0] || "project is invalid"}`);
      return;
    }
    state.project.meta ||= {};
    state.project.meta.savedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "megurig-v7-project.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("Saved project data. Artwork remains separate and local.");
  }

  function updateMeshPoint() {
    const node = selectedNode();
    const point = node?.mesh?.vertices?.[Number(ui.meshVertex.value) || 0];
    if (!point) return;
    point.x = E.clamp(E.finite(ui.meshX.value, point.x), -10000, 10000);
    point.y = E.clamp(E.finite(ui.meshY.value, point.y), -10000, 10000);
  }

  function resetMesh() {
    const node = selectedNode();
    if (!node?.mesh) return;
    const resource = state.project.resources.find((item) => item.id === node.resourceId);
    if (!resource?.width || !resource?.height) return;
    const uniqueU = new Set(node.mesh.uvs.map((uv) => Number(uv.u).toFixed(6))).size;
    const uniqueV = new Set(node.mesh.uvs.map((uv) => Number(uv.v).toFixed(6))).size;
    node.mesh = B.meshForImage(resource.width, resource.height, uniqueU >= 2 ? uniqueU : 4, uniqueV >= 2 ? uniqueV : 5);
    syncSelectedControls();
    setStatus("Reset selected layer to its rectangular textured mesh.");
  }

  function updateWarpPoint() {
    const node = selectedNode();
    const point = node?.warp?.points?.[Number(ui.warpPoint.value) || 0];
    if (!point) return;
    const limit = Math.max(node.warp.bounds.width, node.warp.bounds.height) * 2;
    point.dx = E.clamp(E.finite(ui.warpDx.value, point.dx), -limit, limit);
    point.dy = E.clamp(E.finite(ui.warpDy.value, point.dy), -limit, limit);
  }

  function warpPreset(direction) {
    const node = selectedNode();
    if (!node?.warp?.points) return;
    const amount = Math.min(node.warp.bounds.width, node.warp.bounds.height) * 0.08;
    for (const point of node.warp.points) {
      const verticalCurve = 0.55 + 0.45 * (1 - Math.abs(point.v - 0.5) * 2);
      const horizontalCurve = 0.55 + 0.45 * (1 - Math.abs(point.u - 0.5) * 2);
      if (direction === "left" || direction === "right") point.dx += (direction === "left" ? -1 : 1) * amount * verticalCurve * (0.4 + point.u * 0.6);
      if (direction === "up" || direction === "down") point.dy += (direction === "up" ? -1 : 1) * amount * horizontalCurve * (0.4 + point.v * 0.6);
    }
    syncWarpPoint();
  }

  function resetWarp() {
    const node = selectedNode();
    if (!node?.warp?.points) return;
    for (const point of node.warp.points) { point.dx = 0; point.dy = 0; }
    syncWarpPoint();
    setStatus("Reset warp control offsets.");
  }

  function updatePhysics() {
    const node = selectedNode();
    if (!node || node.type !== "layer") return;
    node.physics ||= {};
    node.physics.enabled = ui.physicsEnabled.checked;
    node.physics.segments = ui.physicsEnabled.checked ? E.clamp(Math.round(Number(ui.physicsSegments.value)), 1, 8) : 0;
    node.physics.stiffness = E.clamp(Number(ui.physicsStiffness.value), 1, 60);
    node.physics.damping = E.clamp(Number(ui.physicsDamping.value) / 100, 0.5, 0.99);
    node.physics.gravity = E.finite(node.physics.gravity, 0);
    node.physics.maxAngle = E.clamp(E.finite(node.physics.maxAngle, 30), 1, 90);
    rebuildRuntime();
    syncPhysicsOutputs();
  }

  function captureKey() {
    const node = selectedNode();
    if (!node) return;
    try {
      const axes = axesFromUI();
      B.captureKey(state.project, node.id, axes, state.project.parameters);
      rebuildRuntime();
      renderTrackSummary();
      setStatus(`Captured ${axes.join(" × ")} keyform on ${node.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not capture keyform.");
    }
  }

  function deleteKey() {
    const node = selectedNode();
    if (!node) return;
    const axes = axesFromUI();
    const removed = B.removeKey(state.project, node.id, axes, state.project.parameters);
    if (removed) rebuildRuntime();
    renderTrackSummary();
    setStatus(removed ? `Deleted keyform at current ${axes.join(" × ")} value.` : "No keyform exists at the current parameter value.");
  }

  function wrapSelected(type) {
    const node = selectedNode();
    if (!node) return;
    try {
      const deformer = B.wrapNode(state.project, node.id, type);
      state.selectedId = deformer.id;
      rebuildRuntime();
      renderSceneTree();
      syncSelectedControls();
      validateProject();
      setStatus(`${type === "warp" ? "Warp" : "Rotation"} deformer created and inserted into the hierarchy.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create deformer.");
    }
  }

  function drawOverlay(frame) {
    const ctx = ui.overlay.getContext("2d");
    ctx.clearRect(0, 0, ui.overlay.width, ui.overlay.height);
    const node = selectedNode();
    if (!node || !frame) return;
    ctx.save();
    ctx.lineWidth = Math.max(1, ui.overlay.width / 900);
    ctx.strokeStyle = "rgba(255,255,255,.48)";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    if (node.type === "layer") {
      const drawable = frame.drawables.find((item) => item.nodeId === String(node.id));
      if (drawable) {
        const { vertices, triangles } = drawable.mesh;
        ctx.beginPath();
        for (let i = 0; i < triangles.length; i += 3) {
          const a = vertices[triangles[i]], b = vertices[triangles[i + 1]], c = vertices[triangles[i + 2]];
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
        }
        ctx.stroke();
        for (const point of vertices) {
          ctx.beginPath(); ctx.arc(point.x, point.y, 2.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (node.type === "warp" && frame.localForms?.get(String(node.id))?.warp) {
      const localForms = frame.localForms;
      const dynamicNodes = state.project.nodes.map((item) => ({
        id: String(item.id), parentId: item.parentId == null ? null : String(item.parentId), type: item.type,
        transform: localForms.get(String(item.id))?.transform || item.transform,
        warp: localForms.get(String(item.id))?.warp || item.warp || null,
      }));
      const map = E.buildNodeMap(dynamicNodes);
      const warp = localForms.get(String(node.id)).warp;
      const child = state.project.nodes.find((item) => String(item.parentId) === String(node.id));
      const displayId = child ? String(child.id) : String(node.id);
      const world = warp.points.map((point) => E.evaluatePoint(displayId, {
        x: warp.bounds.x + point.u * warp.bounds.width,
        y: warp.bounds.y + point.v * warp.bounds.height,
      }, map));
      const index = (x, y) => y * warp.cols + x;
      ctx.beginPath();
      for (let row = 0; row < warp.rows; row++) for (let col = 0; col < warp.cols - 1; col++) {
        const a = world[index(col, row)], b = world[index(col + 1, row)]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      for (let col = 0; col < warp.cols; col++) for (let row = 0; row < warp.rows - 1; row++) {
        const a = world[index(col, row)], b = world[index(col, row + 1)]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      world.forEach((point, pointIndex) => {
        ctx.beginPath(); ctx.arc(point.x, point.y, pointIndex === Number(ui.warpPoint.value) ? 5 : 3, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = E.clamp((now - state.lastTime) / 1000, 1 / 240, 0.05);
    state.lastTime = now;
    renderer.clear();
    if (state.runtime && state.project) {
      try {
        const evaluated = state.runtime.evaluateFrame(dt);
        state.lastFrame = evaluated;
        for (const drawable of evaluated.drawables) {
          const texture = state.textures.get(drawable.resourceId);
          if (texture) renderer.drawMesh(texture, drawable.mesh, { opacity: drawable.opacity });
        }
        drawOverlay(evaluated);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Runtime evaluation failed.");
      }
    } else {
      drawOverlay(null);
    }
    state.fpsFrames++;
    if (now - state.fpsTime >= 500) {
      ui.fps.textContent = `${Math.round(state.fpsFrames * 1000 / (now - state.fpsTime))} FPS`;
      state.fpsFrames = 0;
      state.fpsTime = now;
    }
    requestAnimationFrame(frame);
  }

  for (const input of [ui.nodeX, ui.nodeY, ui.nodeRotation, ui.nodeScaleX, ui.nodeScaleY, ui.nodeOpacity]) input.addEventListener("input", updateSelectedTransform);
  ui.drawOrder.addEventListener("input", () => { const node = selectedNode(); if (node?.type === "layer") node.drawOrder = Math.round(E.finite(ui.drawOrder.value, 0)); });
  ui.nodeVisible.addEventListener("change", () => { const node = selectedNode(); if (node?.type === "layer") node.visible = ui.nodeVisible.checked; });
  ui.meshVertex.addEventListener("change", syncMeshPoint);
  ui.meshX.addEventListener("input", updateMeshPoint);
  ui.meshY.addEventListener("input", updateMeshPoint);
  ui.resetMesh.addEventListener("click", resetMesh);
  ui.warpPoint.addEventListener("change", syncWarpPoint);
  ui.warpDx.addEventListener("input", updateWarpPoint);
  ui.warpDy.addEventListener("input", updateWarpPoint);
  ui.resetWarp.addEventListener("click", resetWarp);
  document.querySelectorAll("[data-warp-preset]").forEach((button) => button.addEventListener("click", () => warpPreset(button.dataset.warpPreset)));
  ui.wrapWarp.addEventListener("click", () => wrapSelected("warp"));
  ui.wrapRotation.addEventListener("click", () => wrapSelected("rotation"));
  ui.captureKey.addEventListener("click", captureKey);
  ui.deleteKey.addEventListener("click", deleteKey);
  ui.trackAxes.addEventListener("change", renderTrackSummary);
  ui.physicsEnabled.addEventListener("change", updatePhysics);
  for (const input of [ui.physicsSegments, ui.physicsStiffness, ui.physicsDamping]) {
    input.addEventListener("input", syncPhysicsOutputs);
    input.addEventListener("change", updatePhysics);
  }
  ui.saveProject.addEventListener("click", saveProject);
  ui.validateProject.addEventListener("click", () => {
    const result = validateProject();
    setStatus(result?.ok ? `Project v7 is structurally valid.${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}` : result?.issues?.join(" ") || "No project loaded.");
  });
  ui.artInput.addEventListener("change", () => attachArtwork(ui.artInput.files).catch((error) => setStatus(error instanceof Error ? error.message : "Artwork import failed.")));
  ui.projectInput.addEventListener("change", () => openProject(ui.projectInput.files?.[0]).catch((error) => setStatus(error instanceof Error ? error.message : "Project open failed.")));

  window.addEventListener("beforeunload", () => {
    clearTextures();
    renderer.dispose();
  });

  renderParameters();
  renderSceneTree();
  syncSelectedControls();
  requestAnimationFrame(frame);
  setStatus("v7 Lab ready. Import separated PNG/WebP artwork to create real textured meshes.");
})();
