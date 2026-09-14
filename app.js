"use strict";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_LAYERS = 100;
const ALLOWED_FLAT = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_LAYER = new Set(["image/png", "image/webp"]);

const $ = (id) => document.getElementById(id);
const imageInput = $("imageInput");
const layerInput = $("layerInput");
const canvas = $("stage");
const ctx = canvas.getContext("2d", { alpha: true });
const dropZone = $("dropZone");
const emptyState = $("emptyState");
const status = $("status");
const markerStatus = $("markerStatus");
const modeStatus = $("modeStatus");
const layerList = $("layerList");
const layerCount = $("layerCount");
const selectedLayerName = $("selectedLayerName");

const rigControls = {
  headX: $("headX"), headY: $("headY"), bodyZ: $("bodyZ"),
  eyeOpen: $("eyeOpen"), mouthOpen: $("mouthOpen"),
};
const rigOutputs = {
  headX: $("headXOut"), headY: $("headYOut"), bodyZ: $("bodyZOut"),
  eyeOpen: $("eyeOut"), mouthOpen: $("mouthOut"),
};
const layerControls = {
  x: $("layerX"), y: $("layerY"), rotation: $("layerRotation"),
  scale: $("layerScale"), opacity: $("layerOpacity"),
};
const layerOutputs = {
  x: $("layerXOut"), y: $("layerYOut"), rotation: $("layerRotationOut"),
  scale: $("layerScaleOut"), opacity: $("layerOpacityOut"),
};
const layerButtons = {
  up: $("layerUp"), down: $("layerDown"), toggle: $("toggleLayer"),
  remove: $("deleteLayer"), pivot: $("setPivot"),
};
const exportRig = $("exportRig");
const exportSnapshot = $("exportSnapshot");

const state = {
  layers: [], selectedLayerId: null, selectedMarker: null, markers: [],
  mode: "markers", sceneWidth: 0, sceneHeight: 0, sceneRect: null,
};

