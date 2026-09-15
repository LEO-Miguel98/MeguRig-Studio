import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({ window: {}, console, structuredClone });
for (const file of ["core.js", "project-v7.js", "expression-mixer.js", "editor-bridge.js", "runtime.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"), context, { filename: `engine/${file}` });
}

const E = context.window.MeguEngine;
const P = context.window.MeguProjectV7;
const B = context.window.MeguEditorBridge;
const R = context.window.MeguRuntime;
assert.ok(E && P && B && R);

const project = B.createProjectFromImages([
  { fileName: "face.png", name: "Face", width: 100, height: 200, role: "face" },
], { width: 800, height: 600 });

assert.equal(project.schema, "megurig.project.v7");
assert.equal(project.resources.length, 1);
assert.equal(project.nodes.length, 2);
const face = project.nodes[1];
assert.equal(face.mesh.vertices.length, 20);
assert.equal(face.mesh.uvs.length, 20);
assert.equal(E.validateMesh(face.mesh).ok, true);
assert.equal(face.transform.x, 400);
assert.equal(face.transform.y, 300);

const warp = B.wrapNode(project, face.id, "warp", { cols: 3, rows: 3 });
assert.equal(face.parentId, warp.id);
assert.equal(warp.warp.points.length, 9);
assert.equal(P.inspectV7(project).ok, true);

project.parameters.ParamAngleX = -30;
warp.warp.points[0].dx = -20;
warp.warp.points[0].dy = -10;
B.captureKey(project, warp.id, ["ParamAngleX"], project.parameters);

project.parameters.ParamAngleX = 30;
warp.warp.points[0].dx = 20;
warp.warp.points[0].dy = 10;
B.captureKey(project, warp.id, ["ParamAngleX"], project.parameters);

// Reset the authored base; keyforms must drive the warp at runtime.
warp.warp.points[0].dx = 0;
warp.warp.points[0].dy = 0;

const runtime = new R.Runtime(project);
runtime.setParameters({ ParamAngleX: 0 });
const middle = runtime.evaluateFrame(1 / 60);
const middleWarp = middle.localForms.get(warp.id).warp;
assert.ok(Math.abs(middleWarp.points[0].dx) < 1e-8);
assert.ok(Math.abs(middleWarp.points[0].dy) < 1e-8);

runtime.setParameters({ ParamAngleX: 30 });
const right = runtime.evaluateFrame(1 / 60);
const rightWarp = right.localForms.get(warp.id).warp;
assert.ok(Math.abs(rightWarp.points[0].dx - 20) < 1e-8);
assert.ok(Math.abs(rightWarp.points[0].dy - 10) < 1e-8);
assert.equal(right.drawables.length, 1);
assert.ok(right.drawables[0].mesh.vertices[0].x > middle.drawables[0].mesh.vertices[0].x);

assert.throws(() => B.reparentNode(project, warp.id, face.id), /cycle/i);
assert.equal(B.removeKey(project, warp.id, ["ParamAngleX"], { ParamAngleX: 30 }), true);
assert.equal(warp.tracks[0].keys.length, 1);

console.log("PASS: v7 editor bridge creates textured meshes, hierarchy and parameter-driven warp deformers");
