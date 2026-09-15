import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({ window: {}, console });
for (const file of ["core.js", "expression-mixer.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"), context, { filename: `engine/${file}` });
}

const E = context.window.MeguEngine;
const M = context.window.MeguExpressionMixer;
assert.ok(E);
assert.ok(M);

const tracked = E.sanitizeParameterState({
  ParamAngleX: 10,
  ParamAngleY: -4,
  ParamEyeLOpen: 0.8,
  ParamEyeROpen: 0.6,
  ParamMouthOpenY: 0.2,
});

const happy = {
  weight: 1,
  values: {
    ParamAngleY: { mode: "add", value: 3 },
    ParamEyeLOpen: { mode: "multiply", value: 0.5 },
    ParamEyeROpen: { mode: "multiply", value: 0.5 },
    ParamMouthOpenY: { mode: "override", value: 0.7 },
  },
};

let result = M.mix(tracked, [happy]);
assert.equal(result.ParamAngleX, 10, "unrelated tracked head X should survive expression mixing");
assert.equal(result.ParamAngleY, -1);
assert.equal(result.ParamEyeLOpen, 0.4);
assert.equal(result.ParamEyeROpen, 0.3);
assert.equal(result.ParamMouthOpenY, 0.7);

result = M.mix(tracked, [{ ...happy, weight: 0.5 }]);
assert.equal(result.ParamAngleY, -2.5);
assert.ok(Math.abs(result.ParamEyeLOpen - 0.6) < 1e-12);
assert.ok(Math.abs(result.ParamMouthOpenY - 0.45) < 1e-12);

result = M.mix(tracked, [{ values: { ParamAngleX: { mode: "add", value: 1000 } } }]);
assert.equal(result.ParamAngleX, 30, "expression output must remain clamped to parameter range");

console.log("PASS: expression mixer preserves tracking while layering expression changes");
