import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({ window: {}, console, structuredClone });
for (const file of ["core.js", "project-v7.js", "expression-mixer.js", "runtime.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"), context, { filename: `engine/${file}` });
}

const E = context.window.MeguEngine;
const R = context.window.MeguRuntime;
assert.ok(E);
assert.ok(R);

const mesh = {
  vertices: [
    { x: -50, y: -50 },
    { x: 50, y: -50 },
    { x: -50, y: 50 },
    { x: 50, y: 50 },
  ],
  uvs: [
    { u: 0, v: 0 },
    { u: 1, v: 0 },
    { u: 0, v: 1 },
    { u: 1, v: 1 },
  ],
  triangles: [0, 1, 3, 0, 3, 2],
};

// v7 keyform transforms are absolute authoring states, matching the v6 keyform semantics.
// Vertex forms are likewise absolute local mesh states.
const corner = (x, y, dx, dy) => ({
  values: { ParamAngleX: x, ParamAngleY: y },
  form: {
    transform: { x: 100 + dx, y: 200 + dy, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
    vertices: mesh.vertices.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  },
});

const project = {
  schema: "megurig.project.v7",
  meta: {},
  canvas: { width: 1200, height: 1200 },
  resources: [{ id: "tex-face", type: "image", fileName: "face.png", width: 100, height: 100 }],
  nodes: [
    { id: "root", type: "group", parentId: null, name: "Root", transform: { x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 } },
    {
      id: "face",
      type: "layer",
      parentId: "root",
      name: "Face",
      resourceId: "tex-face",
      drawOrder: 10,
      visible: true,
      transform: { x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
      mesh,
      tracks: [{
        axes: ["ParamAngleX", "ParamAngleY"],
        blendMode: "interpolate",
        keys: [
          corner(-30, -30, -15, -10),
          corner(30, -30, 15, -10),
          corner(-30, 30, -15, 10),
          corner(30, 30, 15, 10),
        ],
      }],
      physics: { enabled: false, segments: 0 },
      clipIds: [],
    },
  ],
  parameters: E.sanitizeParameterState({ ParamAngleX: 0, ParamAngleY: 0, ParamEyeLOpen: 0.8, ParamEyeROpen: 0.8 }),
  expressions: {},
  markers: [],
};

const runtime = new R.Runtime(project);
runtime.setParameters({ ParamAngleX: 30, ParamAngleY: 30 });
runtime.setExpressionLayers([{ weight: 1, values: { ParamEyeLOpen: { mode: "multiply", value: 0.5 }, ParamAngleY: { mode: "add", value: -15 } } }]);
const frame = runtime.evaluateFrame(1 / 60);
assert.equal(frame.parameters.ParamAngleX, 30);
assert.equal(frame.parameters.ParamAngleY, 15);
assert.equal(frame.parameters.ParamEyeLOpen, 0.4);
assert.equal(frame.drawables.length, 1);
const face = frame.drawables[0];
assert.equal(face.nodeId, "face");
assert.equal(face.mesh.vertices.length, 4);
// At X=30,Y=15 the correlated 2D track resolves dx=15,dy=5.
// The deformed local point (-35,-45), layer (+115,+205) and root (+10,+20)
// compose to (90,180).
assert.ok(Math.abs(face.mesh.vertices[0].x - 90) < 1e-8, `unexpected x ${face.mesh.vertices[0].x}`);
assert.ok(Math.abs(face.mesh.vertices[0].y - 180) < 1e-8, `unexpected y ${face.mesh.vertices[0].y}`);
assert.equal(E.validateMesh(face.mesh).ok, true);

const physicsProject = structuredClone(project);
physicsProject.nodes[1].tracks = [];
physicsProject.nodes[1].physics = { enabled: true, segments: 3, stiffness: 10, damping: 0.82, maxAngle: 25 };
const physicsRuntime = new R.Runtime(physicsProject);
physicsRuntime.setParameters({ ParamAngleX: 20 });
const first = physicsRuntime.evaluateFrame(1 / 60).drawables[0].mesh.vertices[0];
let later;
for (let i = 0; i < 60; i++) later = physicsRuntime.evaluateFrame(1 / 60).drawables[0].mesh.vertices[0];
assert.ok(Number.isFinite(later.x) && Number.isFinite(later.y));
assert.ok(Math.abs(later.x - first.x) + Math.abs(later.y - first.y) > 0.01, "physics should evolve over time");

console.log("PASS: project v7 runtime evaluates correlated keyforms, expressions, hierarchy and physics");
