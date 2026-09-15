import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({ window: {}, console });
for (const file of ["core.js", "tracking-filter.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"), context, { filename: `engine/${file}` });
}

const T = context.window.MeguTrackingFilter;
assert.ok(T);

const filter = new T.ChannelFilter({
  mode: "offset",
  min: -30,
  max: 30,
  sensitivity: 100,
  deadZone: 0.01,
  timeConstant: 0.05,
  lostTimeConstant: 0.1,
});
assert.equal(filter.calibrate(0.5), true);
let value = filter.update(0.505, 1 / 60, 1);
assert.equal(value, 0, "dead-zone input should settle to zero");
for (let i = 0; i < 30; i++) value = filter.update(0.7, 1 / 60, 1);
assert.ok(value > 15 && value <= 20.1, `expected responsive mapped head value, got ${value}`);
for (let i = 0; i < 60; i++) value = filter.update(NaN, 1 / 60, 0);
assert.ok(Math.abs(value) < 0.2, "lost tracking should decay toward the default value");

const bank = T.createVTuberTrackingBank();
bank.calibrate({ ParamAngleX: 0.5, ParamAngleY: 0.5, ParamAngleZ: 2, ParamEyeBallX: 0.5, ParamEyeBallY: 0.5, ParamBrowLY: 0.5, ParamBrowRY: 0.5, ParamMouthForm: 0.5 });
const frame = bank.update({
  ParamAngleX: 0.6,
  ParamAngleY: 0.45,
  ParamAngleZ: 5,
  ParamEyeLOpen: 0.2,
  ParamEyeROpen: 0.9,
  ParamEyeBallX: 0.6,
  ParamEyeBallY: 0.4,
  ParamBrowLY: 0.6,
  ParamBrowRY: 0.4,
  ParamMouthOpenY: 0.7,
  ParamMouthForm: 0.65,
}, 1 / 60, 1);
assert.ok(frame.ParamAngleX > 0);
assert.ok(frame.ParamAngleY < 0);
assert.ok(frame.ParamAngleZ > 0);
assert.equal(frame.ParamEyeLOpen, 0.2);
assert.equal(frame.ParamEyeROpen, 0.9);
assert.equal(frame.ParamMouthOpenY, 0.7);
assert.ok(frame.ParamMouthForm > 0);

console.log("PASS: calibrated per-channel tracking filters");
