# MeguRig Studio v6 Release Readiness

## Engine
- [x] Layer transforms and pivots
- [x] Editable triangle-grid meshes
- [x] Transform + mesh keyforms
- [x] Simultaneous multi-parameter transform/mesh blending
- [x] Per-layer spring physics
- [x] Expression presets and custom expression persistence

## Assistance and tracking
- [x] Conservative Auto Rig role suggestions
- [x] Starter mesh/physics presets
- [x] Local webcam permission flow
- [x] Neutral calibration and smoothing
- [x] Native landmark-assisted roll/blink/mouth estimates when available
- [x] Safe manual fallback when native face detection is unavailable

## Persistence and export
- [x] `megurig.project.v6` project JSON
- [x] Local artwork reattachment by sanitized filename
- [x] Rig readiness validator
- [x] Cubism handoff manifest
- [ ] Direct `.moc3` compilation (intentionally unsupported without proprietary Cubism tooling)

## Security
- [x] Local-first artwork processing
- [x] No runtime remote scripts/analytics
- [x] Explicit camera permission; audio disabled
- [x] Project-size/schema/range/mesh/keyform bounds
- [x] Per-image decoded pixel limit
- [x] Combined decoded artwork pixel budget
- [x] Object URL / media-track cleanup
- [x] CI scan for remote runtime scripts and common credential-like patterns

## Validation
- [x] Node regression/security CI
- [x] Browser smoke-test page
- [x] Maid-class structural acceptance fixture
- [x] GitHub Pages deployment workflow

## Artwork limitation
The maid-class fixture proves that the rig engine can represent and validate the requested full-body model class. The exact reference sheet still needs clean separated transparent source layers for a production-quality final character. Automatic high-quality separation from a composite sheet is not yet claimed as complete.
