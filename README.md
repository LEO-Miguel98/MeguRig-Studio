# MeguRig Studio

MeguRig Studio is a local-first VTuber rig-preparation workspace for separated character artwork. It is dependency-free at runtime and designed to run as a static site, including on GitHub Pages.

## Current capabilities

- Flattened PNG/JPG/WebP and multi-layer transparent PNG/WebP import.
- Layer ordering, visibility, roles, transforms, opacity, pivots, and editable triangle-grid meshes.
- Transform + mesh keyforms for Head X, Head Y, Body Z, Eye Open, and Mouth Open.
- **Simultaneous multi-parameter transform and mesh blending** in the production renderer.
- Clamped production parameter inputs so malformed/out-of-range UI values cannot drive unsafe deformation ranges.
- Per-layer spring physics with role-based Auto Rig starter presets.
- Built-in expressions plus sanitized, persistent custom expressions.
- Local webcam preview/tracking with explicit camera permission, neutral calibration, smoothing, and safe fallbacks.
- Conservative Auto Rig role detection with confidence handling, starter meshes, pivots, and physics suggestions.
- `megurig.project.v6` data-only save/reopen with local artwork reattachment by filename.
- Rig-readiness validation and a Cubism handoff manifest exporter.
- Ready-made procedural VTuber prototype for testing rig controls without private artwork.
- Maid-class acceptance fixture covering a full-body model shape with face, eyes, brows, mouth, hair, clothing, ribbons/accessories, meshes, keyforms, physics, expressions, and combined deformation.
- Automated regression/security checks through GitHub Actions.

## Rigging workflow

1. Import separated artwork, or launch the ready-made advanced prototype for control testing.
2. Run **Auto Rig Assistant** and review its role/mesh/physics suggestions.
3. Refine pivots and meshes.
4. Capture transform + mesh keyforms at multiple parameter values.
5. Preview multiple parameters together; Head X/Y, Body Z, Eye Open, and Mouth Open are blended simultaneously.
6. Tune spring physics and expressions.
7. Test webcam tracking where supported, then calibrate neutral and adjust smoothing.
8. Run **Validate rig**.
9. Export the MeguRig project and, when appropriate, the Cubism handoff manifest.

## Project persistence

Projects use the `megurig.project.v6` schema. Rig data is stored as JSON; artwork is intentionally not embedded. On reopen, the user reselects the matching local artwork files and MeguRig reattaches them by sanitized filename. Custom expressions are stored in project extension data and restored by the persistence module.

Untrusted project data is bounded before use: schema versions, layer counts, known roles/parameters, numerical ranges, mesh dimensions, mesh offsets, keyform counts, markers, and project size are constrained.

## Webcam tracking

Camera frames stay local to the browser. Camera access starts only after user action and audio is disabled. The dependency-free tracker uses the browser's native `FaceDetector` when available. Face position drives Head X/Y, while exposed landmark geometry can additionally assist roll and optional blink/mouth estimates. Unsupported channels remain manual rather than being fabricated.

Native tracking support varies by browser, so this is not equivalent to a dedicated cross-browser 3D landmark SDK.

## Validation and Cubism handoff

The local validator checks structural readiness, including core roles, parameters, meshes, keyforms, multi-parameter coverage, physics relationships, and expressions. The Cubism handoff exporter produces a structured interchange manifest with layer order, artwork references, pivots, meshes, keyforms, physics, parameters, markers, and validation output.

The handoff manifest is **not** a compiled Live2D `.moc3` file. MeguRig does not bundle proprietary Cubism components and does not claim to compile `.moc3` directly.

## Testing

- `ci-test.mjs` runs dependency-free regression/security checks in GitHub Actions.
- `tests.html` provides browser smoke tests.
- `maid-acceptance.html` runs the maid-class structural/rig-engine acceptance fixture without storing private character artwork.
- `RELEASE.md` tracks release-readiness checks and intentional limitations.
- `engine/core.test.mjs` verifies multidimensional keyform interpolation, explicit mesh validation, deformer hierarchy evaluation, warp-grid behavior, and spring-chain physics.
- `engine/webgl2-renderer.test.mjs` verifies GPU mesh buffer packing without requiring a GPU in CI.

The CI fixture verifies simultaneous transform/mesh blending, production renderer resolution, control-value mapping, validator behavior, multi-parameter coverage, expression presence, and scans static JS/HTML for remote runtime scripts and common credential-like token patterns.

## Target-model acceptance

The acceptance fixture models the class of full-body maid VTuber requested for this project: layered front/back hair, face, left/right eyes, brows, mouth, body, dress/apron/sleeves, ribbons, bow, headdress/accessories, secondary physics, expressions, and combined X/Y deformation.

This proves the **rig engine and project structure** can represent that model class. It does not magically separate a flattened/composite reference image into production-quality transparent source layers. Exact final artwork still needs clean separated layers (manually prepared or produced by a future image-part-separation workflow).

## Privacy and security

- No backend upload path is required.
- No runtime analytics or remote scripts are required.
- No API keys, passwords, or tokens are required by the application.
- Camera audio is disabled and frames are not sent to a MeguRig backend.
- Individual image dimensions and combined decoded artwork pixel counts are bounded to reduce browser memory-exhaustion risk.
- Object URLs and media tracks are released when no longer needed.
- User-controlled names are rendered through text APIs rather than injected HTML.

See `SECURITY.md` for trust-boundary details.

## Post-v6 engine research

The researched architecture for the next-generation artwork-based engine is documented in [`docs/VTUBER_ENGINE_ARCHITECTURE.md`](docs/VTUBER_ENGINE_ARCHITECTURE.md). It covers professional art separation, explicit triangle meshes and UVs, nested warp/rotation deformers, multidimensional keyforms, Head XYZ, facial rigging, multi-stage physics, local face landmark tracking, renderer selection, security, and a phased implementation roadmap.

The first isolated foundation lives under `engine/`. It does **not** replace the live v6 editor yet. This keeps the deployed tool stable while the new explicit-mesh/deformer/WebGL2 architecture is tested before project-v7 migration.

## Remaining limitations

- No direct `.moc3` compilation.
- No production-grade automatic separation of a flattened character sheet into clean art layers yet.
- Native face tracking quality/support varies by browser.
- Complex professional Live2D models may still require manual mesh/keyform refinement and Cubism-side finishing.

MeguRig should be treated as a capable local-first rig-preparation and validation tool, not as a replacement for every proprietary Cubism authoring feature.
