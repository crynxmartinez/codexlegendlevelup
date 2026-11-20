# Bruno Simon reference study

Research date: 2026-09-14. Reference: the current folio-2025, not the older folio-2019 car portfolio.

## Evidence and limits

Opened the live site, entered the world, inspected its opening composition and menu, and read the public repository tree and selected implementation files. Source snapshot: `41046b57eeed8d156d9c3fd7fa259900baef7816`. The study covers the major architecture and component families; it is not a claim that every secret, achievement, seasonal event, input device, or collision was exercised. The private server implementation is unavailable. Source behavior is distinguished below from our proposed adaptation.

The live opening scene uses a concentrated reveal around the vehicle before revealing a much larger environment. Warm ground lighting, cooler shadow colors, vegetation, water, large world-space lettering, and small interactive markers establish the composition. A menu provides conventional controls alongside exploration. These are visual observations, not measured performance results.

Primary references:

- [Live site and technical credits](https://bruno-simon.com/).
- [Pinned repository](https://github.com/brunosimon/folio-2025/tree/41046b57eeed8d156d9c3fd7fa259900baef7816).
- [Game construction and resource lists](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Game.js).
- [Documented game loop and export workflow](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/readme.md).

## Component map and adaptation

| Component family | What the reference does | Codex Legends decision |
| --- | --- | --- |
| Bootstrap and loading | Constructs services in an explicit order, initializes rendering and loaders, then world/player systems | Load a usable HTML shell first; load only the chosen arena and required cards |
| Frame scheduling | Ticker broadcasts ordered ticks; renderer owns the animation loop | One scene clock and one render owner; integrate existing presentation queue |
| Camera | Perspective camera, focus tracking, smoothed movement, spherical view/zoom controls | Fixed readable duel view with restrained scripted framing; no free orbit during decisions |
| Player controls | Keyboard, pointer/mobile, gamepad inputs feed the vehicle | Central input arbitration for hover, inspect, selecting and targeting |
| Physics | Rapier rigid bodies, collider descriptions, groups, damping and contact handling | Cosmetic-only bodies for debris; authoritative cards use explicit transforms |
| Vehicle | Chassis colliders, wheel controller, steering/braking/suspension, recovery | Study for motion weight; no vehicle subsystem required for a card game |
| Visual objects | Visual geometry is paired with optional physical descriptions | UID-to-card-view registry; graphics disposable independently of card instances |
| Repeated geometry | Instanced meshes share geometry/material and update transforms | Instance rocks, foliage and fragments; visible card faces remain individually identifiable |
| Environment | Terrain, grass, trees, water, fog, wind, rain, snow and cycles | Static themed arena plus subtle local wind/water; no distracting random weather during a duel |
| Lighting/materials | Shared material treatment, directional shadows, stylized rendering and postprocessing | Consistent palette, readable card faces, limited shadows and selective glow |
| Interaction points | Nearby/selected interaction state presents actionable scene affordances | Clear legal-target highlights and stable DOM controls; preserve existing game permissions |
| Areas/map | Named scene areas assembled from model children; map and menu provide navigation | Three archipelago destinations with direct Start/Deck/Tutorial buttons |
| Audio | Howler tracks, environmental/positional treatment, collision-related level/rate variation | Keep our Web Audio mixer; synchronize existing sounds to event contact points |
| Quality | High/low levels, initial mobile detection, postprocessing adjustment | Measured adaptive quality with manual override; render failure falls back to the current board |
| Recovery | Respawn/reset affordances recover physical play | Restore camera/layout and rebuild scene from current game state; never reset a duel as a graphics fix |
| Extra activities | Achievements, circuit, bowling, projects, social areas, secrets | Learning path and deck gallery fit our needs; arcade activities and online whispers are deferred |

## How the physics actually works

### Body versus visible model

`Physics.getPhysical()` creates dynamic, fixed, or kinematic body descriptions and collider properties. `Objects` associates graphics with optional physics and copies resulting transforms. The visible mesh does not need to be the collider: a detailed prop can use simple collision geometry. This distinction is essential for performance and stable contact.

Reference: [Physics.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Physics/Physics.js), [Objects.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Objects.js).

### Vehicle response

The chassis uses compound cuboid descriptions and a lowered center of mass. Wheel settings include friction slip, suspension compression, relaxation and stiffness. Pre-physics processing assigns engine force, steering and braking; reversing while moving first applies braking. The controller updates wheel state. Post-physics reads body position/rotation, velocity-related measures, wheel contact and suspension length. Ice can alter wheel friction. A separate visual-vehicle layer presents the result.

These details explain why motion can feel weighted without every visible part being independently simulated. They are not recommended literal settings for our cards.

Reference: [PhysicsVehicle.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Physics/PhysicsVehicle.js), [VisualVehicle.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/World/VisualVehicle.js).

### Timing and contacts

The inspected Ticker clamps incoming delta to a maximum of 1/30 second and maintains scaled time. Physics assigns its world timestep from scaled delta. The vehicle update uses a separate quality-dependent delta. This is **not** evidence of a universal fixed 60 Hz accumulator across the reference. Its Time service also adjusts global animation speed for bullet time.

Physics steps an event queue and contains contact-force callback plumbing. Source comments around that path explicitly question its behavior; do not claim every collision sound was runtime-verified. Audio contains mappings from collision force to sound volume/rate. Our sound cues should come from known duel events, which are more reliable than cosmetic collisions.

Reference: [Ticker.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Ticker.js), [Time.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Time.js), [Audio.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Audio.js).

## Rendering and performance lessons

The inspected Rendering service uses Three.js WebGPURenderer and TSL postprocessing, with bloom and a custom inexpensive depth-of-field pass. Quality changes the processing path. The View source uses a perspective camera with a 25-degree field of view at initialization, smoothing and zoom controls. We should borrow the composed-camera approach, while testing our own camera angles for card readability. Do not copy camera constants into the game as universal settings.

The resource loader caches loaders/resources, supports GLTF, Draco and KTX2, and points decoders to local asset paths. The documented export workflow keeps source assets and generates compressed derivatives. Repeated scene objects use InstancedMesh. These techniques reduce repeated work; they do not establish a frame-rate guarantee on the user's device.

References: [Rendering.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Rendering.js), [View.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/View.js), [ResourcesLoader.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/ResourcesLoader.js), [InstancedGroup.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/InstancedGroup.js), [Quality.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Quality.js).

## Environment, navigation and audio

Game construction connects day/year cycles, weather, wind, lighting, fog, terrain and world objects. Area registration maps named model children to area controllers. This is a useful modular approach: each arena can own scenery without owning battle rules. World animation is a separate concern from an action resolving.

Audio adapts to environmental state and distance, with variation for repeated sounds. Our existing procedural cues and mixer can supply the same integration principle. We do not need a second audio library merely because the reference uses one.

References: [Weather.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Weather.js), [Wind.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Wind.js), [Areas.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/World/Areas/Areas.js), [InteractivePoints.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/InteractivePoints.js), [Audio.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/Audio.js).

## Current game audit

- Game checkout: `C:/Code/codexlegend`; the task's default cwd is a different marketing checkout.
- TypeScript/Vite, existing GSAP and PixiJS dependencies. No Three.js dependency in the inspected manifest.
- `assets` contains 795 WebP files, 33 WAV files, three PNG files, one WebM, four WOFF2 files, and ancillary metadata. These are file counts, not unique playable-card counts.
- No GLB, GLTF, FBX, OBJ, HDR or EXR files found in that asset tree during this study.
- Existing card faces/backs, map images, character cutouts, board art, fonts and sound assets are reusable.
- Core engine/AI/card scripts are separate from much of the UI; `main.ts` remains large and contains routing, game hooks, inspectors and replay wiring.
- `PresentationQueue`, pace profiles, tutorials, sound mixer and ordered choice dialogs should be retained behind an adapter.
- PixiJS adds particles over a DOM board. MatchSurface then paints a visible 2D canvas and a video source. Its moving-scene tick is approximately 30 FPS; idle redraw is slower. This is a rendering design fact, not a current hardware benchmark.
- MatchCapture currently creates MatchSurface and records MP4/audio. Disabling replay saving must therefore be coordinated with the live visual path, rather than deleting a canvas dependency blindly.
- Latest instruction removes replay saving/video export from this overhaul's scope. Existing local data must remain untouched.

## Rights and reuse

The repository license.md is MIT and the live site advertises MIT code. The inspected package.json still labels its license ISC, so record the actual file provenance if adapting source rather than assuming every asset has the same license. Bruno's branding, composition, car and music are not required for our design. Use original project assets, original scene geometry, and independently implemented techniques. No remote source code was executed and no reference artwork was installed in the game.

[Repository license](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/license.md).
