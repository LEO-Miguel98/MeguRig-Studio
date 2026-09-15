# MeguRig Studio — VTuber Rigging & Animation Engine Architecture

Status: research-backed architecture for the post-v6 engine.

This document deliberately separates **concept learning** from implementation. MeguRig is not trying to copy proprietary Cubism code or file formats. The goal is to reproduce the general engineering principles behind high-quality 2D character deformation with an original browser implementation.

## Research basis

Primary references reviewed for this architecture:

- Live2D Cubism Editor Manual — About Deformers: https://docs.live2d.com/en/cubism-editor-manual/deformer/
- Live2D Cubism Editor Manual — Warp Deformer: https://docs.live2d.com/en/cubism-editor-manual/making-and-placement-of-warp-deformer/
- Live2D Cubism Editor Manual — Rotation Deformer: https://docs.live2d.com/en/cubism-editor-manual/making-and-rotation-of-rotationdeformer/
- Live2D Cubism Editor Manual — Parameters: https://docs.live2d.com/en/cubism-editor-manual/parameter/
- Live2D Cubism Editor Manual — Keyforms: https://docs.live2d.com/en/cubism-editor-manual/edit-parameters/
- Live2D Cubism Editor Manual — Automatic Mesh Generator: https://docs.live2d.com/en/cubism-editor-manual/mesh-edit/
- Live2D Cubism Editor Manual — Draw Order: https://docs.live2d.com/en/cubism-editor-manual/draworder/
- Live2D Cubism Editor Manual — Clipping Mask: https://docs.live2d.com/en/cubism-editor-manual/clipping-mask/
- Live2D Cubism Editor Manual — PSD Import: https://docs.live2d.com/en/cubism-editor-manual/psd-import/
- Live2D Cubism Editor Manual — Physics: https://docs.live2d.com/en/cubism-editor-manual/physics-operation/
- Live2D Cubism Editor Manual — Eye Blinking: https://docs.live2d.com/en/cubism-editor-manual/eye-blink-settings/
- Google MediaPipe Face Landmarker for Web: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- MDN — WebGL2RenderingContext: https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext
- MDN — WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MDN — CanvasRenderingContext2D: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D

The official Cubism documentation is useful as a behavioral reference because it clearly separates ArtMeshes, warp deformers, rotation deformers, parameters, keyforms, draw order, clipping, and physics. Those ideas are general enough to inform an original implementation.

---

## 1. How professional 2D VTuber rigs actually work

A professional 2D VTuber model is not a flat image that is rotated around the screen. It is a hierarchy of textured pieces. Each visible piece has geometry, texture coordinates, drawing order, optional masks, and one or more deformation states.

A useful mental model is:

```text
Model
├─ Parameters
├─ Textures
├─ Scene graph
│  ├─ Warp deformers
│  ├─ Rotation deformers
│  └─ Art meshes / drawable layers
├─ Keyforms
├─ Physics groups
├─ Expressions
└─ Tracking mappings
```

The original art is split into overlapping parts. Hidden portions must usually be painted behind neighboring pieces so that turning or bending does not reveal transparent holes. Eyes, irises, eyelids, mouth components, hair strands, sleeves, apron, skirt panels, ribbons, accessories and limbs need separate artwork when they are expected to move independently.

Each visible art piece is mapped onto a triangle mesh. The mesh stores vertex positions and UV coordinates. The renderer draws the source texture through the mesh triangles. Deformation changes vertex positions while UVs remain attached to the artwork.

Deformers sit above meshes in a hierarchy. A rotation deformer is appropriate for rigid-ish joint motion. A warp deformer changes the shape of an area and passes that deformation to its descendants. Parent movement propagates to children.

Parameters store motion dimensions. Keyforms store object/deformer shapes at selected parameter values. During playback, the engine interpolates between keyforms. Multiple parameters must be resolved together; the current authoring selection must not determine what the renderer evaluates.

Physics operates after tracked/animated parameter input and adds delayed secondary motion to dedicated output parameters or deformers.

---

## 2. What MeguRig v6 already gets right

MeguRig v6 has useful foundations that should be preserved during the rewrite:

