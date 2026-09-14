# Security Policy

MeguRig Studio is designed as a local-first browser tool. Character artwork is loaded with browser object URLs and is not intentionally transmitted to a server by the application.

## Security rules

- Never commit API keys, passwords, tokens, cookies, private certificates, or other credentials.
- Do not add third-party scripts or remote analytics without a security and privacy review.
- Keep proprietary Live2D/Cubism binaries outside this repository unless their license explicitly permits redistribution.
- Treat imported artwork and filenames as untrusted input.
- Keep file type, file size, and layer-count limits in place unless there is a documented reason to change them.
- Render user-controlled filenames with DOM text APIs, not HTML injection.
- Revoke object URLs when images are replaced, removed, or the page unloads.
- Export project metadata only; do not silently embed or upload source artwork.

## Current trust boundary

The static app can read only files the user explicitly selects or drops into the page. The current implementation has no backend, authentication system, database, remote API, or secret storage. Browser security and the hosting origin still remain part of the overall threat model.

## Reporting

Report security issues privately to the repository owner. Avoid opening a public issue when a vulnerability could expose user artwork, credentials, or other sensitive data.
