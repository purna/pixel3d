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

        // Settings Modal (using unified settings modal)
        this.settingsModal = document.getElementById('unified-settings-modal');
        this.settingsInitialized = false;

        // Scene Settings Modal
        this.sceneSettingsModal = document.getElementById('scene-settings-modal');
        this.sceneSettingsInitialized = false;

        this.currentAIMode = 'scene';
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.activeSubmenu = null; // Track currently open submenu
        this.setupPanelTabs();
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
            const panel = document.getElementById('right-panel');
            if (panel && panel.classList.contains('hidden') && btn.dataset.action) {
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
        document.getElementById('mode-hand').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('hand');
            console.log('Hand mode clicked');
        });
        document.getElementById('mode-translate').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('translate');
            console.log('Translate mode clicked');
        });
        document.getElementById('mode-rotate').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('rotate');
            console.log('Rotate mode clicked');
        });
        document.getElementById('mode-scale').addEventListener('click', () => {
            if (this.app.setTransformMode) this.app.setTransformMode('scale');
            console.log('Scale mode clicked');
        });

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.zoomCamera(1.2); // Zoom in
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.zoomCamera(0.8); // Zoom out
        });

        document.getElementById('zoom-slider').addEventListener('input', (e) => {
            const zoomLevel = parseFloat(e.target.value);
            this.setCameraZoom(zoomLevel);
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

        // Materials toolbar button
        document.getElementById('tool-materials')?.addEventListener('click', () => {
            // Show panel if hidden when clicking materials button
            const panel = document.getElementById('right-panel');
            if (panel && panel.classList.contains('hidden')) {
                this.togglePropertiesPanel();
            }
            this.toggleMaterialsView();
        });

        // Scene settings toolbar button - now opens scene panel in right menu
        document.getElementById('tool-scene-settings')?.addEventListener('click', () => {
            // Show panel if hidden when clicking scene settings button
            const panel = document.getElementById('right-panel');
            if (panel && panel.classList.contains('hidden')) {
                this.togglePropertiesPanel();
            }
            this.toggleSceneView();
        });

        // Settings toolbar button - now opens unified settings
        document.getElementById('tool-settings')?.addEventListener('click', () => {
            this.openUnifiedSettingsModal('general');
        });

        // Overlay toggle toolbar button
        document.getElementById('tool-toggle-overlays')?.addEventListener('click', () => {
            this.toggleAllOverlays();
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

            // Handle overlay toggle shortcut (Ctrl+Shift+O)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'o':
                        e.preventDefault();
                        this.toggleAllOverlays();
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
                    console.log('G key pressed - translate mode');
                    break;
                case 'r':
                    document.getElementById('mode-rotate').click();
                    console.log('R key pressed - rotate mode');
                    break;
                case 'h':
                    document.getElementById('mode-hand').click();
                    console.log('H key pressed - hand mode');
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
                        console.log('S key pressed - scale mode');
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
        // Redirect to unified settings modal
        this.openUnifiedSettingsModal('general');
    }

    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('open');
        }
    }

    // Toggle all overlays (grid, axes, helpers)
    toggleAllOverlays() {
        // Get current state of grid visibility
        let gridVisible = false;
        let axesVisible = false;

        this.app.scene.traverse(obj => {
            if (obj.type === 'GridHelper') gridVisible = obj.visible;
            if (obj.type === 'AxesHelper') axesVisible = obj.visible;
        });

        // Determine if we should show or hide all overlays
        const shouldShow = !gridVisible || !axesVisible;

        // Toggle grid
        if (this.app.setGridVisible) this.app.setGridVisible(shouldShow);

        // Toggle axes
        if (this.app.setAxesVisible) this.app.setAxesVisible(shouldShow);

        // Toggle other helpers (light helpers, etc.)
        this.app.scene.traverse(obj => {
            if (obj.type === 'LightHelper' || obj.type === 'CameraHelper' ||
                obj.type === 'DirectionalLightHelper' || obj.type === 'PointLightHelper' ||
                obj.type === 'SpotLightHelper' || obj.type === 'HemisphereLightHelper' ||
                obj.type.includes('LightHelper')) {
                obj.visible = shouldShow;
            }
        });

        // Update button active state
        const overlayBtn = document.getElementById('tool-toggle-overlays');
        if (overlayBtn) {
            if (shouldShow) {
                overlayBtn.classList.add('active');
                overlayBtn.querySelector('i').className = 'fas fa-eye';
            } else {
                overlayBtn.classList.remove('active');
                overlayBtn.querySelector('i').className = 'fas fa-eye-slash';
            }
        }

        // Show notification
        const action = shouldShow ? 'shown' : 'hidden';
        this.showNotification(`All overlays ${action}`, 'success');
    }

    // --- SCENE SETTINGS MODAL ---
    openSceneSettingsModal() {
        if (!this.sceneSettingsInitialized) {
            this.initSceneSettingsModal();
            this.sceneSettingsInitialized = true;
        }
        this.loadSceneSettingsToUI();
        this.sceneSettingsModal.classList.add('open');
    }

    closeSceneSettingsModal() {
        this.sceneSettingsModal.classList.remove('open');
    }

    initSceneSettingsModal() {
        // Initialize scene settings modal
        this.sceneSettingsModal = document.getElementById('scene-settings-modal');

        // Close button
        const closeBtn = document.getElementById('btn-scene-settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSceneSettingsModal());
        }

        // Reset button
        const resetBtn = document.getElementById('btn-scene-settings-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSceneSettings();
            });
        }

        // Apply button
        const applyBtn = document.getElementById('btn-scene-settings-apply');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySceneSettings();
                this.closeSceneSettingsModal();
            });
        }

        // Resolution dropdown change handler
        const resolutionDropdown = document.getElementById('setting-export-resolution');
        if (resolutionDropdown) {
            resolutionDropdown.addEventListener('change', (e) => {
                const customGroup = document.getElementById('custom-resolution-group');
                if (e.target.value === 'custom') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
            });
        }

        // Close on overlay click
        this.sceneSettingsModal.addEventListener('click', (e) => {
            if (e.target.id === 'scene-settings-modal') this.closeSceneSettingsModal();
        });
    }

    resetSceneSettings() {
        // Reset to default values from config or use hardcoded defaults
        const defaults = (typeof APP_DEFAULTS !== 'undefined' && APP_DEFAULTS.scene)
            ? APP_DEFAULTS.scene
            : {
                backgroundEnabled: true,
                backgroundColor: '#1a1a2e',
                ambientLight: true,
                ambientColor: '#ffffff',
                exportTransparent: false,
                exportResolution: '1920x1080',
                customWidth: 1920,
                customHeight: 1080
            };

        // Apply defaults to UI
        document.getElementById('setting-background-enabled').checked = defaults.backgroundEnabled;
        document.getElementById('setting-background-color').value = defaults.backgroundColor;
        document.getElementById('setting-ambient-light').checked = defaults.ambientLight;
        document.getElementById('setting-ambient-color').value = defaults.ambientColor;
        document.getElementById('setting-export-transparent').checked = defaults.exportTransparent;
        document.getElementById('setting-export-resolution').value = defaults.exportResolution;
        document.getElementById('setting-custom-width').value = defaults.customWidth;
        document.getElementById('setting-custom-height').value = defaults.customHeight;

        // Hide custom resolution group if not custom
        document.getElementById('custom-resolution-group').style.display = 'none';

        this.showNotification('Scene settings reset to defaults!', 'success');
    }

    loadSceneSettingsToUI() {
        const saved = localStorage.getItem('pixel3d-scene-settings');
        if (saved) {
            const settings = JSON.parse(saved);

            // Set UI values
            const bgEnabledEl = document.getElementById('setting-background-enabled');
            const bgColorEl = document.getElementById('setting-background-color');
            const ambientEl = document.getElementById('setting-ambient-light');
            const ambientColorEl = document.getElementById('setting-ambient-color');
            const transparentEl = document.getElementById('setting-export-transparent');
            const resolutionEl = document.getElementById('setting-export-resolution');
            const customWidthEl = document.getElementById('setting-custom-width');
            const customHeightEl = document.getElementById('setting-custom-height');

            if (bgEnabledEl) bgEnabledEl.checked = settings.backgroundEnabled !== false;
            if (bgColorEl) bgColorEl.value = settings.backgroundColor || '#1a1a2e';
            if (ambientEl) ambientEl.checked = settings.ambientLight !== false;
            if (ambientColorEl) ambientColorEl.value = settings.ambientColor || '#ffffff';
            if (transparentEl) transparentEl.checked = settings.exportTransparent !== false;
            if (resolutionEl) resolutionEl.value = settings.exportResolution || '1920x1080';
            if (customWidthEl) customWidthEl.value = settings.customWidth || 1920;
            if (customHeightEl) customHeightEl.value = settings.customHeight || 1080;

            // Update custom resolution group visibility
            const customGroup = document.getElementById('custom-resolution-group');
            if (customGroup && resolutionEl) {
                customGroup.style.display = resolutionEl.value === 'custom' ? 'block' : 'none';
            }
        }
    }

    applySceneSettings() {
        const settings = {
            backgroundEnabled: document.getElementById('setting-background-enabled').checked,
            backgroundColor: document.getElementById('setting-background-color').value,
            ambientLight: document.getElementById('setting-ambient-light').checked,
            ambientColor: document.getElementById('setting-ambient-color').value,
            exportTransparent: document.getElementById('setting-export-transparent').checked,
            exportResolution: document.getElementById('setting-export-resolution').value,
            customWidth: parseInt(document.getElementById('setting-custom-width').value),
            customHeight: parseInt(document.getElementById('setting-custom-height').value)
        };

        // Save settings
        localStorage.setItem('pixel3d-scene-settings', JSON.stringify(settings));

        // Apply settings to the scene
        if (this.app.setBackgroundColor) {
            this.app.setBackgroundColor(settings.backgroundEnabled ? settings.backgroundColor : null);
        }

        if (this.app.setAmbientLight) {
            this.app.setAmbientLight(settings.ambientLight, settings.ambientColor);
        }

        // Store export settings for later use
        window.exportSettings = {
            transparent: settings.exportTransparent,
            resolution: settings.exportResolution,
            customWidth: settings.customWidth,
            customHeight: settings.customHeight
        };

        this.showNotification('Scene settings applied successfully!', 'success');
    }

    toggleMaterialsView() {
        const materialsSection = document.getElementById('materials-section');
        const sceneSection = document.getElementById('scene-section');
        const propsContent = document.getElementById('props-content');
        const layersList = document.getElementById('layers-list');

        if (materialsSection && sceneSection && propsContent && layersList) {
            const isMaterialsVisible = materialsSection.style.display !== 'none';

            if (isMaterialsVisible) {
                // Switch to normal view
                materialsSection.style.display = 'none';
                sceneSection.style.display = 'none';
                propsContent.style.display = 'block';
                layersList.style.display = 'block';
                document.querySelectorAll('.panel-header').forEach(header => {
                    header.style.display = 'flex';
                });
            } else {
                // Switch to materials view
                materialsSection.style.display = 'flex';
                sceneSection.style.display = 'none';
                propsContent.style.display = 'none';
                layersList.style.display = 'none';
                document.querySelectorAll('.panel-header').forEach((header, index) => {
                    if (index === 2) { // Materials header
                        header.style.display = 'flex';
                    } else {
                        header.style.display = 'none';
                    }
                });
            }

            // Update materials content
            if (this.app.materialsManager) {
                this.app.materialsManager.renderMaterialsSection();
            }
        }
    }

    setupPanelTabs() {
        // Add event listeners for panel tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;

                // Remove active class from all tabs and content
                document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.panel-tab-content').forEach(content => content.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.querySelector(`.panel-tab-content[data-tab-content="${tabId}"]`).classList.add('active');

                // Update layer manager if switching to scene objects tab
                if (tabId === 'scene-objects' && this.app.layerManager) {
                    this.app.layerManager.render();
                }
            });
        });
    }

    initSettingsModal() {
        // This method is now handled by initUnifiedSettingsModal()
        // Redirect to the unified settings initialization
        if (!this.unifiedSettingsInitialized) {
            this.initUnifiedSettingsModal();
            this.unifiedSettingsInitialized = true;
        }
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
        const panel = document.getElementById('right-panel');
        if (panel && panel.classList.contains('hidden')) {
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
        const panel = document.getElementById('right-panel');
        const toggle = document.getElementById('panel-toggle');
        const workspace = document.querySelector('.workspace');

        if (!panel) return;

        const icon = toggle ? toggle.querySelector('i') : null;

        if (panel.classList.contains('hidden')) {
            // Show panel
            panel.classList.remove('hidden');
            if (toggle) toggle.classList.remove('panel-hidden');
            if (workspace) workspace.classList.remove('panel-hidden');
            if (icon) icon.className = 'fas fa-chevron-right';
            if (toggle) toggle.title = 'Hide Panel';

            // Reset to default view when showing panel
            this.resetPanelToDefault();
        } else {
            // Hide panel
            panel.classList.add('hidden');
            if (toggle) toggle.classList.add('panel-hidden');
            if (workspace) workspace.classList.add('panel-hidden');
            if (icon) icon.className = 'fas fa-chevron-left';
            if (toggle) toggle.title = 'Show Panel';
        }

        // Trigger resize to update 3D renderer
        setTimeout(() => {
            if (this.app.onWindowResize) {
                this.app.onWindowResize();
            }
        }, 300); // Wait for CSS transition to complete
    }

    resetPanelToDefault() {
        // Show scene objects and properties, hide materials and scene export
        const sceneSection = document.getElementById('scene-section');
        const materialsSection = document.getElementById('materials-section');
        const propsContent = document.getElementById('props-content');
        const layersList = document.getElementById('layers-list');

        if (sceneSection) sceneSection.style.display = 'none';
        if (materialsSection) materialsSection.style.display = 'none';
        if (propsContent) propsContent.style.display = 'block';
        if (layersList) layersList.style.display = 'block';

        // Show all panel headers
        document.querySelectorAll('.panel-header').forEach(header => {
            header.style.display = 'flex';
        });
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
            // Apply autosave
            if (this.app.fileManager && this.app.fileManager.setAutosaveEnabled) {
                this.app.fileManager.setAutosaveEnabled(settings.autosave !== false);
                if (this.app.fileManager.setAutosaveInterval) {
                    this.app.fileManager.setAutosaveInterval(settings.autosaveInterval || 5);
                }
            }
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
            const autosaveEl = document.getElementById('setting-autosave');
            const autosaveIntervalEl = document.getElementById('setting-autosave-interval');
            const autosaveIntervalValueEl = document.getElementById('autosave-interval-value');
    
            if (gridEl) gridEl.checked = settings.grid !== false;
            if (axesEl) axesEl.checked = settings.axes !== false;
            if (snapEl) snapEl.checked = settings.snap !== false;
            if (tooltipsEl) tooltipsEl.checked = settings.tooltips !== false;
            if (speedEl) {
                speedEl.value = settings.cameraSpeed || 1;
                if (speedValueEl) speedValueEl.textContent = settings.cameraSpeed || 1;
            }
            if (autosaveEl) autosaveEl.checked = settings.autosave !== false;
            if (autosaveIntervalEl) {
                autosaveIntervalEl.value = settings.autosaveInterval || 5;
                if (autosaveIntervalValueEl) autosaveIntervalValueEl.textContent = settings.autosaveInterval || 5;
            }
        }
    }


    saveSettings() {
        const settings = {
            grid: document.getElementById('setting-grid').checked,
            axes: document.getElementById('setting-axes').checked,
            snap: document.getElementById('setting-snap').checked,
            tooltips: document.getElementById('setting-tooltips').checked,
            cameraSpeed: parseFloat(document.getElementById('setting-camera-speed').value),
            autosave: document.getElementById('setting-autosave').checked,
            autosaveInterval: parseInt(document.getElementById('setting-autosave-interval').value)
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
        // Use config defaults
        const defaults = {
            grid: true,
            axes: true,
            snap: true,
            tooltips: true,
            cameraSpeed: 1,
            autosave: false,
            autosaveInterval: 5
        };

        // If config is available, use its defaults
        if (typeof APP_DEFAULTS !== 'undefined') {
            defaults.grid = APP_DEFAULTS.ui.gridVisible;
            defaults.axes = APP_DEFAULTS.ui.axesVisible;
            defaults.snap = APP_DEFAULTS.ui.snapEnabled;
            defaults.tooltips = APP_DEFAULTS.ui.tooltipsEnabled;
            defaults.cameraSpeed = APP_DEFAULTS.ui.cameraSpeed;
            defaults.autosave = APP_DEFAULTS.ui.autosaveEnabled;
            defaults.autosaveInterval = APP_DEFAULTS.ui.autosaveInterval;
        }

        // Save reset
        localStorage.setItem('pixel3d-settings', JSON.stringify(defaults));

        // Apply immediately
        if (this.app.setGridVisible) this.app.setGridVisible(true);
        if (this.app.setAxesVisible) this.app.setAxesVisible(true);
        if (this.app.setSnapEnabled) this.app.setSnapEnabled(true);
        if (this.app.setCameraSpeed) this.app.setCameraSpeed(1);

        window.tooltipsEnabled = true;
        // Apply autosave
        if (this.app.fileManager && this.app.fileManager.setAutosaveEnabled) {
            this.app.fileManager.setAutosaveEnabled(false);
            if (this.app.fileManager.setAutosaveInterval) {
                this.app.fileManager.setAutosaveInterval(5);
            }
        }

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
            // Add Materials Selector
            this.addMaterialsSelector(obj, targetMesh);

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

            // Add PBR Material Properties (Metallic and Roughness)
            this.addMaterialProperties(obj, targetMesh);
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

    // Add PBR Material Properties (Metallic and Roughness)
    addMaterialProperties(obj, targetMesh) {
        // Create material properties group
        const materialGroup = document.createElement('div');
        materialGroup.className = 'property-group';
        materialGroup.innerHTML = `<div class="property-label">Material Properties (PBR)</div>`;

        // Metallic property
        const metallicRow = document.createElement('div');
        metallicRow.className = 'input-row';
        metallicRow.style.marginBottom = '4px';

        const metallicLabel = document.createElement('span');
        metallicLabel.style.fontSize = '0.65rem';
        metallicLabel.style.color = 'var(--text-secondary)';
        metallicLabel.style.width = '60px';
        metallicLabel.textContent = 'Metallic:';
        metallicRow.appendChild(metallicLabel);

        const metallicInput = document.createElement('input');
        metallicInput.type = 'range';
        metallicInput.min = '0';
        metallicInput.max = '1';
        metallicInput.step = '0.01';
        metallicInput.style.flex = '1';

        // Add info button for metallic
        const metallicInfo = document.createElement('i');
        metallicInfo.className = 'fas fa-info-circle material-info-btn';
        metallicInfo.title = 'Metallic: Controls how metallic the surface appears (0 = non-metal, 1 = fully metallic). Affects reflectivity and edge sharpness.';
        metallicInfo.style.marginLeft = '4px';
        metallicInfo.style.cursor = 'help';
        metallicInfo.style.color = 'var(--text-secondary)';
        metallicInfo.style.fontSize = '0.7rem';
        metallicRow.appendChild(metallicInfo);

        // Initialize metallic value (default to 0 if not set)
        const currentMetallic = targetMesh.material.metalness !== undefined
            ? targetMesh.material.metalness
            : 0;
        metallicInput.value = currentMetallic;

        metallicInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (obj.userData.type === 'figure') {
                // Apply to whole figure
                obj.traverse(c => {
                    if (c.isMesh && c.material) {
                        c.material.metalness = value;
                    }
                });
            } else {
                targetMesh.material.metalness = value;
            }
        });

        metallicRow.appendChild(metallicInput);
        materialGroup.appendChild(metallicRow);

        // Roughness property
        const roughnessRow = document.createElement('div');
        roughnessRow.className = 'input-row';

        const roughnessLabel = document.createElement('span');
        roughnessLabel.style.fontSize = '0.65rem';
        roughnessLabel.style.color = 'var(--text-secondary)';
        roughnessLabel.style.width = '60px';
        roughnessLabel.textContent = 'Roughness:';
        roughnessRow.appendChild(roughnessLabel);

        const roughnessInput = document.createElement('input');
        roughnessInput.type = 'range';
        roughnessInput.min = '0';
        roughnessInput.max = '1';
        roughnessInput.step = '0.01';
        roughnessInput.style.flex = '1';

        // Add info button for roughness
        const roughnessInfo = document.createElement('i');
        roughnessInfo.className = 'fas fa-info-circle material-info-btn';
        roughnessInfo.title = 'Roughness: Controls surface smoothness (0 = perfectly smooth/mirror-like, 1 = very rough). Affects how light scatters across the surface.';
        roughnessInfo.style.marginLeft = '4px';
        roughnessInfo.style.cursor = 'help';
        roughnessInfo.style.color = 'var(--text-secondary)';
        roughnessInfo.style.fontSize = '0.7rem';
        roughnessRow.appendChild(roughnessInfo);

        // Initialize roughness value (default to 0.5 if not set)
        const currentRoughness = targetMesh.material.roughness !== undefined
            ? targetMesh.material.roughness
            : 0.5;
        roughnessInput.value = currentRoughness;

        roughnessInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (obj.userData.type === 'figure') {
                // Apply to whole figure
                obj.traverse(c => {
                    if (c.isMesh && c.material) {
                        c.material.roughness = value;
                    }
                });
            } else {
                targetMesh.material.roughness = value;
            }
        });

        roughnessRow.appendChild(roughnessInput);
        materialGroup.appendChild(roughnessRow);

        this.propsContent.appendChild(materialGroup);
    }

    // Add Materials Selector to Properties Panel
    addMaterialsSelector(obj, targetMesh) {
        if (!this.app.materialsManager) return;

        const materialsGroup = document.createElement('div');
        materialsGroup.className = 'property-group';

        // Create materials selector header
        const selectorHeader = document.createElement('div');
        selectorHeader.style.display = 'flex';
        selectorHeader.style.justifyContent = 'space-between';
        selectorHeader.style.alignItems = 'center';
        selectorHeader.style.marginBottom = '6px';

        const selectorLabel = document.createElement('div');
        selectorLabel.className = 'property-label';
        selectorLabel.textContent = 'Material';
        selectorHeader.appendChild(selectorLabel);

        // Add create new material button
        const createMaterialBtn = document.createElement('button');
        createMaterialBtn.className = 'btn folder-btn';
        createMaterialBtn.style.fontSize = '0.6rem';
        createMaterialBtn.style.padding = '2px 4px';
        createMaterialBtn.innerHTML = '<i class="fas fa-plus" style="font-size: 0.7rem;"></i>';
        createMaterialBtn.title = 'Create New Material';
        createMaterialBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.materialsManager.createNewMaterial();
        });
        selectorHeader.appendChild(createMaterialBtn);

        materialsGroup.appendChild(selectorHeader);

        // Create materials dropdown
        const materialsDropdown = document.createElement('select');
        materialsDropdown.className = 'material-selector';
        materialsDropdown.style.width = '100%';
        materialsDropdown.style.padding = '4px';
        materialsDropdown.style.fontSize = '0.7rem';
        materialsDropdown.style.background = 'var(--bg-light)';
        materialsDropdown.style.border = '1px solid var(--border-color)';
        materialsDropdown.style.borderRadius = '4px';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a material...';
        materialsDropdown.appendChild(defaultOption);

        // Add materials from materials manager
        this.app.materialsManager.materials.forEach(material => {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = `${material.name} (M:${material.metalness.toFixed(1)}, R:${material.roughness.toFixed(1)})`;
            materialsDropdown.appendChild(option);
        });

        // Add event listener for material selection
        materialsDropdown.addEventListener('change', (e) => {
            const materialId = e.target.value;
            if (materialId) {
                const material = this.app.materialsManager.materials.find(m => m.id === materialId);
                if (material) {
                    this.app.materialsManager.applyMaterialToSelected(material);
                }
            }
        });

        materialsGroup.appendChild(materialsDropdown);
        this.propsContent.appendChild(materialsGroup);
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

    // --- SCENE PANEL VIEW ---
    toggleSceneView() {
        const sceneSection = document.getElementById('scene-section');
        const materialsSection = document.getElementById('materials-section');
        const propsContent = document.getElementById('props-content');
        const layersList = document.getElementById('layers-list');

        if (sceneSection && materialsSection && propsContent && layersList) {
            const isSceneVisible = sceneSection.style.display !== 'none';

            if (isSceneVisible) {
                // Switch to normal view
                sceneSection.style.display = 'none';
                materialsSection.style.display = 'none';
                propsContent.style.display = 'block';
                layersList.style.display = 'block';
                document.querySelectorAll('.panel-header').forEach(header => {
                    header.style.display = 'flex';
                });
            } else {
                // Switch to scene view
                sceneSection.style.display = 'flex';
                materialsSection.style.display = 'none';
                propsContent.style.display = 'none';
                layersList.style.display = 'none';
                document.querySelectorAll('.panel-header').forEach((header, index) => {
                    if (index === 2) { // Scene header
                        header.style.display = 'flex';
                    } else {
                        header.style.display = 'none';
                    }
                });
            }

            // Initialize scene export functionality
            this.initSceneExport();
        }
    }

    initSceneExport() {
        // Initialize export button
        const exportBtn = document.getElementById('btn-export-png');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSceneAsPNG();
            });
        }

        // Initialize camera border toggle
        const borderToggle = document.getElementById('show-camera-border');
        if (borderToggle) {
            borderToggle.addEventListener('change', (e) => {
                this.toggleCameraBorder(e.target.checked);
            });
        }

        // Initialize canvas size controls
        const resolutionDropdown = document.getElementById('export-resolution');
        if (resolutionDropdown) {
            resolutionDropdown.addEventListener('change', () => this.updateCameraBorderFromDropdown());
        }

        // Initialize camera border visualization
        this.updateCameraBorder();

        // Make camera border preview draggable
        this.makeCameraBorderDraggable();
    }

    makeCameraBorderDraggable() {
        const preview = document.getElementById('camera-border-preview');
        if (!preview) return;

        let isDragging = false;
        let startX, startY;
        let initialX, initialY;

        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.style.position = 'absolute';
        dragHandle.style.top = '10px';
        dragHandle.style.right = '10px';
        dragHandle.style.width = '24px';
        dragHandle.style.height = '24px';
        dragHandle.style.background = 'var(--bg-medium)';
        dragHandle.style.border = '1px solid var(--border-color)';
        dragHandle.style.borderRadius = '4px';
        dragHandle.style.cursor = 'move';
        dragHandle.style.display = 'flex';
        dragHandle.style.alignItems = 'center';
        dragHandle.style.justifyContent = 'center';
        dragHandle.style.fontSize = '0.8rem';
        dragHandle.style.color = 'var(--text-secondary)';
        dragHandle.innerHTML = '📷';
        dragHandle.title = 'Drag to position camera border';
        preview.appendChild(dragHandle);

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.bottom = '0';
        resizeHandle.style.left = '0';
        resizeHandle.style.width = '16px';
        resizeHandle.style.height = '16px';
        resizeHandle.style.background = 'var(--bg-medium)';
        resizeHandle.style.border = '1px solid var(--border-color)';
        resizeHandle.style.borderRadius = '0 0 4px 0';
        resizeHandle.style.cursor = 'nwse-resize';
        resizeHandle.style.transform = 'translate(-50%, 50%)';
        resizeHandle.title = 'Drag to resize camera border';
        preview.appendChild(resizeHandle);

        // Add resize functionality
        let isResizing = false;
        let resizeStartX, resizeStartY;
        let resizeStartWidth, resizeStartHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = preview.offsetWidth;
            startHeight = preview.offsetHeight;

            // Add resizing class
            preview.style.opacity = '0.8';
            preview.style.cursor = 'nwse-resize';
            preview.style.userSelect = 'none';

            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Calculate new dimensions while maintaining aspect ratio
            const aspectRatio = startWidth / startHeight;
            let newWidth = startWidth + dx;
            let newHeight = newWidth / aspectRatio;

            // Apply minimum size constraints
            const minSize = 50;
            newWidth = Math.max(minSize, newWidth);
            newHeight = Math.max(minSize * aspectRatio, newHeight);

            // Apply new dimensions
            preview.style.width = `${newWidth}px`;
            preview.style.height = `${newHeight}px`;

            // Update the canvas size inputs to match the new dimensions
            const widthInput = document.getElementById('export-width');
            const heightInput = document.getElementById('export-height');
            if (widthInput && heightInput) {
                widthInput.value = Math.round(newWidth);
                heightInput.value = Math.round(newHeight);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                preview.style.opacity = '1';
                preview.style.cursor = 'move';

                // Update the camera border preview content
                const width = preview.offsetWidth;
                const height = preview.offsetHeight;
                const aspectRatio = width / height;

                preview.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem;">
                        <div>Camera Border Preview</div>
                        <div style="margin-top: 8px; font-size: 0.7rem;">${Math.round(width)} × ${Math.round(height)}</div>
                        <div style="margin-top: 4px; font-size: 0.6rem;">Aspect Ratio: ${aspectRatio.toFixed(2)}</div>
                    </div>
                `;

                // Re-add drag and resize handles
                this.makeCameraBorderDraggable();
            }
        });

        // Mouse down event
        preview.addEventListener('mousedown', (e) => {
            if (e.target === dragHandle || e.target === preview) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;

                // Get current position
                const rect = preview.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;

                // Add dragging class
                preview.style.opacity = '0.8';
                preview.style.cursor = 'grabbing';
                preview.style.userSelect = 'none';
                preview.style.pointerEvents = 'none';

                e.preventDefault();
            }
        });

        // Mouse move event
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Calculate new position
            let newX = initialX + dx;
            let newY = initialY + dy;

            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Get preview dimensions
            const previewWidth = preview.offsetWidth;
            const previewHeight = preview.offsetHeight;

            // Constrain to viewport
            newX = Math.max(0, Math.min(newX, viewportWidth - previewWidth));
            newY = Math.max(0, Math.min(newY, viewportHeight - previewHeight));

            // Apply position
            preview.style.position = 'fixed';
            preview.style.left = `${newX}px`;
            preview.style.top = `${newY}px`;
            preview.style.zIndex = '10000';
        });

        // Mouse up event
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                preview.style.opacity = '1';
                preview.style.cursor = 'move';
                preview.style.userSelect = '';
                preview.style.pointerEvents = '';

                // Store position for persistence
                const position = {
                    x: parseFloat(preview.style.left) || 0,
                    y: parseFloat(preview.style.top) || 0
                };
                localStorage.setItem('cameraBorderPosition', JSON.stringify(position));
            }
        });

        // Load saved position
        const savedPosition = localStorage.getItem('cameraBorderPosition');
        if (savedPosition) {
            const pos = JSON.parse(savedPosition);
            preview.style.position = 'fixed';
            preview.style.left = `${pos.x}px`;
            preview.style.top = `${pos.y}px`;
            preview.style.zIndex = '10000';
        }
    }

    exportSceneAsPNG() {
        const width = parseInt(document.getElementById('export-width').value);
        const height = parseInt(document.getElementById('export-height').value);

        // Ensure renderer has preserveDrawingBuffer enabled
        if (this.app.renderer) {
            // Save current canvas size
            const originalWidth = this.app.renderer.domElement.width;
            const originalHeight = this.app.renderer.domElement.height;

            // Set renderer to export size and render
            this.app.renderer.setSize(width, height);
            this.app.renderer.render(this.app.scene, this.app.camera);

            // Get the canvas element and extract PNG data
            const canvas = this.app.renderer.domElement;
            const pngData = canvas.toDataURL('image/png');

            // Create download link
            const link = document.createElement('a');
            link.href = pngData;
            link.download = 'scene-export.png';
            link.click();

            // Restore original canvas size
            this.app.renderer.setSize(originalWidth, originalHeight);

            this.showNotification('Scene exported as PNG!', 'success');
        } else {
            this.showNotification('Error: Renderer not available', 'error');
        }
        
    }
    
    // Camera zoom methods
    zoomCamera(factor) {
        if (this.app.camera) {
            // Get current zoom level from slider
            const slider = document.getElementById('zoom-slider');
            let currentZoom = slider ? parseFloat(slider.value) : 50;

            // Apply zoom factor
            currentZoom *= factor;

            // Constrain to valid range
            currentZoom = Math.max(1, Math.min(100, currentZoom));

            // Update slider
            if (slider) {
                slider.value = currentZoom;
            }

            // Apply zoom to camera
            this.setCameraZoom(currentZoom);
        }
    }

    setCameraZoom(zoomLevel) {
        if (this.app.camera && this.app.cameraManager) {
            // Convert zoom level to camera position
            const zoomFactor = zoomLevel / 50; // 50 = neutral zoom
            this.app.cameraManager.setCameraZoom(zoomFactor);

            // Update the zoom display if needed
            this.updateZoomDisplay(zoomLevel);
        }
    }

    updateZoomDisplay(zoomLevel) {
        // You could add visual feedback here if needed
        console.log(`Zoom level: ${zoomLevel}`);
    }
    
    // Camera zoom methods
    zoomCamera(factor) {
        if (this.app.camera) {
            // Get current zoom level from slider
            const slider = document.getElementById('zoom-slider');
            let currentZoom = slider ? parseFloat(slider.value) : 50;

            // Apply zoom factor
            currentZoom *= factor;

            // Constrain to valid range
            currentZoom = Math.max(1, Math.min(100, currentZoom));

            // Update slider
            if (slider) {
                slider.value = currentZoom;
            }

            // Apply zoom to camera
            this.setCameraZoom(currentZoom);
        }
    }
    
    setCameraZoom(zoomLevel) {
        if (this.app.camera && this.app.cameraManager) {
            // Convert zoom level to camera position
            const zoomFactor = zoomLevel / 50; // 50 = neutral zoom
            this.app.cameraManager.setCameraZoom(zoomFactor);

            // Update the zoom display if needed
            this.updateZoomDisplay(zoomLevel);
        }
    }
    
    updateZoomDisplay(zoomLevel) {
        // You could add visual feedback here if needed
        console.log(`Zoom level: ${zoomLevel}`);
    }


    toggleCameraBorder(show) {
        const preview = document.getElementById('camera-border-preview');
        if (preview) {
            if (show) {
                preview.style.display = 'flex';
                this.updateCameraBorder();
            } else {
                preview.style.display = 'none';
            }
        }
    }

    updateCameraBorder() {
        const width = parseInt(document.getElementById('export-width')?.value || 1920);
        const height = parseInt(document.getElementById('export-height')?.value || 1080);
        const preview = document.getElementById('camera-border-preview');

        if (preview) {
            // Update preview dimensions
            const aspectRatio = width / height;
            const maxWidth = preview.parentElement.clientWidth;
            const maxHeight = 200;

            let displayWidth, displayHeight;
            if (aspectRatio > 1) {
                displayWidth = maxWidth;
                displayHeight = maxWidth / aspectRatio;
            } else {
                displayHeight = maxHeight;
                displayWidth = maxHeight * aspectRatio;
            }

            preview.style.width = `${displayWidth}px`;
            preview.style.height = `${displayHeight}px`;

            // Update preview content
            preview.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem;">
                    <div>Camera Border Preview</div>
                    <div style="margin-top: 8px; font-size: 0.7rem;">${width} × ${height}</div>
                    <div style="margin-top: 4px; font-size: 0.6rem;">Aspect Ratio: ${aspectRatio.toFixed(2)}</div>
                </div>
            `;

            // Re-add drag handle
            this.makeCameraBorderDraggable();
        }
    }

    updateCameraBorderFromDropdown() {
        const resolutionDropdown = document.getElementById('export-resolution');
        if (!resolutionDropdown) return;

        const selectedValue = resolutionDropdown.value;
        let width, height;

        if (selectedValue === 'custom') {
            // Show custom inputs if they exist
            const customGroup = document.getElementById('custom-resolution-group');
            if (customGroup) {
                customGroup.style.display = 'block';
            }
            // Use default values or existing custom values
            width = parseInt(document.getElementById('export-width')?.value || 1920);
            height = parseInt(document.getElementById('export-height')?.value || 1080);
        } else {
            // Hide custom inputs if they exist
            const customGroup = document.getElementById('custom-resolution-group');
            if (customGroup) {
                customGroup.style.display = 'none';
            }

            // Parse the selected resolution
            const parts = selectedValue.split('x');
            width = parseInt(parts[0]);
            height = parseInt(parts[1]);
        }

        // Update the camera border preview
        this.updateCameraBorderWithDimensions(width, height);
    }

    updateCameraBorderWithDimensions(width, height) {
        const preview = document.getElementById('camera-border-preview');

        if (preview) {
            // Update preview dimensions
            const aspectRatio = width / height;
            const maxWidth = preview.parentElement.clientWidth;
            const maxHeight = 200;

            let displayWidth, displayHeight;
            if (aspectRatio > 1) {
                displayWidth = maxWidth;
                displayHeight = maxWidth / aspectRatio;
            } else {
                displayHeight = maxHeight;
                displayWidth = maxHeight * aspectRatio;
            }

            preview.style.width = `${displayWidth}px`;
            preview.style.height = `${displayHeight}px`;

            // Update preview content
            preview.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem;">
                    <div>Camera Border Preview</div>
                    <div style="margin-top: 8px; font-size: 0.7rem;">${width} × ${height}</div>
                    <div style="margin-top: 4px; font-size: 0.6rem;">Aspect Ratio: ${aspectRatio.toFixed(2)}</div>
                </div>
            `;

            // Re-add drag handle
            this.makeCameraBorderDraggable();
        }
    }

    // --- UNIFIED SETTINGS MODAL ---
    openUnifiedSettingsModal(initialTab = 'general') {
        if (!this.unifiedSettingsInitialized) {
            this.initUnifiedSettingsModal();
            this.unifiedSettingsInitialized = true;
        }

        // Switch to the requested tab
        this.switchSettingsTab(initialTab);

        this.unifiedSettingsModal.classList.add('open');
    }

    closeUnifiedSettingsModal() {
        this.unifiedSettingsModal.classList.remove('open');
    }

    initUnifiedSettingsModal() {
        // Initialize unified settings modal
        this.unifiedSettingsModal = document.getElementById('unified-settings-modal');

        // Close button
        const closeBtn = document.getElementById('btn-settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeUnifiedSettingsModal());
        }

        // Reset button
        const resetBtn = document.getElementById('btn-settings-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        // Save button
        const saveBtn = document.getElementById('btn-settings-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.closeUnifiedSettingsModal();
            });
        }

        // Tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchSettingsTab(tab.dataset.tab);
            });
        });

        // Resolution dropdown change handler
        const resolutionDropdown = document.getElementById('setting-export-resolution');
        if (resolutionDropdown) {
            resolutionDropdown.addEventListener('change', (e) => {
                const customGroup = document.getElementById('custom-resolution-group');
                if (e.target.value === 'custom') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
            });
        }

        // Close on overlay click
        this.unifiedSettingsModal.addEventListener('click', (e) => {
            if (e.target.id === 'unified-settings-modal') this.closeUnifiedSettingsModal();
        });
    }

    switchSettingsTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to selected tab and content
        const activeTab = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
        const activeContent = document.querySelector(`.settings-tab-content[data-tab-content="${tabName}"]`);

        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }
}