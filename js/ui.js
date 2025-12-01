// import { tooltipsEnabled } from './tooltip.js'; // Using window.tooltipsEnabled instead

export class UI {
    constructor(app) {
        this.app = app;
        this.propsContent = document.getElementById('props-content');
        this.layersList = document.getElementById('layers-list');
        this.canvasContainer = document.getElementById('canvas-container');

        // Modal Elements
        this.modal = document.getElementById('ai-modal');
        this.promptInput = document.getElementById('ai-prompt-input');
        this.btnGenerate = document.getElementById('btn-ai-generate');
        this.btnCancel = document.getElementById('btn-ai-cancel');
        this.spinner = document.getElementById('ai-spinner');
        this.modalTitle = document.getElementById('modal-title-text');
        this.modalDesc = document.getElementById('modal-desc');

        // Settings Modal
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsInitialized = false;

        this.currentAIMode = 'scene';
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.activeSubmenu = null; // Track currently open submenu
    }

    setupEventListeners() {
        // Toolbar Clicks
        document.getElementById('tools-container').addEventListener('click', (e) => {
            const btn = e.target.closest('.tool-btn');
            if (!btn) return;

            // Handle Settings
            if (btn.id === 'tool-settings') {
                this.openSettingsModal();
                return;
            }

            // Handle AI Tool specifically
            if (btn.id === 'tool-ai-scene') {
                this.openAIModal('scene');
                return;
            }

            // Handle menu parent buttons - toggle submenu
            if (btn.classList.contains('menu-parent')) {
                this.toggleSubmenu(btn);
                return;
            }

            // Show panel if hidden when clicking action buttons
            const panel = document.getElementById('properties-panel');
            if (panel.classList.contains('hidden') && btn.dataset.action) {
                this.togglePropertiesPanel();
            }

            if (!btn.dataset.action) return;

            // Close any open submenus when performing an action
            this.closeAllSubmenus();

            // Remove active class from all tools
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            const action = btn.dataset.action;
            const type = btn.dataset.type;
            if (this.app[action]) {
                this.app[action](type);
            }
        });

        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => {
            if (this.app.undo) this.app.undo();
        });
        document.getElementById('redoBtn').addEventListener('click', () => {
            if (this.app.redo) this.app.redo();
        });

