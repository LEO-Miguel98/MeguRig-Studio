# Security Policy

MeguRig Studio is a local-first static browser application. It should not require API keys, passwords, tokens, analytics identifiers, or remote artwork uploads.

## Trust boundaries

- Imported artwork is handled locally with browser object URLs.
- Webcam access is requested only after the user presses **Start camera**.
- Camera frames are not transmitted by the application and audio is explicitly disabled.
- Native browser `FaceDetector`, when available, processes the local camera element without a MeguRig backend.
- Project JSON is treated as untrusted input: file size, schema, roles, parameters, numerical ranges, mesh dimensions, and keyform counts are bounded before restoration.
- User-provided filenames and labels must never be inserted with `innerHTML`; UI rendering uses text APIs.
- Object URLs and media tracks must be released when they are no longer needed.

## Repository safety

Do not commit credentials, personal model source artwork, exported Live2D packages, proprietary Cubism components, or generated model files. The repository `.gitignore` contains defensive patterns for common local secrets and model artifacts.

## Reporting

If a security issue is found, avoid posting credentials, private model artwork, or exploit payloads containing personal data in a public issue. Reproduce with non-sensitive test data whenever possible.

No software can be guaranteed completely secure. MeguRig's design aims to minimize attack surface by remaining dependency-free and local-first while validating untrusted project data.