# Security Policy

MeguRig Studio is designed to keep imported character artwork local to the browser by default.

## Current security principles

- Do not commit API keys, tokens, passwords, private keys, or personal credentials.
- Imported model images are processed with browser object URLs and are not uploaded by the application.
- File inputs are restricted to PNG, JPEG, and WebP and capped at 25 MB in the current UI.
- Downloaded filenames are sanitized before use.
- Third-party scripts are intentionally avoided in the initial build.
- Live2D proprietary binaries are not bundled or committed to this repository.

## Reporting

If a security issue is found, avoid posting secrets or private model assets in a public issue. Rotate any exposed credential immediately and remove it from repository history where appropriate.
