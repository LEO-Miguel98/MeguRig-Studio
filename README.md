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
- Local webcam preview with native-browser face detection where `FaceDetector` is supported.
- Landmark-assisted roll and optional blink/mouth estimation when the browser exposes enough facial landmark points.
- Neutral calibration and smoothing for webcam-driven parameters.
- Auto Rig Assistant that suggests layer roles from filenames and can conservatively add starter meshes and spring physics.
- VTuber markers for head, eyes, mouth, and body.
- `megurig.project.v5` JSON export containing transforms, pivots, meshes, keyforms, markers, physics, and parameter values.
- Safe project reopen: load a MeguRig JSON project and reattach local artwork by filename.
- Preview PNG export.
- Dependency-free static architecture compatible with GitHub Pages.

## Auto Rig Assistant

The assistant scans separated layer filenames and looks for common VTuber part names such as left/right eye, brows, mouth, front/back hair, face, body, clothing, ribbons, bows, charms, and accessories. It can apply recognized rig roles, create starter meshes for deformable parts, and enable spring physics for likely secondary-motion parts.

The assistant is intentionally conservative. It does not silently overwrite hand-authored mesh deformation or claim uncertain filenames are recognized. Automatic setup is a starting point that must still be reviewed and tuned by the rigger.

## Mesh/keyform workflow

1. Import separated artwork and select a layer.
2. Optionally run **Auto Rig Assistant** to establish starter roles/meshes/physics.
3. Create or refine a mesh for parts that must bend, then enter **Edit mesh** and drag control points on the canvas.
4. Choose a parameter under **Deformer keyforms**.
5. Set the transform and mesh shape for the desired pose, choose the corresponding **Key value**, then press **Capture keyform**.
6. Repeat with at least one other value; for example Head X at `-30` and `30`.
7. Move the matching **Rig Preview** slider to preview interpolation between captured transform and mesh states.
8. Enable/tune spring physics on hair, clothing, ribbons, or accessories that need secondary motion.

## Expressions

The expression panel drives the same parameter controls used by the rig preview. Built-in presets are intended as starting points; the visible result depends on the keyforms you author for eye and mouth layers. You can also save the current parameter pose as a custom in-session expression.

## Webcam tracking

Camera frames are never uploaded by MeguRig Studio. The current dependency-free tracker uses the browser's native `FaceDetector` API where available. Face position drives Head X / Head Y. If the browser also exposes usable eye or mouth landmark geometry, MeguRig can additionally estimate roll and may estimate blink or mouth openness; if those points are unavailable, those channels remain manual rather than being fabricated.

Browsers without `FaceDetector` can still show the local camera preview, but automatic tracking falls back to the manual rig sliders.

This is still not equivalent to a dedicated full facial-landmark model. True robust 3D yaw/pitch/roll and consistent eye/mouth tracking across browsers remain future work.

## Saving and reopening

Exporting a project produces a data-only JSON file. Artwork is intentionally not embedded. To resume work, open the MeguRig project first, then select the same local artwork files. Layers are matched by sanitized filename and the saved rig data is restored.

## Target-model validation

Development is being driven toward a full-body maid-style VTuber acceptance model with layered hair, face parts, eye/mouth expressions, sleeves, ribbons, back bow, clothing, accessories, and secondary-motion elements. The tool should not be considered ready for that full model until those parts can be prepared, rigged, previewed, saved/reopened, and validated end to end without breaking earlier workflows.

## Privacy and security

Artwork and camera frames remain local to the browser. The app has no backend, analytics, remote scripts, or credential requirements. Project JSON is size-bounded and validated before restore; known parameters and rig roles are allowlisted, numerical ranges are clamped, and mesh/keyform sizes are limited. Do not commit personal model source art, credentials, proprietary Live2D files, or exported model packages.

## Important limitation

MeguRig Studio is not yet a direct Live2D `.moc3` generator. It has its own browser-side transform/mesh deformation, physics preview, expression presets, an Auto Rig Assistant, and a local webcam-tracking path. Robust cross-browser landmark tracking, richer multi-parameter blending, image-part separation, persistent expression authoring, and Cubism-assisted export still need development. Proprietary Live2D components remain outside this repository unless their license explicitly permits distribution.

## Planned next stages

1. Multi-parameter deformation blending.
2. Stronger local landmark tracking and calibration.
3. Smarter landmark/role assistance plus rig presets for common VTuber structures.
4. Persistent expression authoring inside project files.
5. Cubism export-assistance tooling and validation.
