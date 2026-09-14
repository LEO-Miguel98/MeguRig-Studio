# MeguRig Studio

MeguRig Studio is a private, local-first VTuber rig-preparation workspace designed to turn separated character artwork into structured parameter-driven rig data.

## Current capabilities

- Flattened PNG/JPG/WebP and multi-layer transparent PNG/WebP import.
- Layer ordering, visibility, rig roles, position, rotation, scale, opacity, and custom pivots.
- Editable triangle-grid mesh deformation with draggable control points.
- Transform + mesh keyforms for Head X, Head Y, Body Z, Eye Open, and Mouth Open.
- Linear interpolation between captured keyforms.
- Per-layer spring physics preview with configurable strength and damping.
- Built-in expression presets: Neutral, Smile, Happy, Laugh, Sad, Angry, Surprised, and Shy / Blush.
- Custom in-session expression snapshots based on the current rig parameters.
- Local webcam preview with native-browser face-position tracking where `FaceDetector` is supported.
- Neutral calibration and smoothing for webcam-driven Head X / Head Y.
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

## Expressions

The expression panel drives the same parameter controls used by the rig preview. Built-in presets are intended as starting points; the visible result depends on the keyforms you author for eye and mouth layers. You can also save the current parameter pose as a custom in-session expression.

## Webcam tracking

Camera frames are never uploaded by MeguRig Studio. The current dependency-free tracker uses the browser's native `FaceDetector` API where available and maps face position to Head X and Head Y with smoothing and neutral calibration. Browsers without `FaceDetector` can still show the local camera preview, but automatic face tracking falls back to the manual rig sliders.

The current tracker does not yet estimate true 3D yaw/pitch/roll, eye openness, or mouth openness. Those require a more detailed local landmark engine, which remains a planned stage rather than being simulated or falsely labeled as complete.

## Saving and reopening

Exporting a project produces a data-only JSON file. Artwork is intentionally not embedded. To resume work, open the MeguRig project first, then select the same local artwork files. Layers are matched by sanitized filename and the saved rig data is restored.

## Target-model validation

Development is being driven toward a full-body maid-style VTuber acceptance model with layered hair, face parts, eye/mouth expressions, sleeves, ribbons, back bow, clothing, accessories, and secondary-motion elements. The tool should not be considered ready for that full model until those parts can be prepared, rigged, previewed, saved/reopened, and validated end to end without breaking earlier workflows.

## Privacy and security

Artwork and camera frames remain local to the browser. The app has no backend, analytics, remote scripts, or credential requirements. Project JSON is size-bounded and validated before restore; known parameters and rig roles are allowlisted, numerical ranges are clamped, and mesh/keyform sizes are limited. Do not commit personal model source art, credentials, proprietary Live2D files, or exported model packages.

## Important limitation

MeguRig Studio is not yet a direct Live2D `.moc3` generator. It has its own browser-side transform/mesh deformation, physics preview, expression presets, and a first local webcam-tracking path. Full facial landmarks, eye/mouth tracking, richer multi-parameter blending, automatic part separation, and Cubism-assisted export still need development. Proprietary Live2D components remain outside this repository unless their license explicitly permits distribution.

## Planned next stages

1. Multi-parameter deformation blending.
2. Detailed local facial landmarks for eye blink, mouth-open, yaw, pitch, and roll.
3. Facial landmark / layer-role assistance and automated rig presets.
4. Persistent expression authoring inside project files.
5. Cubism export-assistance tooling and validation.
