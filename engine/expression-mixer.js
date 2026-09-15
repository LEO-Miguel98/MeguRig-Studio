"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;
  const E = ROOT.MeguEngine;
  if (!E) throw new Error("MeguEngine must be loaded before expression-mixer.js");

  const MODES = new Set(["add", "multiply", "override"]);

  function normalizeEntry(entry) {
    if (typeof entry === "number") return { mode: "override", value: entry };
    const mode = MODES.has(entry?.mode) ? entry.mode : "override";
    return { mode, value: E.finite(entry?.value, 0) };
  }

  function applyLayer(base, layer, definitions = E.STANDARD_PARAMETERS) {
    const result = { ...base };
    const weight = E.clamp(E.finite(layer?.weight, 1), 0, 1);
    const values = layer?.values && typeof layer.values === "object" ? layer.values : {};
    for (const [id, raw] of Object.entries(values)) {
      if (!definitions[id]) continue;
      const entry = normalizeEntry(raw);
      const current = E.finite(result[id], definitions[id].default);
      let next = current;
      if (entry.mode === "add") next = current + entry.value * weight;
      else if (entry.mode === "multiply") next = current * E.lerp(1, entry.value, weight);
      else next = E.lerp(current, entry.value, weight);
      result[id] = E.clamp(next, definitions[id].min, definitions[id].max);
    }
    return result;
  }

  function mix(baseState, layers = [], definitions = E.STANDARD_PARAMETERS) {
    let result = E.sanitizeParameterState(baseState, definitions);
    for (const layer of Array.isArray(layers) ? layers : []) result = applyLayer(result, layer, definitions);
    return result;
  }

  ROOT.MeguExpressionMixer = Object.freeze({ normalizeEntry, applyLayer, mix });
})();
