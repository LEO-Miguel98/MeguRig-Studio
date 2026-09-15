# MeguRig Studio

MeguRig Studio is a private, local-first VTuber rig-preparation workspace designed to turn separated character artwork into structured parameter-driven rig data.

## Current capabilities

- Flattened PNG/JPG/WebP and multi-layer transparent PNG/WebP import.
- Layer ordering, visibility, rig roles, transforms, opacity, custom pivots, editable triangle-grid meshes, and transform/mesh keyforms.
- Spring physics preview, built-in expressions, custom expression authoring, local webcam tracking, and conservative Auto Rig assistance.
- `megurig.project.v5` data-only project export/reopen with local artwork reattachment.
- Rig readiness validation and a Cubism handoff manifest exporter.
- Ready-made advanced procedural VTuber prototype for testing rig controls without private artwork.
- Dependency-free static architecture compatible with GitHub Pages.

## Rigging workflow

1. Import separated artwork, or launch the ready-made advanced prototype for control testing.
2. Run **Auto Rig Assistant** for conservative role/mesh/physics suggestions and review the result.
3. Refine pivots and meshes, then capture transform + mesh keyforms at multiple parameter values.
4. Tune spring physics and expression presets.
5. Test webcam tracking where supported, including neutral calibration and smoothing.
6. Run **Validate rig** before export.
7. Export the MeguRig project and, when needed, the Cubism handoff manifest.

## Expressions

Built-in presets drive the same rig parameters used by keyforms. Custom expressions are sanitized, range-clamped, capped, individually removable, and exposed in a serializable form for project persistence integration. Built-in names cannot be silently overwritten.

## Webcam tracking

Camera frames remain local. The dependency-free tracker uses the browser's native `FaceDetector` API where available. Face position drives Head X/Y; exposed landmark geometry can additionally assist roll and optional blink/mouth estimates. Unsupported channels remain manual instead of being fabricated. This is not yet equivalent to a dedicated cross-browser 3D landmark model.

## Validation and Cubism handoff

The local validator checks structural readiness including core roles, parameters, meshes, keyforms, and physics relationships and reports a readiness score. The Cubism handoff exporter produces a structured interchange manifest containing layer order, artwork references, pivots, meshes, keyforms, physics, parameters, markers, and validation output.

The handoff manifest is **not** a compiled Live2D `.moc3` file. MeguRig does not bundle proprietary Cubism components or claim to compile `.moc3` directly.

## Testing

`tests.html` is a dependency-free browser smoke-test page for helper modules. It currently checks module availability, rejection of an empty rig, and structural validation of a minimal core-role rig. This is only an initial regression suite; broader interaction and visual tests are still required before production use.

## Target-model validation

Development is being driven toward a full-body maid-style VTuber acceptance model with layered hair, face parts, eye/mouth expressions, sleeves, ribbons, back bow, clothing, accessories, and secondary-motion elements. The tool should not be considered ready until that class of model can be prepared, rigged, previewed, saved/reopened, validated, and handed off without breaking earlier workflows.

## Privacy and security

Artwork and camera frames remain local to the browser. There is no backend, analytics, remote script requirement, or credential requirement. Project JSON is size-bounded and validated before restore; known parameters/roles are allowlisted, numerical ranges are clamped, and mesh/keyform sizes are limited. Do not commit personal model source art, credentials, proprietary Live2D files, or exported private model packages.

## Important limitations

MeguRig is not yet a direct `.moc3` generator. Robust cross-browser landmark tracking, richer multi-parameter deformation blending, automatic image-part separation, complete expression persistence in the core project schema, and deeper Cubism workflow assistance remain in development.

## Planned next stages

1. Multi-parameter transform and mesh deformation blending.
2. Complete custom-expression persistence in project save/reopen.
3. Stronger local landmark tracking and calibration.
4. Smarter landmark/role assistance and common VTuber rig presets.
5. Expand regression tests and run the maid-model end-to-end acceptance pass.
