import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { UI } from './ui.js';
import { FileManager } from './fileManager.js';
import { ObjectFactory } from './factory.js';
import { GeminiManager } from './gemini.js';
import { LayerManager } from './layerManager.js';
import { ToolTip } from './tooltip.js';
import { CharacterManager } from './characterManager.js';

class StageApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.orbit = null;
        this.transformControl = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedObject = null;
        this.objects = []; // Keep track of interactable objects

        // Initialize Modules
        this.factory = new ObjectFactory(this);
        this.fileManager = new FileManager(this);
        this.gemini = new GeminiManager(this);
        this.layerManager = new LayerManager(this); // Init Layer Manager
        this.ui = new UI(this); // UI initialized last so it can access layerManager

        this.init();
    }

    init() {
        const container = document.getElementById('canvas-container');

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e); // Matches bg-dark
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, container.offsetWidth / container.offsetHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lighting (Base ambient)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x2d3748, 0x222222);
        this.scene.add(gridHelper);

        // Axes
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Controls
        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.enableDamping = true;
        this.orbit.dampingFactor = 0.05;

        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.orbit.enabled = !event.value;
        });
        this.transformControl.addEventListener('change', () => {
            if (this.selectedObject) this.ui.updateUI(this.selectedObject);
        });
        this.scene.add(this.transformControl);

        // Events
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // Initialize UI Logic
        this.ui.init();

        // Start Loop
        this.animate();
    }

    // --- OBJECT CREATION PROXY ---

    addShape(type) {
        const mesh = this.factory.createShape(type);
        this.addToScene(mesh);
        this.selectObject(mesh);
    }

    addFigure(gender) {
        const figure = this.factory.createFigure(gender);
        this.addToScene(figure);
        // Add parts to raycast list
        figure.traverse(child => {
            if (child.isMesh) this.objects.push(child);
        });
        this.selectObject(figure);
    }

    addLight(type) {
        const lightContainer = this.factory.createLight(type);
        this.addToScene(lightContainer);
        this.selectObject(lightContainer);
    }

    addToScene(obj) {
        this.scene.add(obj);
        // Add to interactable objects list if it's a root selectable item
        if (obj.userData.type === 'shape' || obj.userData.type === 'light') {
            this.objects.push(obj);
        } else if (obj.userData.type === 'figure') {
            this.objects.push(obj); // Store the group as the main object
        }
    }

    // --- HELPER FOR AI ---
    applyColorToSelected(hexColor) {
        if (!this.selectedObject) return;
        const obj = this.selectedObject;

        // Find mesh to color
        let targetMesh = null;
        if (obj.userData.type === 'shape') targetMesh = obj;
        else if (obj.userData.name) targetMesh = obj.children.find(c => c.isMesh); // Limb
        else if (obj.userData.type === 'figure') targetMesh = obj.children.find(c => c.userData.name === 'Torso');

        if (targetMesh || obj.userData.type === 'figure') {
            if (obj.userData.type === 'figure') {
                obj.traverse(c => { if (c.isMesh) c.material.color.set(hexColor); });
            } else if (targetMesh) {
                targetMesh.material.color.set(hexColor);
            }
            // Force UI update
            this.ui.renderPropertiesPanel(this.selectedObject);
        }
    }

    // Change figure gender
    changeFigureGender(figureObj, newGender) {
        if (figureObj.userData.type !== 'figure') return;

        // Store current transform
        const pos = figureObj.position.clone();
        const rot = figureObj.rotation.clone();
        const scl = figureObj.scale.clone();

        // Store joint rotations for all joints
        const jointData = {};
        figureObj.traverse(child => {
            if (child.userData.name && child.userData.name.includes('Joint')) {
                jointData[child.userData.name] = {
                    x: child.rotation.x,
                    y: child.rotation.y,
                    z: child.rotation.z
                };
            }
        });

        // Get current color from pelvis
        let currentColor = 0x00ff41;
        const pelvis = figureObj.children.find(c => c.userData.name === 'Pelvis');
        if (pelvis && pelvis.material) {
            currentColor = pelvis.material.color.getHex();
        }

        // Remove old figure from objects array and scene
        this.transformControl.detach();

        // Remove all mesh children from objects array
        figureObj.traverse(child => {
            if (child.isMesh) {
                const idx = this.objects.indexOf(child);
                if (idx > -1) this.objects.splice(idx, 1);
            }
        });

        // Remove figure itself from objects array
        const figIdx = this.objects.indexOf(figureObj);
        if (figIdx > -1) this.objects.splice(figIdx, 1);

        this.scene.remove(figureObj);

        // Create new figure
        const newFigure = this.factory.createFigure(newGender);
        newFigure.position.copy(pos);
        newFigure.rotation.copy(rot);
        newFigure.scale.copy(scl);

        // Apply color to all meshes
        newFigure.traverse(c => {
            if (c.isMesh) c.material.color.setHex(currentColor);
        });

        // Restore joint rotations (matching joint names)
        newFigure.traverse(child => {
            if (child.userData.name && jointData[child.userData.name]) {
                const rot = jointData[child.userData.name];
                child.rotation.set(rot.x, rot.y, rot.z);
            }
        });

        // Add to scene and objects array
        this.addToScene(newFigure);
        newFigure.traverse(child => {
            if (child.isMesh) this.objects.push(child);
        });

        this.selectObject(newFigure);
    }

    // --- MANIPULATION ---

    onPointerDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Intersect recursive
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            let target = null;
            // Walk up hierarchy to find the "logical" object
            for (let hit of intersects) {
                if (hit.object.type === 'GridHelper') continue;
                let curr = hit.object;
                while (curr) {
                    if (curr.userData && (curr.userData.type || curr.userData.name)) {
                        target = curr;
                        break;
                    }
                    if (curr.parent === this.scene) break;
                    curr = curr.parent;
                }
                if (target) break;
            }

            if (target) {
                this.selectObject(target);
            } else {
                this.deselect();
            }
        } else {
            this.deselect();
        }
    }

    selectObject(obj) {
        // Special Handling: Limb selection should select the Joint (parent)
        if (obj.userData.name && obj.parent.userData.name && obj.parent.userData.name.includes('Joint')) {
            this.selectedObject = obj.parent;
        } else {
            this.selectedObject = obj;
        }

        this.transformControl.attach(this.selectedObject);
        // This triggers UI update which now renders layers via LayerManager
        this.ui.updateUI(this.selectedObject);
    }

    deselect() {
        this.selectedObject = null;
        this.transformControl.detach();
        this.ui.updateUI(null);
    }

    setTransformMode(mode) {
        this.transformControl.setMode(mode);
    }

    deleteSelected() {
        if (!this.selectedObject) return;
        this.transformControl.detach();

        let root = this.selectedObject;
        while (root.parent && root.parent !== this.scene) {
            root = root.parent;
        }

        this.scene.remove(root);

        // Cleanup from objects array
        if (root.userData.type === 'figure') {
            const idx = this.objects.indexOf(root);
            if (idx > -1) this.objects.splice(idx, 1);
        } else {
            const idx = this.objects.indexOf(root);
            if (idx > -1) this.objects.splice(idx, 1);
        }

        this.selectedObject = null;
        this.ui.updateUI(null);
    }

    clearScene() {
        const toRemove = [];
        this.scene.traverse(obj => {
            if (obj.userData.type) toRemove.push(obj);
        });

        toRemove.forEach(obj => {
            let root = obj;
            while (root.parent && root.parent !== this.scene) root = root.parent;
            if (toRemove.includes(root)) this.scene.remove(root);
        });

        this.objects = [];
        this.selectedObject = null;
        this.transformControl.detach();
        this.ui.updateUI(null);
    }

    // --- LOOP ---

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.offsetWidth / container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    // --- SETTINGS METHODS ---
    setGridVisible(visible) {
        // Find and toggle grid helper
        this.scene.traverse(obj => {
            if (obj.type === 'GridHelper') {
                obj.visible = visible;
            }
        });
    }

    setAxesVisible(visible) {
        // Find and toggle axes helper
        this.scene.traverse(obj => {
            if (obj.type === 'AxesHelper') {
                obj.visible = visible;
            }
        });
    }

    setSnapEnabled(enabled) {
        // Enable/disable snapping for transform controls
        // This would require additional implementation
        console.log('Snap enabled:', enabled);
    }

    setCameraSpeed(speed) {
        // Adjust orbit controls speed
        this.orbit.rotateSpeed = speed;
        this.orbit.panSpeed = speed;
        this.orbit.zoomSpeed = speed;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update light helpers
        this.scene.traverse(obj => {
            if (obj.userData.type === 'light' && obj.children[1]) {
                obj.children[1].update();
            }
        });

        this.orbit.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Bootstrap
window.onload = () => {
    window.app = new StageApp();
};