# MeguRig Studio

MeguRig Studio is a private, local-first VTuber rig-preparation workspace designed to turn separated character artwork into structured parameter-driven rig data.

## Current capabilities

- Flattened PNG/JPG/WebP and multi-layer transparent PNG/WebP import.
- Layer ordering, visibility, rig roles, position, rotation, scale, opacity, and custom pivots.
- Editable triangle-grid mesh deformation with draggable control points.
- Transform + mesh keyforms for Head X, Head Y, Body Z, Eye Open, and Mouth Open.
- Linear interpolation between captured keyforms.
- Per-layer spring physics preview with configurable strength and damping.
- VTuber markers for head, eyes, mouth, and body.
- `megurig.project.v5` JSON export containing transforms, pivots, meshes, keyforms, markers, physics, and parameter values.
- Safe project reopen: load a MeguRig JSON project and reattach local artwork by filename.
- Preview PNG export.
- Dependency-free static architecture compatible with GitHub Pages.

## Mesh/keyform workflow

1. Import separated artwork and select a layer.
2. Create a mesh for parts that must bend, then enter **Edit mesh** and drag control points on the canvas.
3. Choose a parameter under **Deformer keyforms**.
4. Set the transform and mesh shape for the desired pose, choose the corresponding **Key value**, then press **Capture keyform**.
5. Repeat with at least one other value; for example Head X at `-30` and `30`.
6. Move the matching **Rig Preview** slider to preview interpolation between the captured transform and mesh states.
7. Enable spring physics on hair, clothing, ribbons, or accessories that need secondary motion.

## Saving and reopening

Exporting a project produces a data-only JSON file. Artwork is intentionally not embedded. To resume work, open the MeguRig project first, then select the same local artwork files. Layers are matched by sanitized filename and the saved rig data is restored.

## Privacy and security

Artwork remains local to the browser. The app has no backend, analytics, remote scripts, or credential requirements. Project JSON is size-bounded and validated before restore; known parameters and rig roles are allowlisted, numerical ranges are clamped, and mesh/keyform sizes are limited. Do not commit personal model source art, credentials, proprietary Live2D files, or exported model packages.

## Important limitation

MeguRig Studio is not yet a direct Live2D `.moc3` generator. It now has its own browser-side transform/mesh deformation and physics preview system, but webcam tracking, automatic part separation, richer multi-parameter blending, expression authoring, and Cubism-assisted export still need development. Proprietary Live2D components remain outside this repository unless their license explicitly permits distribution.

## Planned next stages

1. Multi-parameter deformation blending and expression presets.
2. Facial landmark and layer-role assistance.
3. Webcam face-tracking preview.
4. Automated rig presets for common VTuber parts.
5. Cubism export-assistance tooling and validation.
