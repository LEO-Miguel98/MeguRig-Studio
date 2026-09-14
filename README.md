# MeguRig Studio

MeguRig Studio is a private, local-first VTuber model preparation and rigging workflow project focused on clean layer preparation, parameter mapping, preview tooling, and Live2D/Cubism export assistance.

## Current capabilities

- Load flattened PNG/JPG/WebP artwork.
- Import multiple separated transparent PNG/WebP layers.
- Reorder, show/hide, move, rotate, scale, and change opacity per layer.
- Classify layers as face, left/right eye, brows, mouth, hair, body, clothes, accessory, or generic art.
- Set a custom pivot per layer directly on the canvas.
- Place head, eye, mouth, and body rig markers.
- Preview basic head/body parameter movement.
- Export a `megurig.project.v2` JSON manifest containing scene, layer roles, transforms, pivots, markers, and parameter data.
- Export a PNG preview of the current canvas.
- Works as a static browser app and is compatible with GitHub Pages.

## Privacy and security

Artwork is processed with browser object URLs and is not uploaded by this app. Imported files are type/size checked, filenames are sanitized before export metadata is produced, and there are no remote scripts, API keys, credentials, or proprietary Live2D binaries in the repository.

## Important limitation

MeguRig Studio does **not** generate a Live2D `.moc3` file by itself. The current goal is to automate model preparation and export structured rig data that can later feed a Cubism-assisted workflow. Proprietary Live2D components must remain outside this repository unless their license explicitly permits distribution.

## Planned next stages

1. Layer groups and presets for common VTuber part layouts.
2. Mesh/deformer editor and parameter-keyform system.
3. Automatic facial landmark suggestions and layer-role detection.
4. Physics chains for hair, ribbons, clothing, and accessories.
5. Webcam tracking preview.
6. Cubism export-assistance tooling and validation.
