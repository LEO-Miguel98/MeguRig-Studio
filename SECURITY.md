# Security Policy

MeguRig Studio is a local-first static browser application. It should not require API keys, passwords, tokens, analytics identifiers, remote runtime scripts, or remote artwork uploads.

## Trust boundaries

- Imported artwork is handled locally with browser object URLs.
- Webcam access is requested only after the user presses **Start camera**.
- Camera audio is disabled and frames are not transmitted to a MeguRig backend.
- Native browser `FaceDetector`, when available, processes the local camera element.
- Project JSON is treated as untrusted input: file size, schema, layer count, roles, parameters, numerical ranges, mesh dimensions/offsets, marker count, and keyform counts are bounded before restoration.
- Image MIME type and file size are checked before decode.
- Decoded images are rejected when individual pixel dimensions exceed the configured safe budget, and the combined decoded artwork pixel count is capped to reduce memory-exhaustion risk.
- User-provided filenames, layer names, expression names, and labels must not be inserted with `innerHTML`; UI rendering uses text APIs.
- Object URLs and media tracks must be released when they are no longer needed.
- Exported project data is JSON-only and must not contain executable script content.

## Repository and CI safety

Do not commit credentials, personal model source artwork, exported private Live2D packages, proprietary Cubism components, or generated model files. The repository `.gitignore` contains defensive patterns for common local secrets and model artifacts.

The dependency-free CI regression script also scans runtime JS/HTML for remote script imports and common credential-like token patterns. This is defense in depth, not a guarantee that no vulnerability or secret can ever exist.

GitHub Actions should use least-privilege permissions. Do not add write permissions, third-party actions, or secret access unless a workflow genuinely requires them and the change has been reviewed.

## Reporting

If a security issue is found, avoid posting credentials, private model artwork, camera captures, or exploit payloads containing personal data in a public issue. Reproduce with non-sensitive test data whenever possible.

No software can be guaranteed completely secure. MeguRig aims to minimize attack surface by remaining dependency-free at runtime, local-first, bounded around untrusted file input, and explicit about camera access.