function safeName(name) {
  return String(name || "layer").replace(/[^a-z0-9._ -]+/gi, "_").trim().slice(0, 100) || "layer";
}
function makeId() {
  return globalThis.crypto?.randomUUID?.() || `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function selectedLayer() {
  return state.layers.find((layer) => layer.id === state.selectedLayerId) || null;
}
function fitContain(srcW, srcH, dstW, dstH) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return { x: (dstW - width) / 2, y: (dstH - height) / 2, width, height, scale };
}
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
}
function recomputeScene() {
  state.sceneWidth = Math.max(1, ...state.layers.map((l) => l.image.naturalWidth));
  state.sceneHeight = Math.max(1, ...state.layers.map((l) => l.image.naturalHeight));
}
function sceneToCanvas(x, y) {
  const r = state.sceneRect;
  if (!r) return { x: 0, y: 0 };
  return { x: r.x + x * r.scale, y: r.y + y * r.scale };
}
function canvasToScene(x, y) {
  const r = state.sceneRect;
  if (!r) return null;
  return { x: (x - r.x) / r.scale, y: (y - r.y) / r.scale };
}
function updateRigOutputs() {
  rigOutputs.headX.textContent = rigControls.headX.value;
  rigOutputs.headY.textContent = rigControls.headY.value;
  rigOutputs.bodyZ.textContent = rigControls.bodyZ.value;
  rigOutputs.eyeOpen.textContent = `${rigControls.eyeOpen.value}%`;
  rigOutputs.mouthOpen.textContent = `${rigControls.mouthOpen.value}%`;
}
function updateLayerControls() {
  const layer = selectedLayer();
  const enabled = Boolean(layer);
  Object.values(layerControls).forEach((el) => { el.disabled = !enabled; });
  Object.values(layerButtons).forEach((el) => { el.disabled = !enabled; });
  selectedLayerName.textContent = layer ? layer.name : "No layer selected";
  if (!layer) return;
  layerControls.x.value = layer.x;
  layerControls.y.value = layer.y;
  layerControls.rotation.value = layer.rotation;
  layerControls.scale.value = Math.round(layer.scale * 100);
  layerControls.opacity.value = Math.round(layer.opacity * 100);
  layerOutputs.x.textContent = Math.round(layer.x);
  layerOutputs.y.textContent = Math.round(layer.y);
  layerOutputs.rotation.textContent = `${Math.round(layer.rotation)}°`;
  layerOutputs.scale.textContent = `${Math.round(layer.scale * 100)}%`;
  layerOutputs.opacity.textContent = `${Math.round(layer.opacity * 100)}%`;
  layerButtons.toggle.textContent = layer.visible ? "Hide" : "Show";
}
function renderLayerList() {
  layerCount.textContent = String(state.layers.length);
  layerList.replaceChildren();
  if (!state.layers.length) {
    const p = document.createElement("p"); p.className = "hint"; p.textContent = "No layers loaded."; layerList.append(p);
  } else {
    [...state.layers].reverse().forEach((layer) => {
      const row = document.createElement("div");
      row.className = `layer-row${layer.id === state.selectedLayerId ? " selected" : ""}`;
      row.dataset.layerId = layer.id;
      const vis = document.createElement("button"); vis.type = "button"; vis.textContent = layer.visible ? "◉" : "○"; vis.title = "Toggle visibility";
      vis.addEventListener("click", (event) => { event.stopPropagation(); layer.visible = !layer.visible; renderLayerList(); updateLayerControls(); render(); });
      const text = document.createElement("div");
      const name = document.createElement("div"); name.className = "layer-name"; name.textContent = layer.name;
      const meta = document.createElement("div"); meta.className = "layer-meta"; meta.textContent = `${layer.image.naturalWidth}×${layer.image.naturalHeight}`;
      text.append(name, meta);
      const tag = document.createElement("span"); tag.className = "layer-meta"; tag.textContent = layer.role || "art";
      row.append(vis, text, tag);
      row.addEventListener("click", () => { state.selectedLayerId = layer.id; state.mode = "markers"; refreshUI(); });
      layerList.append(row);
    });
  }
  updateLayerControls();
}
function drawLayer(layer) {
  if (!layer.visible) return;
  const r = state.sceneRect;
  const centerSceneX = state.sceneWidth / 2 + layer.x;
  const centerSceneY = state.sceneHeight / 2 + layer.y;
  const center = sceneToCanvas(centerSceneX, centerSceneY);
  const width = layer.image.naturalWidth * r.scale * layer.scale;
  const height = layer.image.naturalHeight * r.scale * layer.scale;
  const pivotPxX = (layer.pivotX - 0.5) * width;
  const pivotPxY = (layer.pivotY - 0.5) * height;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(center.x + pivotPxX, center.y + pivotPxY);
  ctx.rotate(layer.rotation * Math.PI / 180);
  ctx.translate(-pivotPxX, -pivotPxY);
  ctx.drawImage(layer.image, -width / 2, -height / 2, width, height);
  ctx.restore();
}
function drawMarker(marker) {
  const p = sceneToCanvas(marker.x, marker.y);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const radius = 8 * dpr;
  ctx.save();
  ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(217,119,255,.92)"; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.font = `${11 * dpr}px system-ui`; ctx.fillStyle = "#fff"; ctx.fillText(marker.type, p.x + radius + 5, p.y - radius);
  ctx.restore();
}
function drawSelectedPivot() {
  const layer = selectedLayer();
  if (!layer || !state.sceneRect) return;
  const centerX = state.sceneWidth / 2 + layer.x;
  const centerY = state.sceneHeight / 2 + layer.y;
  const localX = (layer.pivotX - 0.5) * layer.image.naturalWidth * layer.scale;
  const localY = (layer.pivotY - 0.5) * layer.image.naturalHeight * layer.scale;
  const p = sceneToCanvas(centerX + localX, centerY + localY);
  ctx.save(); ctx.strokeStyle = "#79a7ff"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x - 10, p.y); ctx.lineTo(p.x + 10, p.y); ctx.moveTo(p.x, p.y - 10); ctx.lineTo(p.x, p.y + 10); ctx.stroke(); ctx.restore();
}
function render() {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.layers.length) { state.sceneRect = null; return; }
  state.sceneRect = fitContain(state.sceneWidth, state.sceneHeight, canvas.width * 0.92, canvas.height * 0.92);
  state.sceneRect.x += canvas.width * 0.04;
  state.sceneRect.y += canvas.height * 0.04;

  const headX = Number(rigControls.headX.value);
  const headY = Number(rigControls.headY.value);
  const bodyZ = Number(rigControls.bodyZ.value);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(bodyZ * Math.PI / 1800);
  ctx.transform(1, headY / 140, headX / 140, 1, 0, 0);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  state.layers.forEach(drawLayer);
  ctx.restore();

  state.markers.forEach(drawMarker);
  drawSelectedPivot();
}
function refreshUI() {
  emptyState.hidden = state.layers.length > 0;
  exportRig.disabled = state.layers.length === 0;
  exportSnapshot.disabled = state.layers.length === 0;
  modeStatus.textContent = state.mode === "pivot" ? "Mode: set layer pivot" : "Mode: markers";
  renderLayerList(); render();
}
function fileToLayer(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({
      id: makeId(), name: safeName(file.name), fileName: safeName(file.name), image, url,
      x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, visible: true,
      pivotX: 0.5, pivotY: 0.5, role: "art",
    });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not decode ${safeName(file.name)}`)); };
    image.decoding = "async"; image.src = url;
  });
}
function validateFile(file, allowed) {
  if (!allowed.has(file.type)) return "Unsupported type";
  if (file.size > MAX_FILE_BYTES) return "File exceeds 25 MB";
  return null;
}
async function importFiles(files, { replace = false, layersOnly = false } = {}) {
  const list = [...files].slice(0, MAX_LAYERS);
  if (!list.length) return;
  const allowed = layersOnly ? ALLOWED_LAYER : ALLOWED_FLAT;
  const valid = [];
  for (const file of list) {
    const error = validateFile(file, allowed);
    if (error) { status.textContent = `${safeName(file.name)}: ${error}.`; continue; }
    valid.push(file);
  }
  if (!valid.length) return;
  try {
    const imported = await Promise.all(valid.map(fileToLayer));
    if (replace) {
      state.layers.forEach((l) => URL.revokeObjectURL(l.url));
      state.layers = [];
      state.markers = [];
    }
    state.layers.push(...imported);
    state.selectedLayerId = imported.at(-1)?.id || state.selectedLayerId;
    recomputeScene();
    status.textContent = `${state.layers.length} layer${state.layers.length === 1 ? "" : "s"} • scene ${state.sceneWidth}×${state.sceneHeight}`;
    refreshUI();
  } catch (error) { status.textContent = error instanceof Error ? error.message : "Import failed."; }
}