- local artwork import and browser-side processing;
- explicit layer roles and ordering;
- per-layer pivots;
- editable regular-grid meshes;
- captured keyforms;
- simultaneous additive parameter evaluation through `blend.js`;
- save/reopen project data;
- user-triggered webcam access with audio disabled;
- conservative Auto Rig assistance;
- structural validation and security limits;
- object URL cleanup and input size limits;
- dependency-free CI/security checks;
- a clear distinction between a Cubism handoff manifest and a compiled `.moc3`.

The current `mesh.js` also demonstrates the correct basic concept of textured triangle deformation: the source image is split into triangles and each triangle is transformed into a deformed destination triangle. That is a legitimate prototype of ArtMesh-style texture warping.

---

## 3. What MeguRig v6 gets wrong or oversimplifies

### Flat layer model

The current runtime is primarily a list of layers. It does not yet have a true scene graph with nested deformers. A professional rig needs parent-child propagation so that body, neck, head, facial parts, hair and accessories inherit motion correctly.

### Regular grids only

The current mesh is a regular rectangular grid with implicit triangles. This is acceptable for early prototyping but insufficient for detailed faces, eyelids, mouths, irregular hair silhouettes and clothing edges. The next mesh format needs explicit vertices, UVs and triangle indices.

### Additive-only multidimensional blending

`blend.js` combines independent per-parameter deltas. This is much better than the previous single-parameter renderer, but professional head turns need correlated forms. The correct face shape at Head X=20 and Head Y=-15 is not always equal to `X delta + Y delta`.

The new engine therefore needs multidimensional keyform grids with bilinear/trilinear interpolation for correlated parameters, while still supporting additive layers where additive behavior is desirable.

### Simplified physics

The current physics is one spring angle per layer. Hair and ribbons should usually use multi-stage chains where the root follows quickly and downstream segments lag with increasing delay.

### Simplified facial controls

The current main model has one shared eye-open parameter and a very small mouth control set. High-quality rigs need independent left/right eyelids, eyeball X/Y, eyebrow position/form, MouthOpen, MouthForm and often mouth horizontal offset.

### Tracking capability

The current native `FaceDetector` path is deliberately lightweight but does not provide the rich, consistent landmark/blendshape set needed for a serious VTuber. A future local tracker should use a face-landmark model such as MediaPipe Face Landmarker, preferably self-hosted and executed in a Worker so inference does not block the UI thread.

### Canvas2D renderer ceiling

The triangle-clipping Canvas2D renderer proves the deformation concept, but it performs a save/clip/setTransform/drawImage sequence per triangle. That becomes expensive as mesh counts and model complexity grow.

---

## 4. What is missing

The next-generation engine needs these first-class systems:

1. explicit texture resources;
2. explicit triangle meshes with UV coordinates;
3. a scene/deformer graph;
4. rotation deformers;
5. warp deformers;
6. parameter definitions with min/default/max values;
7. one-dimensional and multidimensional keyform sets;
8. independent facial parameters;
9. clipping masks;
10. parameter-driven draw order;
11. multi-stage physics chains;
12. expression layers that mix with tracking instead of replacing it;
13. tracking mappings/calibration profiles;
14. WebGL2 rendering;
15. versioned project migration and strict validation.

---

## 5. Why the procedural maid looked nothing like the reference

The failure was architectural, not just artistic.

The reference character uses specific line art, facial proportions, hair silhouette, clothing folds, lace, accessories, material shading and small asymmetric details. The procedural prototype attempted to approximate those with Canvas primitives. That throws away almost all of the visual information that makes the character recognizable.

The correct pipeline is:

```text
actual separated artwork
→ texture resources
→ ArtMeshes
→ deformers
→ parameters/keyforms
→ physics
→ tracking
→ renderer
```

The final character should never be reconstructed from circles, ellipses and generic vector paths when exact visual fidelity is expected.

---

## 6. Architecture for real artwork-based models

Recommended module boundaries:

```text
engine/
  core.js                parameter, interpolation, matrices, validation helpers
  model.js               model / texture / layer / mesh resource graph
  deformers.js           warp + rotation deformer evaluation
  keyforms.js            1D / 2D / 3D keyform sampling
  physics.js             multi-stage secondary motion
  expressions.js         layered parameter overrides
  tracking.js            tracker-neutral mapping API
  webgl2-renderer.js     production textured mesh renderer
  serializer.js          project v7 migration and persistence
  validator.js           structural and safety validation
```

