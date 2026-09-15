import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({ window: {}, console });
for (const file of ["core.js", "webgl2-renderer.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"), context, { filename: `engine/${file}` });
}

const E = context.window.MeguEngine;
const R = context.window.MeguWebGL2;
assert.ok(E);
assert.ok(R);

const mesh = E.makeGridMesh(2, 2);
mesh.vertices = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: 100 },
  { x: 100, y: 100 },
];
const packed = R.packMesh(mesh, { x: 10, y: 20, rotation: 0, scaleX: 2, scaleY: 3 });
assert.deepEqual(Array.from(packed.positions), [10, 20, 210, 20, 10, 320, 210, 320]);
assert.deepEqual(Array.from(packed.uvs), [0, 0, 1, 0, 0, 1, 1, 1]);
assert.deepEqual(Array.from(packed.indices), [0, 1, 3, 0, 3, 2]);

assert.throws(
  () => R.packMesh({ vertices: [], uvs: [], triangles: [] }),
  /Mesh|vertex|Triangle/i,
);

console.log("PASS: WebGL2 renderer mesh packing");