imageInput.addEventListener("change", () => importFiles(imageInput.files || [], { replace: true }));
layerInput.addEventListener("change", () => importFiles(layerInput.files || [], { layersOnly: true }));
["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("drag"); }));
["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("drag"); }));
dropZone.addEventListener("drop", (event) => importFiles(event.dataTransfer?.files || [], { layersOnly: false }));

document.querySelectorAll("[data-marker]").forEach((button) => button.addEventListener("click", () => {
  state.mode = "markers"; state.selectedMarker = button.dataset.marker; markerStatus.textContent = `Marker: ${state.selectedMarker}`; refreshUI();
}));
$("clearMarkers").addEventListener("click", () => { state.markers = []; render(); });
layerButtons.pivot.addEventListener("click", () => { state.mode = "pivot"; modeStatus.textContent = "Mode: set layer pivot"; });

canvas.addEventListener("click", (event) => {
  if (!state.layers.length || !state.sceneRect) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  const scene = canvasToScene(x, y);
  if (!scene) return;
  if (state.mode === "pivot") {
    const layer = selectedLayer(); if (!layer) return;
    const layerCenterX = state.sceneWidth / 2 + layer.x;
    const layerCenterY = state.sceneHeight / 2 + layer.y;
    layer.pivotX = Math.max(0, Math.min(1, 0.5 + (scene.x - layerCenterX) / (layer.image.naturalWidth * layer.scale)));
    layer.pivotY = Math.max(0, Math.min(1, 0.5 + (scene.y - layerCenterY) / (layer.image.naturalHeight * layer.scale)));
    state.mode = "markers"; refreshUI(); return;
  }
  if (!state.selectedMarker) return;
  const marker = { type: state.selectedMarker, x: scene.x, y: scene.y };
  const index = state.markers.findIndex((m) => m.type === marker.type);
  if (index >= 0) state.markers[index] = marker; else state.markers.push(marker);
  render();
});

Object.entries(layerControls).forEach(([key, control]) => control.addEventListener("input", () => {
  const layer = selectedLayer(); if (!layer) return;
  if (key === "scale" || key === "opacity") layer[key] = Number(control.value) / 100; else layer[key] = Number(control.value);
  updateLayerControls(); render();
}));
Object.values(rigControls).forEach((control) => control.addEventListener("input", () => { updateRigOutputs(); render(); }));

layerButtons.up.addEventListener("click", () => {
  const i = state.layers.findIndex((l) => l.id === state.selectedLayerId); if (i < 0 || i === state.layers.length - 1) return;
  [state.layers[i], state.layers[i + 1]] = [state.layers[i + 1], state.layers[i]]; refreshUI();
});
layerButtons.down.addEventListener("click", () => {
  const i = state.layers.findIndex((l) => l.id === state.selectedLayerId); if (i <= 0) return;
  [state.layers[i], state.layers[i - 1]] = [state.layers[i - 1], state.layers[i]]; refreshUI();
});
layerButtons.toggle.addEventListener("click", () => { const layer = selectedLayer(); if (!layer) return; layer.visible = !layer.visible; refreshUI(); });
layerButtons.remove.addEventListener("click", () => {
  const i = state.layers.findIndex((l) => l.id === state.selectedLayerId); if (i < 0) return;
  URL.revokeObjectURL(state.layers[i].url); state.layers.splice(i, 1);
  state.selectedLayerId = state.layers.at(-1)?.id || null; recomputeScene(); refreshUI();
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
exportRig.addEventListener("click", () => {
  if (!state.layers.length) return;
  const project = {
    schema: "megurig.project.v2", generatedAt: new Date().toISOString(),
    scene: { width: state.sceneWidth, height: state.sceneHeight },
    layers: state.layers.map((l, drawOrder) => ({
      id: l.id, fileName: l.fileName, role: l.role, drawOrder, visible: l.visible,
      transform: { x: l.x, y: l.y, rotation: l.rotation, scale: l.scale, opacity: l.opacity },
      pivot: { x: Number(l.pivotX.toFixed(6)), y: Number(l.pivotY.toFixed(6)) },
      source: { width: l.image.naturalWidth, height: l.image.naturalHeight },
    })),
    markers: state.markers.map((m) => ({ type: m.type, xNormalized: Number((m.x / state.sceneWidth).toFixed(6)), yNormalized: Number((m.y / state.sceneHeight).toFixed(6)) })),
    parameters: {
      ParamAngleX: Number(rigControls.headX.value), ParamAngleY: Number(rigControls.headY.value),
      ParamBodyAngleZ: Number(rigControls.bodyZ.value), ParamEyeOpen: Number(rigControls.eyeOpen.value) / 100,
      ParamMouthOpenY: Number(rigControls.mouthOpen.value) / 100,
    },
    note: "Project references local source filenames; image bytes are intentionally not embedded.",
  };
  downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), "MeguRig-project.json");
});
exportSnapshot.addEventListener("click", () => { if (!state.layers.length) return; canvas.toBlob((blob) => blob && downloadBlob(blob, "MeguRig-preview.png"), "image/png"); });
window.addEventListener("resize", render);
window.addEventListener("beforeunload", () => state.layers.forEach((l) => URL.revokeObjectURL(l.url)));

updateRigOutputs(); updateLayerControls(); render();
