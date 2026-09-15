import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({ window: {}, console, structuredClone });
for (const file of ["core.js", "project-v7.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"), context, { filename: `engine/${file}` });
}

const E = context.window.MeguEngine;
const P = context.window.MeguProjectV7;
assert.ok(E);
assert.ok(P);

const grid = {
  cols: 2,
  rows: 2,
  points: [
    { u: 0, v: 0, ox: 0, oy: 0 },
    { u: 1, v: 0, ox: 10, oy: 0 },
    { u: 0, v: 1, ox: 0, oy: -10 },
    { u: 1, v: 1, ox: 0, oy: 0 },
  ],
};

const v6 = {
  schema: "megurig.project.v6",
  generatedAt: "2026-01-01T00:00:00.000Z",
  scene: { width: 1200, height: 1600 },
  layers: [
    {
      id: "face",
      name: "Face",
      fileName: "face.png",
      role: "face",
      z: 0,
      visible: true,
      transform: { x: 4, y: 5, rotation: 6, scale: 1.2, opacity: 0.8 },
      pivot: { x: 0.5, y: 0.5 },
      mesh: grid,
      keyforms: {
        ParamAngleX: [
          { value: -30, transform: { x: -5, y: 0, rotation: -3, scale: 1, opacity: 1 }, mesh: grid },
          { value: 30, transform: { x: 5, y: 0, rotation: 3, scale: 1, opacity: 1 }, mesh: grid },
        ],
      },
      physics: { enabled: true, strength: 0.5, damping: 0.8 },
    },
  ],
  parameters: {
    ParamAngleX: 12,
    ParamAngleY: -8,
    ParamBodyAngleZ: 4,
    ParamEyeOpen: 0.75,
    ParamMouthOpenY: 0.4,
  },
  expressions: {
    Happy: { headX: 2, headY: 3, bodyZ: 1, eyeOpen: 70, mouthOpen: 40 },
  },
  markers: [{ type: "Head Pivot", x: 600, y: 250 }],
};

const migrated = P.migrateV6(v6, { "face.png": { width: 100, height: 200 } });
assert.equal(migrated.schema, "megurig.project.v7");
assert.equal(migrated.nodes.length, 2);
assert.equal(migrated.resources.length, 1);
assert.equal(migrated.resources[0].width, 100);
assert.equal(migrated.resources[0].height, 200);
const face = migrated.nodes[1];
assert.equal(face.type, "layer");
assert.equal(face.parentId, "root");
assert.equal(face.mesh.vertices.length, 4);
assert.deepEqual(face.mesh.triangles, [0, 1, 3, 0, 3, 2]);
assert.equal(face.mesh.vertices[0].x, -50);
assert.equal(face.mesh.vertices[0].y, -100);
assert.equal(face.mesh.vertices[1].x, 60);
assert.equal(face.mesh.vertices[2].y, 90);
assert.equal(face.tracks.length, 1);
assert.equal(face.tracks[0].axes[0], "ParamAngleX");
assert.equal(face.tracks[0].keys.length, 2);
assert.equal(face.legacyGrid, null);
assert.equal(migrated.parameters.ParamEyeLOpen, 0.75);
assert.equal(migrated.parameters.ParamEyeROpen, 0.75);
assert.equal(migrated.parameters.ParamMouthOpenY, 0.4);
assert.equal(migrated.parameters.ParamAngleZ, 0);
assert.equal(migrated.expressions.Happy.values.ParamEyeLOpen.mode, "multiply");
assert.equal(migrated.expressions.Happy.values.ParamEyeLOpen.value, 0.7);
assert.equal(migrated.markers.length, 1);
assert.equal(P.inspectV7(migrated).ok, true);

const pending = P.migrateV6(v6);
assert.equal(pending.nodes[1].mesh, null);
assert.ok(pending.nodes[1].legacyGrid);
assert.ok(pending.meta.migrationWarnings.length >= 1);
assert.equal(P.inspectV7(pending).ok, true);
assert.ok(P.inspectV7(pending).warnings.length >= 1);

const broken = structuredClone(migrated);
broken.nodes[0].parentId = face.id;
assert.equal(P.inspectV7(broken).ok, false);
assert.match(P.inspectV7(broken).issues.join(" "), /cycle/i);

assert.throws(() => P.migrateV6({ schema: "nope", layers: [] }), /v2-v6/);

console.log("PASS: project v7 migration and validation");
