import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UI } from './ui.js';
import { FileManager } from './fileManager.js';
import { ObjectFactory } from './factory.js';
import { GeminiManager } from './gemini.js';
import { LayerManager } from './layerManager.js';
import { MaterialsManager } from './materialsManager.js';
import { CameraManager } from './cameraManager.js';
import { ToolTip } from './tooltip.js';
import { HistoryManager, TransformObjectCommand, AddObjectCommand, DeleteObjectCommand, ClearSceneCommand, AddCharacterCommand } from './historyManager.js';
import { CharacterManager } from './characterManager.js';
import { APP_DEFAULTS } from './config.js';
import { TutorialConfig } from './tutorialConfig.js';
import { TutorialSystem } from './tutorialSystem.js';
import './notifications.js';


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
        this.materialsManager = new MaterialsManager(this); // Init Materials Manager
        this.cameraManager = new CameraManager(this); // Init Camera Manager
        this.characterManager = new CharacterManager(this); // Init Character Manager
        this.historyManager = new HistoryManager(this); // Init History Manager
        this.notifications = new window.Notifications(); // Init Notifications System
        this.tutorialConfig = new TutorialConfig(); // Init Tutorial Config
        this.tutorialSystem = new TutorialSystem(this); // Init Tutorial System
        this.ui = new UI(this); // UI initialized last so it can access layerManager

        this.init();
    }

    init() {
        const container = document.getElementById('canvas-container');

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a4e); // Lighter background for better visibility
        this.scene.fog = new THREE.Fog(0x2a2a4e, 20, 100); // Less aggressive fog

        // Camera - will be set by camera manager
        this.camera = null;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Ensure renderer is properly set up for interactive controls
        this.renderer.domElement.style.touchAction = 'none';
        this.renderer.domElement.style.userSelect = 'none';

        container.appendChild(this.renderer.domElement);

        // Initialize Cameras (before Controls initialization)
        if (this.cameraManager && this.cameraManager.setupCameras) {
            this.cameraManager.setupCameras();
        }

        // Wait for camera to be properly initialized before setting up transform controls
        setTimeout(() => {
            this.setupTransformControls();
        }, 100);

        // Lighting (Base ambient)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Main directional light (like sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // Grid - Larger and more visible
        const gridHelper = new THREE.GridHelper(40, 40, 0x6b7280, 0x4b5563);
        gridHelper.position.y = 0;
        gridHelper.material.opacity = 0.8;
        gridHelper.material.transparent = true;
        gridHelper.renderOrder = -1; // Render behind other objects
        this.scene.add(gridHelper);

        // Axes - Larger and more visible with bright colors
        const axesHelper = new THREE.AxesHelper(10);
        axesHelper.position.y = 0.01; // Slightly above ground
        axesHelper.material.depthTest = false; // Always visible
        axesHelper.renderOrder = 999; // Render on top
        this.scene.add(axesHelper);




        // Events
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // Add event listener for transform space toggle
        setTimeout(() => {
            const spaceCheckbox = document.getElementById('transform-space-checkbox');
            if (spaceCheckbox) {
                spaceCheckbox.addEventListener('change', (e) => {
                    this.toggleTransformSpace(e.target.checked);
                });
            }
        }, 500);

        // Initialize UI Logic
        this.ui.init();

        // Initialize Tutorial System
        this.tutorialSystem.init();

        // Ensure grid and axes are visible by default
        this.setGridVisible(true);
        this.setAxesVisible(true);

        // Add some default objects for immediate visibility
        this.addDefaultTestObjects();

        // Initialize undo/redo buttons state
        this.historyManager.updateUndoRedoButtons();

        // Start Loop
        this.animate();
    }

    // Setup transform controls after camera is properly initialized
    setupTransformControls() {
        // Wait a bit longer to ensure camera and orbit controls are fully initialized
        setTimeout(() => {
            // Transform Controls - now initialized with proper camera
            this.transformControl = new TransformControls(this.camera, this.renderer.domElement);

            // Ensure orbit controls exist and are properly configured
            if (!this.orbit) {
                console.warn('Orbit controls not found, creating them now');
                this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
                this.configureOrbitControlsForTouch();
            } else {
                this.configureOrbitControlsForTouch();
            }

            this.transformControl.addEventListener('dragging-changed', (event) => {
                if (this.orbit) this.orbit.enabled = !event.value;
                // Also disable camera movement completely during object transformation
                if (this.cameraManager) {
                    this.cameraManager.setCameraEnabled(!event.value);
                }
            });

            this.transformControl.addEventListener('change', () => {
                if (this.selectedObject) this.ui.updateUI(this.selectedObject);
            });

            // Track transform changes for history
            this.transformControl.addEventListener('mouseUp', () => {
                if (this.selectedObject) {
                    this.captureTransformChange(this.selectedObject);
                }
            });

            // Ensure transform controls are visible and have proper size
            this.transformControl.setSize(1.5); // Increased size for better visibility
            this.transformControl.visible = true;

            // Add space property for better 3D manipulation
            this.transformControl.space = 'local';

            this.scene.add(this.transformControl);

            // Set default transform mode to translate
            this.transformControl.setMode('translate');

            // Debug: Log initial transform control state
            console.log('Transform control initialized:', this.transformControl);
            console.log('Transform control visible:', this.transformControl.visible);
            console.log('Transform control size:', this.transformControl.size);
            console.log('Transform control mode:', this.transformControl.mode);
            console.log('Transform control space:', this.transformControl.space);
            console.log('Orbit controls status:', this.orbit ? 'available' : 'not available');
        }, 200); // Increased delay to ensure everything is ready
    }

    // Configure orbit controls for optimal touch/trackpad experience
    configureOrbitControlsForTouch() {
        if (this.orbit) {
            // Enable single-finger panning for better touch/trackpad experience
            this.orbit.enablePan = true;
            this.orbit.screenSpacePanning = true;

            // Optimize for trackpad/touch input
            this.orbit.panSpeed = 0.8;
            this.orbit.rotateSpeed = 0.8;
            this.orbit.dampingFactor = 0.07;

            // Enable touch events
            this.orbit.enableDamping = true;
            this.orbit.dampingFactor = 0.07;

            // Set initial state - disabled for transform mode, enabled for hand tool
            this.orbit.enabled = false;

            console.log('Orbit controls configured for touch/trackpad input');
        }
    }
    
        // Toggle between local and world space for transform controls
        toggleTransformSpace(useLocalSpace) {
            if (this.transformControl) {
                this.transformControl.space = useLocalSpace ? 'local' : 'world';
                console.log(`Transform space set to: ${useLocalSpace ? 'local' : 'world'}`);
    
                // Update the label text
                const label = document.querySelector('.transform-space-toggle .toggle-label');
                if (label) {
                    label.textContent = useLocalSpace ? 'Local' : 'World';
                }
    
                // Show notification
                this.ui.showNotification(
                    `Transform space: ${useLocalSpace ? 'Local' : 'World'}`,
                    'info'
                );
            } else {
                console.warn('Transform controls not available for space toggle');
            }
        }

    // --- UNDO/REDO METHODS ---
    undo() {
        return this.historyManager.undo();
    }

    redo() {
        return this.historyManager.redo();
    }

    // Capture transform changes for history
    captureTransformChange(object) {
        if (!object) return;

        // Store current transform
        const currentTransform = {
            position: { x: object.position.x, y: object.position.y, z: object.position.z },
            rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
            scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z }
        };

        // Store previous transform (from before the change)
        if (!object.userData.previousTransform) {
            object.userData.previousTransform = currentTransform;
            return;
        }

        // Create and execute transform command
        const oldTransform = object.userData.previousTransform;
        const transformCommand = new TransformObjectCommand(
            this, object, oldTransform, currentTransform
        );
        
        this.historyManager.executeCommand(transformCommand);
        
        // Update previous transform for next change
        object.userData.previousTransform = currentTransform;
    }

    // --- OBJECT CREATION PROXY ---

    addShape(type) {
        const mesh = this.factory.createShape(type);
        const addCommand = new AddObjectCommand(this, mesh);
        this.historyManager.executeCommand(addCommand);
    }

    async addCharacter(type = 'xbot') {
        try {
            // Create and execute character command
            const characterCommand = new AddCharacterCommand(this, type);
            await this.historyManager.executeCommand(characterCommand);
        } catch (error) {
            console.error('Failed to add character:', error);
        }
    }

    addLight(type) {
        const lightContainer = this.factory.createLight(type);
        const addCommand = new AddObjectCommand(this, lightContainer);
        this.historyManager.executeCommand(addCommand);
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

    // Get all objects including those in folders
    getAllObjects() {
        let allObjects = [...this.objects];
        if (this.layerManager) {
            this.layerManager.folders.forEach(folder => {
                allObjects = [...allObjects, ...folder.objects];
            });
        }
        return allObjects;
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

        console.log('Pointer down - intersects found:', intersects.length);

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
                console.log('Selecting object:', target);
                this.selectObject(target);
            } else {
                console.log('No valid target found, deselecting');
                this.deselect();
            }
        } else {
            console.log('No intersects, deselecting');
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

        // Ensure transform controls are visible and properly attached
        this.transformControl.attach(this.selectedObject);
        this.transformControl.visible = true;
        this.transformControl.setSize(1.0);

        // Debug: Log the selected object and transform control state
        console.log('Selected object:', this.selectedObject);
        console.log('Transform control attached:', this.transformControl.object);
        console.log('Transform control visible:', this.transformControl.visible);

        // Reset panels to default view when selecting an object
        this.ui.resetPanelToDefault();

        // This triggers UI update which now renders layers via LayerManager
        this.ui.updateUI(this.selectedObject);
    }

    deselect() {
        this.selectedObject = null;
        this.transformControl.detach();
        this.transformControl.visible = false;
        this.ui.updateUI(null);
    }

    setTransformMode(mode) {
        if (mode === 'hand') {
            // Enable orbit controls for hand tool with optimized touch/trackpad settings
            if (this.orbit) {
                this.orbit.enabled = true;
                this.transformControl.visible = false;
                this.transformControl.detach();

                // Optimize for single-finger panning on trackpad/touch
                this.orbit.enablePan = true;
                this.orbit.screenSpacePanning = true;
                this.orbit.panSpeed = 1.0; // Slightly faster for better responsiveness

                // Enable touch events and improve damping for smoother panning
                this.orbit.enableDamping = true;
                this.orbit.dampingFactor = 0.07;

                // Show notification about single-finger panning
                this.ui.showNotification('Hand Tool: Single-finger panning enabled', 'info');
                console.log('Hand tool activated with single-finger panning optimization');
            }
        } else {
            // Disable orbit controls for other modes
            if (this.orbit) {
                this.orbit.enabled = false;
                this.transformControl.visible = true;
            }
            this.transformControl.setMode(mode);

            // Show notification for transform mode
            const modeNames = {
                'translate': 'Translate',
                'rotate': 'Rotate',
                'scale': 'Scale'
            };
            this.ui.showNotification(`${modeNames[mode] || mode} mode activated`, 'info');
        }
        console.log('Transform mode set to:', mode);
        console.log('Current transform control object:', this.transformControl.object);
    }

    deleteSelected() {
        if (!this.selectedObject) return;
        
        let root = this.selectedObject;
        while (root.parent && root.parent !== this.scene) {
            root = root.parent;
        }

        const deleteCommand = new DeleteObjectCommand(this, root);
        this.historyManager.executeCommand(deleteCommand);
    }

    clearScene() {
        const clearCommand = new ClearSceneCommand(this);
        this.historyManager.executeCommand(clearCommand);
    }

    // --- LOOP ---

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);

        // Let camera manager handle camera aspect ratio updates
        if (this.cameraManager) {
            this.cameraManager.onWindowResize();
        }
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
        // Adjust orbit controls speed (only if orbit controls are initialized)
        if (this.orbit) {
            this.orbit.rotateSpeed = speed;
            this.orbit.panSpeed = speed;
            this.orbit.zoomSpeed = speed;
        }
    }

    // --- SCENE SETTINGS METHODS ---
    setBackgroundColor(colorHex) {
        if (colorHex) {
            this.scene.background = new THREE.Color(colorHex);
        } else {
            // Use default background if null/undefined
            this.scene.background = new THREE.Color(0x2a2a4e);
        }
    }

    setAmbientLight(enabled, colorHex) {
        // Find and update ambient light
        this.scene.traverse(obj => {
            if (obj.type === 'AmbientLight') {
                obj.visible = enabled;
                if (colorHex) {
                    obj.color = new THREE.Color(colorHex);
                }
            }
        });
    }

    addDefaultTestObjects() {
        // Add a test box to verify the scene is working
        const testBox = this.factory.createShape('box');
        testBox.position.set(-2, 1, 0);
        testBox.material.color.setHex(0xff4444);
        this.addToScene(testBox);

        // Add a test sphere
        const testSphere = this.factory.createShape('sphere');
        testSphere.position.set(2, 1, 0);
        testSphere.material.color.setHex(0x4444ff);
        this.addToScene(testSphere);

        // Add a test cylinder
        const testCylinder = this.factory.createShape('cylinder');
        testCylinder.position.set(0, 1, -2);
        testCylinder.material.color.setHex(0x44ff44);
        this.addToScene(testCylinder);

        // Add a point light for better visibility
        const pointLight = this.factory.createLight('point');
        pointLight.position.set(0, 4, 0);
        this.addToScene(pointLight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Calculate delta time for animations
        const delta = 0.016; // Assuming 60fps, you might want to use a proper clock
        
        // Update light helpers
        this.scene.traverse(obj => {
            if (obj.userData.type === 'light' && obj.children[1]) {
                obj.children[1].update();
            }
        });

        // Update character animations
        this.characterManager.update(delta);

        // Update orbit controls (only if initialized and enabled)
        if (this.orbit && this.orbit.enabled) {
            this.orbit.update();
        }
        this.renderer.render(this.scene, this.camera);
    }
}

// Bootstrap
window.onload = () => {
    window.app = new StageApp();
};