The UI should edit the model through an engine API rather than directly mutating DOM-linked layer objects.

A model node should be addressable by stable ID. Parent relationships must be validated for missing references and cycles.

---

## 7. Mesh deformation design

The v7 mesh format should be explicit:

```json
{
  "vertices": [{"x":0,"y":0}],
  "uvs": [{"u":0,"v":0}],
  "triangles": [0,1,2]
}
```

This supports irregular topology and GPU rendering directly.

Mesh authoring should provide:

- regular-grid generation as a starting point;
- manual point insertion/deletion;
- triangle edge editing;
- topology validation;
- density presets by role;
- brush/soft-selection deformation later;
- local coordinates independent of screen/canvas resolution.

Face, mouth and eyelids need denser topology near contours that bend. Large flat skirt regions can use less density. Hair strands should concentrate points around bending areas and roots.

---

## 8. Head XYZ design

Head motion should be driven by deformers and facial mesh forms, not only rigid transform values.

### Head X

Head X should change:

- face/jaw contour;
- nose position;
- eye horizontal placement;
- near/far eye apparent width;
- mouth placement;
- ear placement;
- front hair silhouette;
- side hair overlap;
- neck alignment.

### Head Y

Head Y should change:

- jaw/cheek contour;
- eye/nose/mouth vertical spacing;
- visible forehead amount;
- chin amount;
- hair-to-face overlap;
- neck attachment.

### Head Z

Head Z is primarily a rotational dimension, but physics should react after it changes.

### Correlated keyforms

For face/head, use a 2D or 3D keyform set when necessary:

```text
Head X × Head Y
or
Head X × Head Y × Head Z
```

Bilinear/trilinear interpolation across corner forms is more appropriate than always adding independent deltas. Additive blending remains useful for secondary parameters such as breath or small expression offsets.

---

## 9. Facial rigging design

Recommended baseline facial parameters:

- `ParamEyeLOpen`
- `ParamEyeROpen`
- `ParamEyeBallX`
- `ParamEyeBallY`
- `ParamBrowLY`
- `ParamBrowRY`
- `ParamBrowLForm`
- `ParamBrowRForm`
- `ParamMouthOpenY`
- `ParamMouthForm`
- `ParamMouthX`

Blinking should deform eyelid meshes around the eyeball. It should not scale the whole eye texture vertically.

The iris/pupil should move inside an eye-white clipping mask.

Mouth form and mouth open should be evaluated together. A smile-open mouth and neutral-open mouth need different corner shapes. The mouth should therefore support a 2D keyform grid (`MouthForm × MouthOpenY`). Optional phoneme presets can map on top of these parameters rather than requiring entirely separate mouth images.

Expressions should be parameter layers with explicit blend modes:

- additive offset;
- multiplicative weight (useful for blink/open values);
- absolute override only when intentionally requested;
- visual overlay visibility/opacity.

Tracking remains the base signal; expressions should modify it rather than destroying it.

---

## 10. Physics design

The engine should treat physics as groups with inputs, a physical model and outputs.

Recommended model:

```text
tracked parameters
→ normalized physics inputs
→ multi-stage spring/pendulum chain
→ output parameters/deformer offsets
```

Each chain needs:

- stiffness;
- damping;
- gravity/bias;
- mass or equivalent response control;
- input influence;
- output influence;
- maximum angle/displacement;
- multiple segments.

Hair roots should usually respond more quickly than tips. Headdress ribbons, back bow tails, charms, sleeves, apron tails and skirt panels need different timing so the entire model does not sway as one rigid object.

Physics should run at a stable fixed or semi-fixed timestep and clamp extreme `dt` values after tab suspension.

---

## 11. Tracking design

MediaPipe Face Landmarker is a strong candidate for the advanced browser tracker because it can output 3D facial landmarks, expression blendshape scores and facial transformation matrices. Its web inference API is synchronous, so continuous camera inference should run in a Worker where feasible.

Privacy design:

- camera starts only after a user action;
- `audio: false` by default;
- face inference runs locally;
- no analytics or camera-frame uploads;
- self-host model/WASM assets for production instead of loading tracking code from a CDN;
- stop all tracks and workers on shutdown.

Tracking pipeline:

