"use strict";

(() => {
  const ROOT = typeof window !== "undefined" ? window : globalThis;
  const E = ROOT.MeguEngine;
  if (!E) throw new Error("MeguEngine must be loaded before tracking-filter.js");

  class ChannelFilter {
    constructor(options = {}) {
      this.mode = options.mode === "absolute" ? "absolute" : "offset";
      this.min = E.finite(options.min, -1);
      this.max = E.finite(options.max, 1);
      if (this.max < this.min) [this.min, this.max] = [this.max, this.min];
      this.defaultValue = E.clamp(E.finite(options.defaultValue, this.mode === "absolute" ? this.max : 0), this.min, this.max);
      this.sensitivity = E.finite(options.sensitivity, 1);
      // Offset-channel dead zones are expressed in the raw calibrated input space.
      // Applying them before sensitivity makes tuning independent from output scaling.
      this.deadZone = Math.max(0, E.finite(options.deadZone, 0));
      this.timeConstant = E.clamp(E.finite(options.timeConstant, 0.08), 0.001, 5);
      this.lostTimeConstant = E.clamp(E.finite(options.lostTimeConstant, 0.25), 0.001, 10);
      this.minConfidence = E.clamp(E.finite(options.minConfidence, 0.5), 0, 1);
      this.neutral = E.finite(options.neutral, 0);
      this.value = this.defaultValue;
      this.initialized = false;
    }

    calibrate(raw) {
      const value = Number(raw);
      if (!Number.isFinite(value)) return false;
      this.neutral = value;
      return true;
    }

    target(raw) {
      let value = E.finite(raw, this.mode === "absolute" ? this.defaultValue : this.neutral);
      if (this.mode === "offset") {
        value -= this.neutral;
        if (Math.abs(value) < this.deadZone) value = 0;
        else value *= this.sensitivity;
      } else {
        value *= this.sensitivity;
      }
      return E.clamp(value, this.min, this.max);
    }

    update(raw, dt = 1 / 60, confidence = 1) {
      dt = E.clamp(E.finite(dt, 1 / 60), 1 / 1000, 0.25);
      const valid = Number.isFinite(Number(raw)) && E.finite(confidence, 0) >= this.minConfidence;
      const target = valid ? this.target(raw) : this.defaultValue;
      const tau = valid ? this.timeConstant : this.lostTimeConstant;
      const alpha = 1 - Math.exp(-dt / tau);
      if (!this.initialized) {
        this.value = target;
        this.initialized = true;
      } else {
        this.value += (target - this.value) * alpha;
      }
      this.value = E.clamp(this.value, this.min, this.max);
      return this.value;
    }

    reset(value = this.defaultValue) {
      this.value = E.clamp(E.finite(value, this.defaultValue), this.min, this.max);
      this.initialized = false;
    }
  }

  class TrackingBank {
    constructor(config = {}) {
      this.channels = new Map();
      for (const [id, options] of Object.entries(config)) this.channels.set(id, new ChannelFilter(options));
    }

    calibrate(sample = {}) {
      const result = Object.create(null);
      for (const [id, filter] of this.channels) result[id] = filter.calibrate(sample[id]);
      return result;
    }

    update(sample = {}, dt = 1 / 60, confidence = {}) {
      const out = Object.create(null);
      for (const [id, filter] of this.channels) {
        const channelConfidence = typeof confidence === "number" ? confidence : confidence?.[id] ?? 1;
        out[id] = filter.update(sample?.[id], dt, channelConfidence);
      }
      return out;
    }

    reset() {
      for (const filter of this.channels.values()) filter.reset();
    }
  }

  function createVTuberTrackingBank() {
    return new TrackingBank({
      ParamAngleX: { mode: "offset", min: -30, max: 30, sensitivity: 90, deadZone: 0.012, timeConstant: 0.07, lostTimeConstant: 0.3 },
      ParamAngleY: { mode: "offset", min: -30, max: 30, sensitivity: 90, deadZone: 0.012, timeConstant: 0.07, lostTimeConstant: 0.3 },
      ParamAngleZ: { mode: "offset", min: -30, max: 30, sensitivity: 1, deadZone: 0.8, timeConstant: 0.055, lostTimeConstant: 0.3 },
      ParamEyeLOpen: { mode: "absolute", min: 0, max: 1, defaultValue: 1, sensitivity: 1, timeConstant: 0.025, lostTimeConstant: 0.15 },
      ParamEyeROpen: { mode: "absolute", min: 0, max: 1, defaultValue: 1, sensitivity: 1, timeConstant: 0.025, lostTimeConstant: 0.15 },
      ParamEyeBallX: { mode: "offset", min: -1, max: 1, sensitivity: 2.2, deadZone: 0.02, timeConstant: 0.04, lostTimeConstant: 0.2 },
      ParamEyeBallY: { mode: "offset", min: -1, max: 1, sensitivity: 2.2, deadZone: 0.02, timeConstant: 0.04, lostTimeConstant: 0.2 },
      ParamBrowLY: { mode: "offset", min: -1, max: 1, sensitivity: 2, deadZone: 0.02, timeConstant: 0.05, lostTimeConstant: 0.2 },
      ParamBrowRY: { mode: "offset", min: -1, max: 1, sensitivity: 2, deadZone: 0.02, timeConstant: 0.05, lostTimeConstant: 0.2 },
      ParamMouthOpenY: { mode: "absolute", min: 0, max: 1, defaultValue: 0, sensitivity: 1, timeConstant: 0.035, lostTimeConstant: 0.15 },
      ParamMouthForm: { mode: "offset", min: -1, max: 1, sensitivity: 2, deadZone: 0.02, timeConstant: 0.05, lostTimeConstant: 0.2 },
    });
  }

  ROOT.MeguTrackingFilter = Object.freeze({ ChannelFilter, TrackingBank, createVTuberTrackingBank });
})();