        // Main action buttons
        document.getElementById('btn-clear').addEventListener('click', () => {
            if (this.app.clearScene) this.app.clearScene();
        });
        document.getElementById('btn-save').addEventListener('click', () => {
            if (this.app.fileManager) {
                this.app.fileManager.saveToBrowser();
                this.showNotification('Scene saved to browser!', 'success');
            }
        });
        document.getElementById('btn-export').addEventListener('click', () => {
            if (this.app.fileManager) {
                this.app.fileManager.saveScene();
                this.showNotification('Scene exported successfully!', 'success');
            }
        });
        document.getElementById('btn-load').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            if (this.app.fileManager && e.target.files[0])
                this.app.fileManager.loadScene(e);
        });
        // Panel toggle button
        const panelToggle = document.getElementById('panel-toggle');
        if (panelToggle) {
            panelToggle.addEventListener('click', () => this.togglePropertiesPanel());
        }

        // Mode buttons
        document.getElementById('mode-translate').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('translate');
        });
        document.getElementById('mode-rotate').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('rotate');
        });
        document.getElementById('mode-scale').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('scale');
        });

        // AI modal buttons
        this.btnGenerate.addEventListener('click', () => this.handleAIGenerate());
        this.btnCancel.addEventListener('click', () => this.closeAIModal());

        // AI modal close on overlay click
        document.getElementById('ai-modal').addEventListener('click', (e) => {
            if (e.target.id === 'ai-modal') this.closeAIModal();
        });

        // Close submenus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tools-panel')) {
                this.closeAllSubmenus();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Handle undo/redo shortcuts first
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (this.app.undo) this.app.undo();
                        return;
                    case 'y':
                        e.preventDefault();
                        if (this.app.redo) this.app.redo();
                        return;
                }
            }
            
            const key = e.key.toLowerCase();
            switch (key) {
                case 'q':
                    document.getElementById('tool-select').click();
                    break;
                case 'g':
                    document.getElementById('mode-translate').click();
                    break;
                case 'r':
                    document.getElementById('mode-rotate').click();
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (this.app.fileManager) {
                            this.app.fileManager.saveToBrowser();
                            this.showNotification('Scene saved to browser!', 'success');
                        }
                    } else {
                        document.getElementById('mode-scale').click();
                    }
                    break;
                case 'c':
                    if (this.app.clearScene) this.app.clearScene();
                    break;
                case 'o':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        document.getElementById('btn-load').click();
                    }
                    break;
                case 'x':
                    if (this.app.selectedObject && this.app.deleteSelected) {
                        this.app.deleteSelected();
                        this.showNotification('Object deleted!', 'success');
                    } else {
                        this.showNotification('No object selected to delete', 'info');
                    }
                    break;
            }
        });
    }

    // --- SETTINGS MODAL ---
    openSettingsModal() {
        if (!this.settingsInitialized) {
            this.initSettingsModal();
            this.settingsInitialized = true;
        }
        this.loadSettingsToUI();
        this.settingsModal.classList.add('open');
    }

    closeSettingsModal() {
        this.settingsModal.classList.remove('open');
    }

    initSettingsModal() {
        // Close button
        const closeBtn = document.getElementById('btn-settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        // Save button
        const saveBtn = document.getElementById('btn-settings-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.closeSettingsModal();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('btn-settings-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Camera speed range
        const speedRange = document.getElementById('setting-camera-speed');
        const speedValue = document.getElementById('camera-speed-value');
        if (speedRange && speedValue) {
            speedRange.addEventListener('input', (e) => {
                speedValue.textContent = e.target.value;
            });
        }

        // Close on overlay click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') this.closeSettingsModal();
        });
    }

    toggleSubmenu(btn) {
        const submenu = btn.querySelector('.tool-submenu');
        if (!submenu) return;

        const isOpen = submenu.style.display === 'flex';
        this.closeAllSubmenus();

        if (!isOpen) {
            // Calculate vertical position based on button in viewport
            const btnRect = btn.getBoundingClientRect();
            const topOffset = btnRect.top + btnRect.height / 2 - 24; // Center align roughly

            submenu.style.display = 'flex';
            submenu.style.top = `${topOffset}px`;
            submenu.style.setProperty('--submenu-top', `${topOffset}px`); // For CSS custom prop if needed

            this.activeSubmenu = submenu;
        }
    }
    handleSubmenuClick(e) {
        e.stopPropagation(); // Prevent event bubbling to toolbar handler
        const btn = e.currentTarget;

        // Show panel if hidden
        const panel = document.getElementById('properties-panel');
        if (panel.classList.contains('hidden')) {
            this.togglePropertiesPanel();
        }

        // Close submenu
        this.closeAllSubmenus();

        // Remove active class from all tools
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        // Add to clicked
        btn.classList.add('active');

        const action = btn.dataset.action;
        const type = btn.dataset.type;
        if (this.app[action]) {
            this.app[action](type);
        }
    }

    closeAllSubmenus() {
        document.querySelectorAll('.tool-submenu').forEach(menu => {
            menu.style.display = 'none';
        });
        this.activeSubmenu = null;
    }

    togglePropertiesPanel() {
        const panel = document.getElementById('properties-panel');
        const toggle = document.getElementById('panel-toggle');
        const workspace = document.querySelector('.workspace');
        const icon = toggle.querySelector('i');

        if (panel.classList.contains('hidden')) {
            // Show panel
            panel.classList.remove('hidden');
            toggle.classList.remove('panel-hidden');
            workspace.classList.remove('panel-hidden');
            icon.className = 'fas fa-chevron-right';
            toggle.title = 'Hide Panel';
        } else {
            // Hide panel
            panel.classList.add('hidden');
            toggle.classList.add('panel-hidden');
            workspace.classList.add('panel-hidden');
            icon.className = 'fas fa-chevron-left';
            toggle.title = 'Show Panel';
        }

        // Trigger resize to update 3D renderer
        setTimeout(() => {
            if (this.app.onWindowResize) {
                this.app.onWindowResize();
            }
        }, 300); // Wait for CSS transition to complete
    }

    loadSettings() {
        const saved = localStorage.getItem('pixel3d-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            // Apply settings to app
            if (this.app.setGridVisible) this.app.setGridVisible(settings.grid);
            if (this.app.setAxesVisible) this.app.setAxesVisible(settings.axes);
            if (this.app.setSnapEnabled) this.app.setSnapEnabled(settings.snap);
            if (this.app.setCameraSpeed) this.app.setCameraSpeed(settings.cameraSpeed);
            // Apply tooltips
            window.tooltipsEnabled = settings.tooltips !== false;
        }
    }

    loadSettingsToUI() {
        const saved = localStorage.getItem('pixel3d-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            // Set UI values
            const gridEl = document.getElementById('setting-grid');
            const axesEl = document.getElementById('setting-axes');
            const snapEl = document.getElementById('setting-snap');
            const tooltipsEl = document.getElementById('setting-tooltips');
            const speedEl = document.getElementById('setting-camera-speed');
            const speedValueEl = document.getElementById('camera-speed-value');

            if (gridEl) gridEl.checked = settings.grid !== false;
            if (axesEl) axesEl.checked = settings.axes !== false;
            if (snapEl) snapEl.checked = settings.snap !== false;
            if (tooltipsEl) tooltipsEl.checked = settings.tooltips !== false;
            if (speedEl) {
                speedEl.value = settings.cameraSpeed || 1;
                if (speedValueEl) speedValueEl.textContent = settings.cameraSpeed || 1;
            }
        }
    }

    saveSettings() {
        const settings = {
            grid: document.getElementById('setting-grid').checked,
            axes: document.getElementById('setting-axes').checked,
            snap: document.getElementById('setting-snap').checked,
            tooltips: document.getElementById('setting-tooltips').checked,
            cameraSpeed: parseFloat(document.getElementById('setting-camera-speed').value)
        };

        // Save
        localStorage.setItem('pixel3d-settings', JSON.stringify(settings));

        // Apply
        if (this.app.setGridVisible) this.app.setGridVisible(settings.grid);
        if (this.app.setAxesVisible) this.app.setAxesVisible(settings.axes);
        if (this.app.setSnapEnabled) this.app.setSnapEnabled(settings.snap);
        if (this.app.setCameraSpeed) this.app.setCameraSpeed(settings.cameraSpeed);

        // Tooltip global variable update
        window.tooltipsEnabled = settings.tooltips;

        this.showNotification('Settings saved successfully!', 'success');
    }


    resetSettings() {
        const defaults = {
            grid: true,
            axes: true,
            snap: true,
            tooltips: true,
            cameraSpeed: 1
        };

        // Save reset
        localStorage.setItem('pixel3d-settings', JSON.stringify(defaults));

        // Apply immediately
        if (this.app.setGridVisible) this.app.setGridVisible(true);
        if (this.app.setAxesVisible) this.app.setAxesVisible(true);
        if (this.app.setSnapEnabled) this.app.setSnapEnabled(true);
        if (this.app.setCameraSpeed) this.app.setCameraSpeed(1);

        window.tooltipsEnabled = true;

        // Update UI elements visually
        this.loadSettingsToUI();

        this.showNotification('Settings reset to defaults!', 'success');
    }


    // --- AI MODAL LOGIC ---

    openAIModal(mode) {
        this.currentAIMode = mode;
        this.promptInput.value = '';
        this.modal.classList.add('open');
        this.promptInput.focus();

        if (mode === 'scene') {
            this.modalTitle.textContent = "Magic Scene Generator";
            this.modalDesc.textContent = "Describe a full scene layout.";
            this.promptInput.placeholder = "e.g. A futuristic city with tall blue cylinders and neon cones...";
        } else {
            this.modalTitle.textContent = "Material Assistant";
            this.modalDesc.textContent = "Describe the material or mood for the color.";
            this.promptInput.placeholder = "e.g. Molten lava, Rusty metal, Cyberpunk pink...";
        }
    }

    closeAIModal() {
        this.modal.classList.remove('open');
        this.spinner.classList.remove('active');
        this.btnGenerate.disabled = false;
        this.btnCancel.disabled = false;
    }

    async handleAIGenerate() {
        const text = this.promptInput.value.trim();
        if (!text) return;

        this.spinner.classList.add('active');
        this.btnGenerate.disabled = true;
        this.btnCancel.disabled = true;

        try {
            if (this.currentAIMode === 'scene') {
                const sceneData = await this.app.gemini.generateScene(text);
                // Use FileManager to load the data structure
                this.app.fileManager.loadData(sceneData);
                this.showNotification('Scene generated by AI!', 'success');
            } else if (this.currentAIMode === 'material') {
                const colorHex = await this.app.gemini.generateMaterialColor(text);
                if (this.app.selectedObject) {
                    this.app.applyColorToSelected(colorHex);
                    this.showNotification('Material color applied!', 'success');
                }
            }
            this.closeAIModal();
        } catch (err) {
            console.error(err);
            this.showNotification('AI Generation failed. See console for details.', 'error');
            this.spinner.classList.remove('active');
            this.btnGenerate.disabled = false;
            this.btnCancel.disabled = false;
        }
    }

    // --- PROPERTIES PANEL ---
    updateUI(selectedObject) {
        // Delegate Layer List Rendering to LayerManager
        if (this.app.layerManager) {
            this.app.layerManager.render();
        }

        // Always render the properties panel first to create the inputs
        this.renderPropertiesPanel(selectedObject);

        if (!selectedObject) {
            return;
        }

        // Now update the input values (inputs exist after renderPropertiesPanel)
        const pos = selectedObject.position;
        const rot = selectedObject.rotation;
        const scale = selectedObject.scale;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) el.value = val.toFixed(2);
        };

        setVal('pos-x', pos.x);
        setVal('pos-y', pos.y);
        setVal('pos-z', pos.z);

        setVal('rot-x', rot.x);
        setVal('rot-y', rot.y);
        setVal('rot-z', rot.z);

        setVal('scl-x', scale.x);
        setVal('scl-y', scale.y);
        setVal('scl-z', scale.z);
    }

    renderPropertiesPanel(selectedObject) {
        this.propsContent.innerHTML = '';

        if (!selectedObject) {
            this.propsContent.innerHTML = '<div class="empty-state">Select an object to edit properties</div>';
            return;
        }

        const obj = selectedObject;
        let title = "Object";
        let isLight = false;
        let isShape = false;
        let isFigurePart = false;
        let isFigure = false;

        // Determine Title based on name override or type
        if (obj.userData.name) {
            title = obj.userData.name;
            if (obj.userData.name.includes('Joint')) isFigurePart = true;
        } else if (obj.userData.type === 'shape') {
            title = obj.userData.shapeType.toUpperCase(); isShape = true;
        } else if (obj.userData.type === 'light') {
            title = obj.userData.lightType.toUpperCase() + " LIGHT"; isLight = true;
        } else if (obj.userData.type === 'figure') {
            title = obj.userData.gender.toUpperCase() + " FIGURE";
            isFigure = true;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'property-group';
        header.innerHTML = `<div style="font-weight:bold; color:var(--accent-primary); border-bottom:1px solid #333; padding-bottom:5px;">${title}</div>`;
        this.propsContent.appendChild(header);

        // JOINT CONTROLS
        if (isFigurePart) {
            const jointGroup = document.createElement('div');
            jointGroup.className = 'property-group';
            jointGroup.innerHTML = `<div class="property-label">Joint Controls</div><div style="font-size:0.8rem; color:#94a3b8;">Use the transform tools (G/R/S) to pose this joint. Select parent/child joints for full control.</div>`;
            this.propsContent.appendChild(jointGroup);
        }

        // Helper: Create Input
        const createInput = (label, id, value, onChange) => {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `<span>${label}</span><input type="number" id="${id}" value="${value.toFixed(2)}" step="0.1">`;
            div.querySelector('input').addEventListener('input', (e) => onChange(parseFloat(e.target.value)));
            return div;
        };

        // Helper: Create Vector3 Inputs
        const createVec3 = (label, prefix, vec, onChangeObj) => {
            const group = document.createElement('div');
            group.className = 'property-group';
            group.innerHTML = `<div class="property-label">${label}</div>`;
            const row = document.createElement('div');
            row.className = 'input-row';

            row.appendChild(createInput('X', `${prefix}-x`, vec.x, (v) => { vec.x = v; onChangeObj(); }));
            row.appendChild(createInput('Y', `${prefix}-y`, vec.y, (v) => { vec.y = v; onChangeObj(); }));
            row.appendChild(createInput('Z', `${prefix}-z`, vec.z, (v) => { vec.z = v; onChangeObj(); }));

            group.appendChild(row);
            this.propsContent.appendChild(group);
        };

        // FIGURE CONTROLS
        if (isFigure) {
            const figureGroup = document.createElement('div');
            figureGroup.className = 'property-group';
            figureGroup.innerHTML = `<div class="property-label">Figure Controls</div>`;

            const figureControls = document.createElement('div');
            figureControls.className = 'figure-controls';

            // Gender Switch
            const genderSwitch = document.createElement('div');
            genderSwitch.className = 'gender-switch';
            genderSwitch.innerHTML = `
                <button class="gender-btn ${obj.userData.gender === 'male' ? 'active' : ''}" data-gender="male">
                    <i class="fas fa-male"></i> Male
                </button>
                <button class="gender-btn ${obj.userData.gender === 'female' ? 'active' : ''}" data-gender="female">
                    <i class="fas fa-female"></i> Female
                </button>
            `;

            genderSwitch.querySelectorAll('.gender-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const newGender = e.currentTarget.dataset.gender;
                    if (newGender !== obj.userData.gender) {
                        this.app.changeFigureGender(obj, newGender);
                    }
                });
            });

            figureControls.appendChild(genderSwitch);
            figureGroup.appendChild(figureControls);
            this.propsContent.appendChild(figureGroup);
        }

        // TRANSFORM CONTROLS
        createVec3('Position', 'pos', obj.position, () => { });
        createVec3('Rotation', 'rot', obj.rotation, () => { });
        createVec3('Scale', 'scl', obj.scale, () => { });

        // COLOR (Shapes & Figure Parts)
        let targetMesh = null;
        if (isShape) targetMesh = obj;
        if (isFigurePart) {
            // Find the mesh inside the group (limbs are groups with mesh children)
            targetMesh = obj.children.find(c => c.isMesh);
        } else if (obj.userData.type === 'figure') {
            // Try to color pelvis as proxy for figure
            targetMesh = obj.children.find(c => c.userData.name === 'Pelvis');
        }

        if (targetMesh && targetMesh.material) {
            const colorGroup = document.createElement('div');
            colorGroup.className = 'property-group';

            // Flex container for label + AI button
            const lblRow = document.createElement('div');
            lblRow.style.display = 'flex';
            lblRow.style.justifyContent = 'space-between';
            lblRow.innerHTML = `<div class="property-label">Color</div> <i class="fas fa-wand-magic-sparkles" style="font-size:0.7rem; cursor:pointer; color:#a855f7;" title="AI Material Assistant"></i>`;

            // Add click listener for AI button
            lblRow.querySelector('i').addEventListener('click', () => {
                this.openAIModal('material');
            });
            colorGroup.appendChild(lblRow);

            const colInput = document.createElement('input');
            colInput.type = 'color';
            colInput.id = 'prop-color-picker'; // ID for easier targeting
            colInput.value = '#' + targetMesh.material.color.getHexString();
            colInput.addEventListener('input', (e) => {
                const hex = e.target.value;
                if (obj.userData.type === 'figure') {
                    // Color whole figure
                    obj.traverse(c => { if (c.isMesh) c.material.color.set(hex); });
                } else {
                    targetMesh.material.color.set(hex);
                }
            });
            colorGroup.appendChild(colInput);
            this.propsContent.appendChild(colorGroup);
        }

        // LIGHT PROPERTIES
        if (isLight) {
            const lightObj = obj.children[0]; // The actual light is inside the container

            const intGroup = document.createElement('div');
            intGroup.className = 'property-group';
            intGroup.innerHTML = `<div class="property-label">Intensity</div>`;
            const intInput = document.createElement('input');
            intInput.type = 'range';
            intInput.min = 0; intInput.max = 100;
            intInput.value = lightObj.intensity;
            intInput.style.width = '100%';
            intInput.addEventListener('input', (e) => {
                lightObj.intensity = parseFloat(e.target.value);
            });
            intGroup.appendChild(intInput);
            this.propsContent.appendChild(intGroup);

            const lColGroup = document.createElement('div');
            lColGroup.className = 'property-group';
            lColGroup.innerHTML = `<div class="property-label">Light Color</div>`;
            const lColInput = document.createElement('input');
            lColInput.type = 'color';
            lColInput.value = '#' + lightObj.color.getHexString();
            lColInput.addEventListener('input', (e) => {
                lightObj.color.set(e.target.value);
            });
            lColGroup.appendChild(lColInput);
            this.propsContent.appendChild(lColGroup);
        }
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.textContent = message;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = '#fff';
        notification.style.fontSize = '12px';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '10000';
        notification.style.border = '1px solid rgba(255,255,255,0.2)';
        notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        notification.style.transition = 'all 0.3s ease';
        notification.style.transform = 'translateY(-20px)';
        notification.style.opacity = '0';

        const colors = { success: '#00ff41', error: '#ff006e', info: '#00d9ff' };
        notification.style.backgroundColor = '#1a1a2e';
        notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}