```text
camera frame
→ face landmarks/blendshapes
→ confidence filtering
→ neutral calibration
→ normalized channels
→ dead zone
→ sensitivity/range mapping
→ adaptive smoothing
→ parameter targets
```

Recommended mappings include head rotation/translation, independent blink, gaze, brows, jaw/mouth open and smile/frown coefficients.

Smoothing should be channel-specific. Head rotation may tolerate stronger smoothing; blink needs very low latency. A single smoothing slider for every facial signal is not ideal.

---

## 12. Renderer choice

### Canvas2D

Keep Canvas2D for editor overlays, debug visualization and fallback rendering. It is broadly available and simple, but triangle-per-draw deformation does not scale well for large rigs.

### WebGL2 — recommended production renderer now

WebGL2 is the best target for MeguRig's production runtime today because it is widely available and naturally supports textured triangle meshes, alpha blending, vertex buffers, index buffers, framebuffers and GPU-accelerated compositing.

Use WebGL2 for:

- textured mesh draw calls;
- UV mapping;
- per-node opacity;
- draw order;
- clipping-mask framebuffers/stencil strategy;
- future batching;
- GPU-side deformation where useful.

### WebGPU — future optional backend

WebGPU is technically attractive but is still not available in every widely-used browser. It should be an optional future backend after WebGL2 is stable, not the only renderer.

Recommended strategy:

```text
Editor overlays: Canvas2D
Production model: WebGL2
Optional future backend: WebGPU
```

---

## 13. Prioritized implementation roadmap

### Phase A — engine foundation

- standard parameter registry;
- safe numeric normalization;
- explicit triangle mesh format;
- mesh topology validation;
- affine matrix hierarchy;
- deformer graph cycle/missing-parent validation;
- warp-grid point evaluation;
- multidimensional keyform interpolation;
- multi-segment spring chains;
- WebGL2 textured mesh renderer foundation.

### Phase B — project v7 and migration

- create versioned model/resources/deformers schema;
- migrate v6 regular-grid layers to explicit triangles;
- preserve v6 opening/export compatibility;
- strict resource and graph validation.

### Phase C — editor scene graph

- Parts/Deformer tree UI;
- create/reparent warp deformers;
- create/reparent rotation deformers;
- local/global transform editing;
- cycle-safe drag/reparent.

### Phase D — professional facial parameter set

- independent left/right eye open;
- eyeball X/Y;
- brows position/form;
- MouthForm × MouthOpen 2D grid;
- Head XYZ parameter set;
- breath parameter.

### Phase E — WebGL2 runtime integration

- replace production triangle-per-Canvas2D rendering;
- texture resource cache;
- explicit mesh buffers;
- clipping masks;
- draw-order groups;
- context-loss recovery;
- retain Canvas2D fallback.

### Phase F — physics and tracking

- multi-stage physics groups;
- role presets for hair/ribbon/skirt/sleeves/charms;
- MediaPipe Face Landmarker local package/model assets;
- Worker inference;
- per-channel calibration, smoothing, dead zones and ranges.

### Phase G — real maid artwork acceptance

Do not use procedural reconstruction. Import actual separated artwork for the black-and-white gothic maid, then verify:

1. no gaps during Head XYZ;
2. near/far eye perspective works;
3. independent blink/gaze works;
4. MouthOpen × MouthForm is expressive;
5. head/body hierarchy is correct;
6. hair/ribbon/bow/skirt physics overlap naturally;
7. clipping and draw order remain correct during movement;
8. save/reopen is visually identical;
9. tracking remains stable and local;
10. target frame rate remains practical on mid-range hardware.

---

## First implementation landed with this document

The first post-research engine foundation is intentionally isolated from the v6 editor until its primitives are proven by tests.

`engine/core.js` adds:

- a larger standard VTuber parameter registry;
- safe parameter clamping;
- explicit vertex/UV/triangle grid generation;
- topology validation;
- affine transform matrices;
- N-dimensional keyform interpolation (including 2D and 3D grids);
- warp-grid evaluation;
- validated parent-child deformer graphs;
- multi-segment spring-chain physics.

`engine/webgl2-renderer.js` adds the first GPU textured-mesh renderer backend. It is not yet the live default renderer; integration comes after project-v7 migration and compatibility tests.

This sequencing is deliberate: the current live v6 tool remains usable while the replacement engine is built and verified underneath it.
