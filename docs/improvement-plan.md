# Pixel 3D Improvement Plan
## Feature Parity Roadmap with Spline.design

> **Current Version**: V1.0 (Pro Staging Studio)
> **Target**: Close the feature gap with Spline.design for browser-based 3D design
> **Last Updated**: August 23, 2026

---

## Executive Summary

Pixel 3D currently covers the basics well—primitive shapes, lighting, character animation, and AI scene generation. However, Spline.design has evolved into a comprehensive platform with advanced materials, physics, particles, modeling tools, and interactivity systems. This plan outlines the missing features organized by implementation priority.

---

## Phase 1: Visual & Material Foundation
*High impact, moderate complexity—directly improves output quality*

### 1.1 Layer-Based Material System
| Spline Feature | Priority | Complexity |
|----------------|----------|------------|
| Multiple material layers (Color, Glass, Reflection, Outline, Displacement) | High | High |
| Per-layer opacity and blend modes | High | Medium |
| Material presets library | Medium | Low |
| Vertex color support | Low | Medium |

**Three.js Libraries Available:**

| Library | Description | Notes |
|---------|-------------|-------|
| [`@interverse/three-layered-material`](https://github.com/aiira-co/three-layered-material) | PBR layering system using Three.js TSL | Requires three >= 0.183. Substance Painter-style layering with triplanar, edge wear, height blending |
| [`lamina`](https://github.com/pmndrs/lamina) | Layer-based shader material (popularized by Spline) | **Archived April 2023** but functional. Built on `three-custom-shader-material` |
| [Three.js TSL](https://threejs.org/docs/TSL.html) | Native Three Shading Language | Built into three >= 0.170. Node-based shader composition |

**Implementation Notes:**
- **Recommended**: Use `@interverse/three-layered-material` for modern PBR layering OR build custom with Three.js TSL nodes
- Alternative: Use `three-custom-shader-material` directly for lower-level control
- Each layer: `{ type, visible, opacity, blendMode, properties{} }`
- Default layers: Color + Lighting for 3D objects
- Layer types: `color`, `gradient`, `image`, `noise`, `glass`, `reflection`, `outline`, `displacement`

### 1.2 PBR (Physically Based Rendering) Materials
| Feature | Priority | Complexity |
|---------|----------|------------|
| Roughness/Metalness workflow | High | Medium |
| Normal maps | High | Medium |
| Ambient occlusion maps | Medium | Low |
| HDR environment lighting | Medium | Medium |
| Image-based lighting (IBL) | Medium | Medium |

**Three.js Libraries Available:**

| Library/Feature | Description | Import |
|-----------------|-------------|--------|
| `MeshStandardMaterial` | Built-in PBR material | `three` |
| `MeshPhysicalMaterial` | Advanced PBR (clearcoat, transmission, etc.) | `three` |
| `PMREMGenerator` | Environment map processing | `three` |
| `RGBELoader` | HDR environment loading | `three/addons/loaders/RGBELoader.js` |

**Implementation Notes:**
- Upgrade from `MeshPhongMaterial` to `MeshStandardMaterial` / `MeshPhysicalMaterial`
- Add texture upload UI for albedo, normal, roughness, metalness, AO maps
- Use `PMREMGenerator` + `RGBELoader` for HDR environment maps
- `MeshPhysicalMaterial` supports clearcoat, transmission, sheen—useful for glass/plastic

### 1.3 Sky & Environment System
| Feature | Priority | Complexity |
|---------|----------|------------|
| Physical Sky (procedural) | Medium | High |
| HDRi Sky (image-based) | Medium | Medium |
| Depth fog | Medium | Low |
| Height fog | Low | Medium |
| Background color gradients | Low | Low |

**Three.js Libraries Available:**

| Library/Feature | Description | Import |
|-----------------|-------------|--------|
| `Sky` (three/addons) | Preetham/Physical sky shader | `three/addons/objects/Sky.js` |
| `RoomEnvironment` | Neutral IBL for PBR testing | `three/addons/environments/RoomEnvironment.js` |
| `Fog` / `FogExp2` | Built-in depth fog | `scene.fog = new THREE.Fog(...)` |

**Implementation Notes:**
- `Sky` addon provides physical sky with sun position, turbidity, rayleigh controls
- `RoomEnvironment` generates neutral HDR env via PMREMGenerator
- Height fog: Custom shader or postprocessing pass

---

## Phase 2: Modeling & Sculpting Tools
*High impact, high complexity—expands creative possibilities*

### 2.1 Mesh Editing Tools
| Spline Feature | Priority | Complexity |
|----------------|----------|------------|
| Extrude faces | High | High |
| Inset faces | High | High |
| Loop cuts | High | High |
| Edge slide | Medium | Medium |
| Bevel/Chamfer edges | Medium | High |
| Fill holes | Medium | Medium |
| Delete vertices/edges/faces | Medium | High |

**Three.js Libraries Available:**

| Library | Description | Import |
|---------|-------------|--------|
| [`three-bvh-csg`](https://github.com/gkjohnson/three-bvh-csg) | Fast CSG with BVH acceleration | `npm install three-bvh-csg` |
[`three-gpu-csg`](https://github.com/eric-haibin-lin/three-gpu-csg) | GPU-based CSG operations | `npm install three-gpu-csg` |
| [`three-mesh-bvh`](https://github.com/gkjohnson/three-mesh-bvh) | BVH acceleration for raycasting/collision | `npm install three-mesh-bvh` |
| Manual BufferGeometry editing | Direct vertex/face manipulation | Built-in |

**Implementation Notes:**
- Selection modes: Vertex, Edge, Face, Object
- Use Three.js `BufferGeometry` manipulation for extrusion/inset
- `three-mesh-bvh` enables fast raycasting for selection
- Consider half-edge data structure for efficient mesh traversal

### 2.2 Boolean Operations
| Feature | Priority | Complexity |
|---------|----------|------------|
| Union | Medium | High |
| Subtract | Medium | High |
| Intersect | Medium | High |

**Three.js Libraries Available:**

| Library | Description | Performance | Import |
|---------|-------------|-------------|--------|
| [`three-bvh-csg`](https://github.com/gkjohnson/three-bvh-csg) | Evaluator-based CSG with BVH | ~4x faster than older libraries | `npm install three-bvh-csg` |
| [`three-csg-ts`](https://github.com/JasonMa2016/three-csg-ts) | TypeScript CSG port | Moderate | `npm install three-csg-ts` |

**Implementation Notes:**
- **Recommended**: `three-bvh-csg` for robust, fast booleans
- Preview mode before committing
- Handle non-manifold geometry gracefully

### 2.3 Sculpting System
| Feature | Priority | Complexity |
|---------|----------|------------|
| Grab brush | Medium | High |
| Smooth brush | Medium | High |
| Inflate brush | Medium | High |
| Paint brush | Low | Medium |
| Brush symmetry (X/Y/Z) | Medium | Medium |
| Brush falloff/radius | Medium | Medium |

**Three.js Libraries Available:**

| Library | Description | Import |
|---------|-------------|--------|
| Custom displacement | Vertex displacement via raycast + falloff | Built-in + `three-mesh-bvh` |
| [`manifold-3d`](https://github.com/elalish/manifold) | Robust mesh boolean/manifold ops | WASM-based, good for sculpting base |

---

## Phase 3: Animation & Simulation
*High impact, high complexity—brings scenes to life*

### 3.1 Particle System
| Spline Feature | Priority | Complexity |
|----------------|----------|------------|
| Particle emitter (Plane, Box, Sphere, Torus, Cone, Custom) | High | High |
| Birth rate, lifetime, speed controls | High | Medium |
| Color A→B blending / random | High | Low |
| Size and alpha fade over lifetime | High | Low |
| Gravity force | Medium | Medium |
| Noise forces (Curl, Simplex, FBM) | Medium | High |
| Particle collisions | Medium | High |
| Particle attractors | Low | Medium |
| Particle vortices | Low | Medium |
| Custom particle images | Medium | Low |
| Particle presets library | Low | Low |

**Three.js Libraries Available:**

| Library | Description | Key Features | Import |
|---------|-------------|--------------|--------|
| [`@newkrok/three-particles`](https://github.com/NewKrok/three-particles) | GPU particle system | WebGPU compute, 50K-350K+ particles, force fields, noise | `npm install @newkrok/three-particles` |
| [`three.quarks`](https://github.com/Alchemist0823/three.quarks) | Full VFX engine | Batched rendering, behaviors, shaders, emitter shapes | `npm install three.quarks` |
| [`three-emitter`](https://github.com/riokoe/three-emitter) | InstancedBufferGeometry emitter | Multiple emitters on one shader, high performance | `npm install three-emitter` |
| [`vfx-composer`](https://github.com/isaac-mason/vfx-composer) | VFX + Particles | Shader Composer integration, module-based effects | `npm install vfx-composer` |

**Implementation Notes:**
- **Recommended**: `@newkrok/three-particles` for GPU compute (WebGPU) with CPU fallback
- **Alternative**: `three.quarks` for comprehensive CPU-based system with all Spline features
- GPU compute requires three >= 0.182 with `three/webgpu`
- CPU fallback available for both libraries
- Emitter shapes define spawn volume

### 3.2 Physics Simulation
| Spline Feature | Priority | Complexity |
|----------------|----------|------------|
| Global gravity toggle | High | Medium |
| Dynamic body type | High | High |
| Static/Kinematic body types | High | Medium |
| Collision detection | High | High |
| Weight/mass property | Medium | Low |
| Friction coefficient | Medium | Medium |
| Bounce/restitution | Medium | Medium |
| Damping (linear/angular) | Medium | Low |
| Translation constraints per axis | Low | Medium |
| Rotation constraints per axis | Low | Medium |
| Precise vs box collider | Low | Medium |

**Three.js Libraries Available:**

| Library | Description | Pros | Cons | Import |
|---------|-------------|------|------|--------|
| [`cannon-es`](https://github.com/pmndrs/cannon-es) | Pure JS physics (cannon.js fork) | Simple API, small bundle (~150KB), easy Three.js integration | Limited scaling (~300 bodies), no CCD | `npm install cannon-es` |
| [`@dimforge/rapier3d-compat`](https://github.com/dimforge/rapier) | Rust physics via WASM | High performance (10K+ bodies), deterministic, trimesh/heightfield | Larger bundle (~500KB), async WASM init | `npm install @dimforge/rapier3d-compat` |
| [`three/addons/physics/RapierPhysics.js`](https://threejs.org/docs/pages/RapierPhysics.js) | Official Three.js Rapier wrapper | Built-in, pre-configured | Same WASM complexity as rapier3d | `three/addons/physics/RapierPhysics.js` |

**Implementation Notes:**
- **Recommended**: `cannon-es` for simplicity and quick implementation
- **Upgrade path**: `@dimforge/rapier3d-compat` for production-scale physics
- Physics world update at fixed timestep (`world.fixedStep()`)
- Sync physics bodies to Three.js meshes each frame
- Debug visualization: `cannon-es-debugger` available

### 3.3 Hair/Fur/Grass System
| Feature | Priority | Complexity |
|---------|----------|------------|
| Fiber rendering | Low | High |
| Gravity affecting fibers | Low | Medium |
| Wind force | Low | Medium |
| Fiber density/length controls | Low | Medium |

**Three.js Libraries Available:**

| Library | Description | Import |
|---------|-------------|--------|
| Custom shader-based | Strand geometry with vertex shader animation | Build on `THREE.InstancedMesh` |
| `MeshPhysicalMaterial.sheen` | Approximate fur/sheen look | Built-in (no true strands) |

---

## Phase 4: Interactivity & Events
*Medium impact, high complexity—enables interactive experiences*

### 4.1 Event System
| Spline Feature | Priority | Complexity |
|----------------|----------|------------|
| Mouse events (click, hover, enter, leave) | Medium | High |
| Keyboard events | Low | Medium |
| Scroll events | Low | Medium |
| Collision events | Medium | Medium |
| Distance-based triggers | Low | Medium |
| Drag and drop | Low | High |
| Game controller input | Low | High |

### 4.2 States & Actions
| Feature | Priority | Complexity |
|---------|----------|------------|
| Object states (default, hover, active, etc.) | Medium | High |
| State transitions/animations | Medium | High |
| Action types (move, rotate, scale, show, hide) | Medium | Medium |
| Delay between actions | Low | Low |
| State machine UI | Low | High |

### 4.3 Variables & Data Binding
| Feature | Priority | Complexity |
|---------|----------|------------|
| Scene variables (number, string, boolean) | Low | Medium |
| API request actions | Low | Medium |
| Webhook triggers | Low | Low |
| Real-time data endpoints | Low | High |

---

## Phase 5: Rendering & Performance
*Medium impact, medium complexity—smoother experience*

### 5.1 WebGPU Renderer
| Feature | Priority | Complexity |
|---------|----------|------------|
| WebGPU backend (with WebGL fallback) | Medium | Very High |
| Screen-space reflections | Low | High |
| Improved shadow quality | Medium | Medium |
| Ambient occlusion (SAO/GFX) | Low | Medium |

### 5.2 Performance Optimization
| Feature | Priority | Complexity |
|---------|----------|------------|
| Instanced rendering for clones | Medium | Medium |
| LOD (Level of Detail) system | Low | High |
| Occlusion culling | Low | Medium |
| Texture atlasing | Low | Medium |
| Memory management improvements | Medium | Medium |

---

## Phase 6: Advanced Features
*Lower priority, specialized use cases*

### 6.1 Cloner/Duplication Tools
| Feature | Priority | Complexity |
|---------|----------|------------|
| Linear clone | Low | Medium |
| Radial/circular clone | Low | Medium |
| Grid clone | Low | Medium |
| Surface clone (distribute on mesh) | Low | High |

### 6.2 Lathe/Revolution Tool
| Feature | Priority | Complexity |
|---------|----------|------------|
| Profile curve to 3D mesh | Low | High |

### 6.3 Shape Blend (Morph)
| Feature | Priority | Complexity |
|---------|----------|------------|
| Blend between two meshes | Low | Very High |

### 6.4 2D Design Canvas (Hana-style)
| Feature | Priority | Complexity |
|---------|----------|------------|
| Vector drawing tools | Low | Very High |
| Auto layout / frames | Low | Very High |
| Text typography | Low | High |
| Visual effects (shadow, blur, glass) | Low | High |

---

## Implementation Priority Matrix

```
                    HIGH IMPACT
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     │   Phase 1         │   Phase 2         │
     │   Materials       │   Modeling        │
     │   • Layer system  │   • Extrude       │
     │   • PBR           │   • Booleans      │
     │   • Environment   │   • Sculpting     │
     │                   │                   │
LOW ──────────────────────┼────────────────────── HIGH
COMPLEXITY                │                   COMPLEXITY
     │                   │                   │
     │   Phase 3         │   Phase 4         │
     │   Simulation      │   Interactivity   │
     │   • Particles     │   • Events        │
     │   • Physics       │   • States        │
     │                   │   • Variables     │
     └───────────────────┼───────────────────┘
                         │
                    LOW IMPACT
```

---

## Recommended Implementation Order

### Sprint 1-2: Material Foundation
1. Refactor to PBR materials (`MeshStandardMaterial`)
2. Add texture map support (albedo, normal, roughness, metalness)
3. Create layer-based material UI
4. Add material presets

### Sprint 3-4: Particles
1. GPU particle system core
2. Emitter shapes and controls
3. Forces (gravity, noise)
4. Preset library

### Sprint 5-6: Physics
1. Integrate Rapier physics
2. Dynamic/Static body types
3. Collision shapes and detection
4. Physics UI panel

### Sprint 7-8: Mesh Editing
1. Selection modes (vertex/edge/face)
2. Extrude and inset operations
3. Loop cuts
4. Bevel tool

### Sprint 9+: Advanced Features
- Boolean operations
- Sculpting brushes
- Event system
- WebGPU migration

---

## Technical Debt & Refactoring

Before implementing new features, address:

1. **Module Architecture**
   - Split `ui.js` (98KB) into focused modules
   - Create consistent event bus for inter-module communication

2. **State Management**
   - Centralized scene state store
   - Undo/redo improvements for complex operations

3. **Performance**
   - Throttle UI updates during simulation
   - Optimize render loop with frustum culling

4. **Testing**
   - Add unit tests for math/geometry operations
   - Integration tests for scene serialization

---

## Estimated Timeline

| Phase | Features | Est. Hours | Est. Weeks* |
|-------|----------|------------|-------------|
| Phase 1 | Materials & PBR | 120-160 | 3-4 |
| Phase 2 | Modeling Tools | 160-200 | 4-5 |
| Phase 3 | Particles & Physics | 140-180 | 3-4.5 |
| Phase 4 | Interactivity | 100-140 | 2.5-3.5 |
| Phase 5 | Rendering | 80-120 | 2-3 |
| Phase 6 | Advanced | 120-180 | 3-4.5 |
| **Total** | | **720-980** | **18-24.5** |

*Based on solo developer at ~40hrs/week

---

## Success Metrics

- [ ] Users can create PBR materials with texture maps
- [ ] Users can simulate physics with collisions
- [ ] Users can emit particles with forces
- [ ] Users can edit mesh geometry (extrude, bevel)
- [ ] Users can create interactive scenes with events
- [ ] Performance stays at 60fps with 100+ objects

---

## Appendix: Spline Feature Reference

| Category | Spline Feature | Pixel 3D Status |
|----------|---------------|-----------------|
| Materials | Layer-based materials | ❌ Missing |
| Materials | PBR workflow | ❌ Missing |
| Materials | Glass/Reflection layers | ❌ Missing |
| Materials | Environment/IBL | ❌ Missing |
| Modeling | Extrude | ❌ Missing |
| Modeling | Inset | ❌ Missing |
| Modeling | Loop cuts | ❌ Missing |
| Modeling | Bevel | ❌ Missing |
| Modeling | Booleans | ❌ Missing |
| Modeling | Sculpting | ❌ Missing |
| Animation | Particles | ❌ Missing |
| Animation | Physics | ❌ Missing |
| Animation | Hair/Fur | ❌ Missing |
| Animation | Keyframes | ✅ Present |
| AI | Scene generator | ✅ Present |
| AI | In-editor agent | ❌ Missing |
| AI | 3D model generation | ❌ Missing |
| Export | PNG/JSON/GLB | ✅ Present |
| Export | JS (initSceneN) | ✅ Present |
| Export | USDZ/STL | ❌ Missing |
| Interactivity | Events system | ❌ Missing |
| Interactivity | States & Actions | ❌ Missing |
| Interactivity | Variables | ❌ Missing |
| Platform | Real-time collaboration | ❌ Missing |
| Platform | WebGPU | ❌ Missing |
| Platform | Community/Library | ❌ Missing |

---

*This plan should be reviewed quarterly as Spline.design continues to evolve.*

---

## Appendix: Three.js Library Quick Reference

### Materials & Shading

| Library | Purpose | Install | Documentation |
|---------|---------|---------|---------------|
| `@interverse/three-layered-material` | PBR layer stack (Spline-style) | `npm i @interverse/three-layered-material` | [GitHub](https://github.com/aiira-co/three-layered-material) |
| `lamina` | Layer shader material (archived) | `npm i lamina` | [GitHub](https://github.com/pmndrs/lamina) |
| `three-custom-shader-material` | Extend built-in materials with GLSL | `npm i three-custom-shader-material` | [GitHub](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) |
| `shader-composer` | Node-based shader composition | `npm i shader-composer` | [npm](https://www.npmjs.com/package/shader-composer) |
| `vfx-composer` | VFX + particle shader composition | `npm i vfx-composer` | [npm](https://www.npmjs.com/package/vfx-composer) |
| `three-shader-graph` | TypeScript shader graph authoring | `npm i three-shader-graph` | [npm](https://www.npmjs.com/package/three-shader-graph) |

### Physics

| Library | Purpose | Install | Best For |
|---------|---------|---------|----------|
| `cannon-es` | Pure JS physics engine | `npm i cannon-es` | Simple scenes, <300 bodies |
| `@dimforge/rapier3d-compat` | WASM physics (Rust) | `npm i @dimforge/rapier3d-compat` | Complex scenes, 10K+ bodies |
| `three/addons/physics/RapierPhysics.js` | Official Three.js Rapier wrapper | (built-in) | Seamless Three.js integration |

### Particles & VFX

| Library | Purpose | Install | Key Feature |
|---------|---------|---------|-------------|
| `@newkrok/three-particles` | GPU particle system | `npm i @newkrok/three-particles` | WebGPU compute, 50K-350K particles |
| `three.quarks` | Full VFX engine | `npm i three.quarks` | Behaviors, emitter shapes, shaders |
| `three-emitter` | Instanced emitter | `npm i three-emitter` | Multiple emitters, shared shaders |
| `@threeparticles/core` | WebGPU particle engine | `npm i @threeparticles/core` | WebGPU-only, modern API |

### Modeling & Geometry

| Library | Purpose | Install | Documentation |
|---------|---------|---------|---------------|
| `three-bvh-csg` | Fast CSG booleans | `npm i three-bvh-csg` | [GitHub](https://github.com/gkjohnson/three-bvh-csg) |
| `three-mesh-bvh` | BVH mesh acceleration | `npm i three-mesh-bvh` | [GitHub](https://github.com/gkjohnson/three-mesh-bvh) |
| `three-gpu-csg` | GPU CSG operations | `npm i three-gpu-csg` | [GitHub](https://github.com/eric-haibin-lin/three-gpu-csg) |
| `manifold-3d` | Robust manifold geometry | `npm i manifold-3d` | [GitHub](https://github.com/elalish/manifold) |

### Recommended Import Map Update

Add these to your importmap for CDN usage:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
    "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.webgpu.js",
    "cannon-es": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js",
    "@newkrok/three-particles": "https://cdn.jsdelivr.net/npm/@newkrok/three-particles@latest/dist/index.js",
    "three.quarks": "https://cdn.jsdelivr.net/npm/three.quarks@latest/dist/index.js",
    "three-bvh-csg": "https://cdn.jsdelivr.net/npm/three-bvh-csg@latest/dist/index.module.js",
    "three-mesh-bvh": "https://cdn.jsdelivr.net/npm/three-mesh-bvh@latest/dist/index.module.js",
    "@interverse/three-layered-material": "https://cdn.jsdelivr.net/npm/@interverse/three-layered-material@latest/dist/index.js",
    "three-custom-shader-material": "https://cdn.jsdelivr.net/npm/three-custom-shader-material@latest/dist/three-custom-shader-material.es.js"
  }
}
</script>
```

> **Note**: Verify CDN availability for each package. Some may require npm/bundler setup.
