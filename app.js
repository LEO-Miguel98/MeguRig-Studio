"use strict";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const input = document.getElementById("imageInput");
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: true });
const dropZone = document.getElementById("dropZone");
const emptyState = document.getElementById("emptyState");
const status = document.getElementById("status");
const markerStatus = document.getElementById("markerStatus");
const clearMarkers = document.getElementById("clearMarkers");
const exportRig = document.getElementById("exportRig");
const exportSnapshot = document.getElementById("exportSnapshot");

const controls = {
  headX: document.getElementById("headX"),
  headY: document.getElementById("headY"),
  bodyZ: document.getElementById("bodyZ"),
  eyeOpen: document.getElementById("eyeOpen"),
  mouthOpen: document.getElementById("mouthOpen"),
};

const outputs = {
  headX: document.getElementById("headXOut"),
  headY: document.getElementById("headYOut"),
  bodyZ: document.getElementById("bodyZOut"),
  eyeOpen: document.getElementById("eyeOut"),
  mouthOpen: document.getElementById("mouthOut"),
};

const state = {
  image: null,
  fileName: null,
  objectUrl: null,
  selectedMarker: null,
  markers: [],
  imageRect: null,
};

function sanitizeFileName(name) {
  return String(name || "model")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "model";
}

function updateOutputs() {
  outputs.headX.textContent = controls.headX.value;
  outputs.headY.textContent = controls.headY.value;
  outputs.bodyZ.textContent = controls.bodyZ.value;
  outputs.eyeOpen.textContent = `${controls.eyeOpen.value}%`;
  outputs.mouthOpen.textContent = `${controls.mouthOpen.value}%`;
}

function fitContain(srcW, srcH, dstW, dstH) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return {
    x: (dstW - width) / 2,
    y: (dstH - height) / 2,
    width,
    height,
    scale,
  };
}

function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawMarker(marker) {
  const r = 9 * (window.devicePixelRatio || 1);
  ctx.save();
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(217,119,255,.9)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.stroke();
  ctx.font = `${12 * (window.devicePixelRatio || 1)}px system-ui`;
  ctx.fillStyle = "white";
  ctx.fillText(marker.type, marker.x + r + 6, marker.y - r - 2);
  ctx.restore();
}

function render() {
  resizeCanvasToDisplaySize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.image) return;

  const imageRect = fitContain(
    state.image.naturalWidth,
    state.image.naturalHeight,
    canvas.width,
    canvas.height
  );
  state.imageRect = imageRect;

  const headX = Number(controls.headX.value);
  const headY = Number(controls.headY.value);
  const bodyZ = Number(controls.bodyZ.value);
  const eyeOpen = Number(controls.eyeOpen.value) / 100;
  const mouthOpen = Number(controls.mouthOpen.value) / 100;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((bodyZ * Math.PI) / 1800);
  ctx.transform(1, headY / 120, headX / 120, 1, 0, 0);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.globalAlpha = 0.98;
  ctx.drawImage(
    state.image,
    imageRect.x,
    imageRect.y,
    imageRect.width,
    imageRect.height
  );
  ctx.restore();

  ctx.save();
  ctx.fillStyle = `rgba(10,10,16,${(1 - eyeOpen) * 0.08})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (mouthOpen > 0) {
    ctx.fillStyle = `rgba(217,119,255,${mouthOpen * 0.07})`;
    ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);
  }
  ctx.restore();

  state.markers.forEach(drawMarker);
}

function resetObjectUrl() {
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = null;
}

function loadFile(file) {
  if (!file) return;
  if (!ALLOWED_TYPES.has(file.type)) {
    status.textContent = "Unsupported file. Use PNG, JPG, or WebP.";
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    status.textContent = "File is too large. Maximum is 25 MB.";
    return;
  }

  resetObjectUrl();
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    state.image = img;
    state.fileName = sanitizeFileName(file.name);
    state.objectUrl = url;
    state.markers = [];
    emptyState.hidden = true;
    exportRig.disabled = false;
    exportSnapshot.disabled = false;
    status.textContent = `${state.fileName} • ${img.naturalWidth}×${img.naturalHeight}`;
    render();
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    status.textContent = "Could not decode that image.";
  };

  img.decoding = "async";
  img.src = url;
}

input.addEventListener("change", () => loadFile(input.files?.[0]));

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag");
  });
});

dropZone.addEventListener("drop", (event) => loadFile(event.dataTransfer?.files?.[0]));

document.querySelectorAll("[data-marker]").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedMarker = button.dataset.marker;
    markerStatus.textContent = `Marker: ${state.selectedMarker}`;
  });
});

canvas.addEventListener("click", (event) => {
  if (!state.image || !state.selectedMarker) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const sameType = state.markers.findIndex((m) => m.type === state.selectedMarker);
  const marker = { type: state.selectedMarker, x, y };
  if (sameType >= 0) state.markers[sameType] = marker;
  else state.markers.push(marker);
  render();
});

clearMarkers.addEventListener("click", () => {
  state.markers = [];
  render();
});

Object.values(controls).forEach((control) => {
  control.addEventListener("input", () => {
    updateOutputs();
    render();
  });
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

exportRig.addEventListener("click", () => {
  if (!state.image) return;
  const rect = state.imageRect;
  const markers = state.markers.map((marker) => ({
    type: marker.type,
    xNormalized: rect ? Number(((marker.x - rect.x) / rect.width).toFixed(6)) : 0,
    yNormalized: rect ? Number(((marker.y - rect.y) / rect.height).toFixed(6)) : 0,
  }));

  const payload = {
    schema: "megurig.rigprep.v1",
    source: {
      fileName: state.fileName,
      width: state.image.naturalWidth,
      height: state.image.naturalHeight,
    },
    parameters: {
      ParamAngleX: Number(controls.headX.value),
      ParamAngleY: Number(controls.headY.value),
      ParamBodyAngleZ: Number(controls.bodyZ.value),
      ParamEyeOpen: Number(controls.eyeOpen.value) / 100,
      ParamMouthOpenY: Number(controls.mouthOpen.value) / 100,
    },
    markers,
    generatedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(payload, null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), `${state.fileName}.rig.json`);
});

exportSnapshot.addEventListener("click", () => {
  if (!state.image) return;
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${state.fileName}.preview.png`);
  }, "image/png");
});

window.addEventListener("resize", render);
window.addEventListener("beforeunload", resetObjectUrl);

updateOutputs();
render();
