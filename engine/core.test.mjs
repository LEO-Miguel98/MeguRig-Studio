import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({
  window: {},
  globalThis: {},
  console,
  Math,
  Number,
  Object,
  Array,
  Set,
  Map,
  JSON,
  Date,
  String,
  Boolean,
  RegExp,
});

vm.runInContext(
  fs.readFileSync(new URL("./core.js", import.meta.url), "utf8"),
  context,
  { filename: "engine/core.js" },
);

const E = context.window.MeguEngine;
assert.ok(E, "MeguEngine API missing");

const state = E.sanitizeParameterState({
  ParamAngleX: 999,
  ParamAngleY: -12,
  ParamEyeLOpen: -4,
  ParamMouthOpenY: 0.6,
});
assert.equal(state.ParamAngleX, 30);
assert.equal(state.ParamAngleY, -12);
assert.equal(state.ParamEyeLOpen, 0);
assert.equal(state.ParamMouthOpenY, 0.6);
assert.equal(state.ParamBreath, 0);

const mesh = E.makeGridMesh(4, 5);
assert.equal(mesh.vertices.length, 20);
assert.equal(mesh.uvs.length, 20);
assert.equal(mesh.triangles.length, 72);
assert.equal(E.validateMesh(mesh).ok, true);
const badMesh = structuredClone(mesh);
badMesh.triangles[0] = 9999;
assert.equal(E.validateMesh(badMesh).ok, false);

const form = (x, y, rotation = 0) => ({
  transform: { x, y, rotation, scaleX: 1, scaleY: 1, opacity: 1 },
  vertices: [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }],
});

const grid2 = [
  { values: { ParamAngleX: -30, ParamAngleY: -30 }, form: form(-30, -30) },
  { values: { ParamAngleX: 30, ParamAngleY: -30 }, form: form(30, -30) },
  { values: { ParamAngleX: -30, ParamAngleY: 30 }, form: form(-30, 30) },
  { values: { ParamAngleX: 30, ParamAngleY: 30 }, form: form(30, 30) },
];
let sampled = E.sampleND(grid2, ["ParamAngleX", "ParamAngleY"], { ParamAngleX: 0, ParamAngleY: 0 });
assert.ok(Math.abs(sampled.transform.x) < 1e-9);
assert.ok(Math.abs(sampled.transform.y) < 1e-9);
assert.ok(Math.abs(sampled.vertices[0].x) < 1e-9);
assert.ok(Math.abs(sampled.vertices[0].y) < 1e-9);

const grid3 = [];
for (const x of [-1, 1]) {
  for (const y of [-1, 1]) {
    for (const z of [-1, 1]) {
      grid3.push({
        values: { X: x, Y: y, Z: z },
        form: form(x * 10, y * 20, z * 30),
      });
    }
  }
}
sampled = E.sampleND(grid3, ["X", "Y", "Z"], { X: 0.5, Y: -0.5, Z: 0.25 });
assert.ok(Math.abs(sampled.transform.x - 5) < 1e-9);
assert.ok(Math.abs(sampled.transform.y + 10) < 1e-9);
assert.ok(Math.abs(sampled.transform.rotation - 7.5) < 1e-9);

const nodes = [
  { id: "body", type: "rotation", transform: { x: 10, y: 0, rotation: 90 } },
  { id: "head", parentId: "body", type: "rotation", transform: { x: 5, y: 0 } },
  { id: "eye", parentId: "head", type: "layer", transform: { x: 2, y: 0 } },
];
const matrices = E.resolveWorldMatrices(nodes);
const eyePoint = E.applyMatrix(matrices.get("eye"), { x: 0, y: 0 });
assert.ok(Math.abs(eyePoint.x - 10) < 1e-9);
assert.ok(Math.abs(eyePoint.y - 7) < 1e-9);

const warp = E.createWarpGrid(2, 2, { x: 0, y: 0, width: 100, height: 100 });
warp.points[3].dx = 20;
warp.points[3].dy = 10;
const warped = E.warpPoint({ x: 50, y: 50 }, warp);
assert.ok(Math.abs(warped.x - 55) < 1e-9);
assert.ok(Math.abs(warped.y - 52.5) < 1e-9);

assert.throws(
  () => E.resolveWorldMatrices([
    { id: "a", parentId: "b" },
    { id: "b", parentId: "a" },
  ]),
  /cycle/i,
);

const chain = E.createSpringChain(4, { stiffness: 10, damping: 0.82, maxAngle: 30 });
let angles = [];
for (let i = 0; i < 120; i++) angles = E.stepSpringChain(chain, 20, 1 / 60);
assert.equal(angles.length, 4);
assert.ok(angles.every(Number.isFinite));
assert.ok(angles.every((angle) => Math.abs(angle) <= 30));
assert.ok(Math.abs(angles[0]) >= Math.abs(angles[3]));

console.log("PASS: engine core interpolation, hierarchy, mesh validation and spring-chain physics");
