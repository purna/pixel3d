# Pixel 3D - Source of Truth

> **App**: Pixel 3D - Pro 3D Studio
> **Version**: v1.0
> **Purpose**: Browser-based 3D modeling and staging application with AI-powered scene generation
> **Last Updated**: October 6, 2026

---

## Architecture Overview

```
pixel3d/
├── dist/
│   └── pixel3d.js          # Bundled output (esbuild, IIFE format)
├── js/                     # Source JavaScript modules
├── css/
│   └── styles.css          # Stylesheet (loaded live, not bundled)
├── index.html              # HTML shell with cache-buster
├── start.command           # Launcher script (macOS)
└── package.json            # Dependencies + build config
```

### Build Setup

- **Bundler**: esbuild (`npm run build`)
- **Entry**: `js/appEntry.js` → bundles to `dist/pixel3d.js` (IIFE, ES2020 target)
- **CSS**: Loaded live via `<link href="css/styles.css">` (browser refresh to see changes)
- **Cache-buster**: `dist/pixel3d.js?v=YYYYMMDD-N` appended to script src in `index.html`
- **Server**: `python3 -m http.server 4173` (modules require HTTP, not file://)

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| three | 0.160.0 | 3D engine (WebGL) |
| cannon-es | 0.20.0 | Physics engine (currently used, planned replacement: Rapier) |
| three.quarks | 0.10.18 | Particle system |
| esbuild | 0.25.9 | Bundler (dev) |

### Module Structure

| Module | Responsibility |
|--------|---------------|
| `appEntry.js` | Entry point: loads main.js, initializes icon replacements |
| `main.js` | Core app: scene, camera, renderer, orbit controls, raycasting, selection |
| `ui.js` | **Largest file (~5800 lines).** UI setup: panels, modals, asset editors, material editor, color picker, layer management |
| `config.js` | Application defaults (UI, scene, camera, lighting, export settings) |
| `materialsManager.js` (~1235 lines) | Material creation, layer system, asset library, PBR properties |
| `layerMaterial.js` | `LayerMaterial` class for composing layer-based materials |
| `factory.js` | Object creation (primitives, text, characters) |
| `fileManager.js` | Scene save/load, JSON serialization, autosave to localStorage |
| `exportManager.js` | JS, GLB, FBX, JSON exports |
| `cameraManager.js` | Camera controls, zoom, save slots |
| `historyManager.js` | Undo/redo command pattern |
| `gemini.js` | AI scene generation (Gemini, OpenAI, Anthropic, OpenRouter) |
| `characterManager.js` | Xbot/Ybot characters, GLTF loading, animations |
| `animationManager.js` | Keyframe animations, timeline UI |
| `animationUI.js` | Animation timeline editor UI |
| `layerManager.js` | Layer/folder management for scene objects |
| `physicsManager.js` | Physics simulation (using cannon-es, Rapier planned) |
| `particleManager.js` | Particle systems (using three.quarks) |
| `exportManager.js` | Export to JS, GLB, FBX, JSON |
| `aframeExporter.js` | A-Frame scene export |
| `cameraManager.js` | Camera management and presets |
| `colorUtils.js` | Color space conversion (HSL↔RGB↔Hex) |
| `tooltip.js` | Tooltip system |
| `tutorialSystem.js` | Interactive tutorial system |
| `notifications.js` | Toast notification system |
| `icons.js` | Inline SVG icon definitions |

---

## Current Features

### 3D Scene Creation
- Primitive shapes: Box, Sphere, Cone, Cylinder, Plane, Torus, Tetrahedron, Octahedron, Dodecahedron, Icosahedron, Torus Knot
- Character animation: Xbot (female), Ybot (male) with idle/walk/run animations
- Lighting: Point, Spot, Directional, Ambient, Hemisphere
- Real-time rendering with Three.js + RoomEnvironment

### AI Scene Generation
- Providers: Gemini (default), OpenAI, Anthropic, OpenRouter (with free model fallback)
- Natural language → 3D scene with positioned/colored objects
- API keys stored in localStorage (not encrypted, browser-local)

### Material System (Layered)
- **Asset-based**: Materials saved in asset library, applied to objects
- **Layer-based**: Multiple layers with blend modes (Normal, Add, Multiply, Screen, Overlay)
- **Layer types**: Color, Gradient, Noise, Glass, Reflection, Outline, Pattern/Duct, Rainbow, Normal, Image, Video, Cavity, Fresnel, Toon, Displacement
- **Material properties**: Metalness, Roughness, Clearcoat, Transmission, Sheen, Opacity, Alpha
- **Canvas-based preview**: 96x96 realtime canvas preview
- **Presets**: Glass, Metal, Plastic, Fabric, Outline, Default
- **Accordion UI**: Material layers expand/collapse one-at-a-time

### Color Editor
- SL (Saturation-Luminosity) picker with crosshair cursor
- HSL sliders (Hue, Saturation, Lightness)
- Hex/rgb/HSL display formats
- Eyedropper support

### Asset Library
- **Materials**: Layer-based material presets
- **Textures**: Custom texture assets (gradient, noise, patterns)
- **Colors**: Saved color palette
- **Images**: Image assets with URL/file upload
- **Videos**: Video texture assets
- **Audio**: Audio file assets

### Animation System
- Keyframe animation for position, rotation, scale
- Timeline editor with playback controls
- Easing functions

### Object Management
- Select/Move/Rotate/Scale with TransformControls
- Layer/folder organization
- Undo/redo (full command history)
- Snap to grid

### Export
- JavaScript (`.js`): `window.initSceneN` functions for Three.js integration
- GLB: Binary GLTF export
- JSON: Scene data
- PNG: High-resolution renders with resolution presets
- Material names preserved (`matWood`, `matDark`, etc.)

---

## UI Structure

### Panel Tabs
- Materials, Components, Animation, Particles, Physics, Scene Settings, A-Frame

### Modals
- Material Asset Editor (layer-based material designer)
- Texture Asset Editor (procedurally generated textures)
- Color Asset Editor (SL picker + HSL sliders)
- Image/Video/Audio Asset Editors
- AI Scene Generator
- Settings (Unified settings modal)
- A-Frame Exporter

### Transform Controls
- Hand, Translate, Rotate, Scale modes
- Zoom controls
- Camera speed adjustment

---

## Data Model

### Object userData
```js
{
  type: 'shape' | 'shape2d' | 'character' | 'figure' | 'light',
  name: string,
  materialName: string,  // for export naming
  // ... other object-specific data
}
```

### Material Asset
```js
{
  id: string,
  name: string,
  type: 'materials',
  color: '#hex',
  metalness: number,
  roughness: number,
  opacity: number (0-100),
  clearcoat: number,
  transmission: number,
  sheen: number,
  layers: [{ type, enabled, opacity, blendMode, ...typeSpecificProps }],
  alpha: number
}
```

### Texture Asset
```js
{
  id: string,
  name: string,
  type: 'textures',
  layer: { type, color, opacity, ... }
}
```

### Scene Serialization
- JSON export includes: object hierarchy, transforms, materials, lighting, animation
- Material references resolved through `mesh.material.name → userData.materialName → semantic hex-name`

---

## Known Issues / TODO

- Physics engine: currently using cannon-es, planned migration to Rapier (see `/docs/improvement-plan.md#phase-6-physics-engine-integration`)

---

## Component System

The Components tab (Assets panel) provides Unity-style behaviour components that can be attached to selected scene objects. Component data is stored in `object.userData.components`.

### Available Components

1. **Particle System** — Adds a particle emitter using three.quarks presets
   - Presets: `fire`, `smoke`, `sparkle`, `rain`, `snow`, `explosion`
   - Managed by `ParticleManager` (adds `ParticleComponent` to `mesh.userData.particleComponents`)
   - Play/stop/remove controls via particle manager API

2. **Rigid Body** — Adds physics body to the object (cannon-es)
   - Body Type: `Dynamic`, `Static`, `Kinematic`
   - Mass slider (0–10 kg)
   - Linear/angular damping
   - Managed by `PhysicsManager.addMesh()`

3. **Collider** — Defines collision shape properties
   - Shape: `auto` (from geometry), `box`, `sphere`, `cylinder`
   - Sensor (trigger) mode
   - Friction (0–1)

### Component Data Model

```js
// Stored on mesh.userData.components
{
    rigidBody: {
        type: 'dynamic',   // 'static' | 'dynamic' | 'kinematic'
        mass: 1,
        gravityScale: 1,
        linearDamping: 0,
        angularDamping: 0.01,
        lockTranslation: [false, false, false],
        lockRotation:    [false, false, false],
        ccd: false
    },
    collider: {
        shape: 'auto',     // 'auto' | 'box' | 'sphere' | 'cylinder'
        offset: [0, 0, 0],
        size: null,        // auto from geometry
        sensor: false,
        friction: 0.5,
        restitution: 0.2
    }
}
```

### UI Methods

- `renderComponentsPanel()` — Renders the Components tab UI
- `setupComponentToggles()` — Handles expand/collapse for component cards
- `setupComponentButtons()` — Wires up component action buttons
- `addParticleToSelected()` — Adds particle system to selected object
- `applyPhysicsToObject()` — Applies rigid body physics to selected object
- `applyColliderToObject()` — Adds/stores collider component data

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.component-section` | Container for all component cards |
| `.component-card` | Individual component card container |
| `.component-card-header` | Clickable header of a component card |
| `.component-card-title` | Title text for a component |
| `.component-toggle` | Toggle button for expand/collapse |
| `.component-card-content` | Body content of a component card (`.collapsed` hides it) |
| `.component-section-header` | Section header with icon and label |

---

## Development Commands

```sh
# Build bundle
npm run build

# Serve locally
python3 -m http.server 4173

# Open in browser
http://localhost:4173
```

## CSS Classes Reference

Key CSS classes used throughout the UI:

| Class | Purpose |
|-------|---------|
| `.modal-overlay` | Modal background overlay |
| `.modal` | Modal container |
| `.material-texture-layer` | Individual material layer row (draggable for reorder) |
| `.layer-drag-handle` | Drag handle for layer reordering |
| `.layer-toggle-expand` | Expand/collapse button for layer |
| `.material-layer-header` | Header row of a material layer |
| `.material-layer-body` | Body content of a material layer |
| `.color-slider-row-compact` | Flex row containing compact color slider |
| `.hue-slider-compact` / `.saturation-slider-compact` / `.lightness-slider-compact` | HSL slider containers |
| `.slider-track` | Slider track element |
| `.slider-thumb` | Slider thumb element (position set via inline `left` style) |
| `.file-upload-image` | Image preview element (shows broken icon when src empty) |
| `.panel-header-actions` | Header action buttons (expand/collapse all) |
