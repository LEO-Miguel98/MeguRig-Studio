# MeguRig Studio

MeguRig Studio is a private, local-first VTuber rig-preparation workspace designed to turn separated character artwork into structured parameter-driven rig data.

## Current capabilities

- Flattened PNG/JPG/WebP and multi-layer transparent PNG/WebP import.
- Layer ordering, visibility, rig roles, position, rotation, scale, opacity, and custom pivots.
- VTuber markers for head, eyes, mouth, and body.
- Transform keyforms for Head X, Head Y, Body Z, Eye Open, and Mouth Open.
- Linear interpolation preview between captured keyforms.
- Structured `megurig.project.v3` JSON export with transforms, pivots, roles, markers, parameters, and keyforms.
- Preview PNG export.
- Dependency-free static architecture compatible with GitHub Pages.

## Keyform workflow

1. Import separated artwork and select a layer.
2. Choose a parameter in **Deformer keyforms**.
3. Choose a key value, position/rotate/scale the layer for that pose, then capture the keyform.
4. Capture at least two values (for example Head X `-30` and `30`).
5. Move the matching Rig Preview slider to preview interpolation between captured states.

## Privacy and security

Artwork remains local to the browser. The app has no backend, analytics, remote scripts, or credential requirements. Do not commit personal model source art, credentials, proprietary Live2D files, or exported model packages.

## Important limitation

This is currently a transform-deformer system. It does not yet provide per-vertex ArtMesh deformation, automatic image separation, webcam tracking, or direct `.moc3` generation. Proprietary Live2D components remain outside this repository unless their license explicitly permits distribution.

## Planned next stages

1. ArtMesh/vertex deformation and mesh editing.
2. Physics chains for hair, ribbons, clothing, and accessories.
3. Facial landmark and layer-role assistance.
4. Webcam tracking preview.
5. Cubism export-assistance tooling and validation.
