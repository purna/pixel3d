
export class MaterialsManager {
    constructor(app) {
        this.app = app;
        this.materials = [];
        this.selectedMaterial = null;
        this.container = document.getElementById('materials-content');
        this.materialsSectionContainer = document.getElementById('materials-section');
        this.init();
    }

    init() {
        // Create default materials
        this.createDefaultMaterials();
    }

    createDefaultMaterials() {
        // Create some default materials
        this.createMaterial('Default', 0x00ff41, 0.2, 0.3);
        this.createMaterial('Metallic', 0x888888, 0.8, 0.1);
        this.createMaterial('Rough Plastic', 0xff5555, 0.0, 0.8);
        this.createMaterial('Smooth Plastic', 0x5555ff, 0.0, 0.2);
        this.createMaterial('Gold', 0xffd700, 1.0, 0.1);
        this.createMaterial('Rusty Metal', 0x8b4513, 0.7, 0.6);

        this.render();
    }

    createMaterial(name, color, metalness, roughness) {
        const material = {
            id: 'mat-' + Date.now(),
            name: name,
            color: color,
            metalness: metalness,
            roughness: roughness,
            objectsUsing: [] // Track which objects use this material
        };
        this.materials.push(material);
        return material;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        // Add create material button
        const createBtn = document.createElement('button');
        createBtn.className = 'btn primary';
        createBtn.style.marginBottom = '10px';
        createBtn.style.width = '100%';
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Create Material';
        createBtn.addEventListener('click', () => this.createNewMaterial());
        this.container.appendChild(createBtn);

        // Render each material
        this.materials.forEach(material => {
            const materialEl = document.createElement('div');
            materialEl.className = 'material-item';
            materialEl.dataset.materialId = material.id;
            if (this.selectedMaterial === material) {
                materialEl.classList.add('selected');
            }

            materialEl.innerHTML = `
                <div class="material-preview" style="background-color: #${material.color.toString(16).padStart(6, '0')}" title="Used by: ${material.objectsUsing.length} objects"></div>
                <div class="material-info">
                    <input type="text" class="material-name" value="${material.name}">
                    <div class="material-properties">
                        <span class="material-prop">M: ${material.metalness.toFixed(1)}</span>
                        <span class="material-prop">R: ${material.roughness.toFixed(1)}</span>
                    </div>
                </div>
                <div class="material-actions">
                    <button class="btn apply-material-btn" title="Apply to Selected"><i class="fas fa-check"></i></button>
                    <button class="btn edit-material-btn" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn delete-material-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;

            // Add event listeners
            materialEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('material-name') ||
                    e.target.classList.contains('apply-material-btn') ||
                    e.target.classList.contains('edit-material-btn') ||
                    e.target.classList.contains('delete-material-btn')) {
                    return; // Let specific handlers handle these
                }
                this.selectMaterial(material);
            });

            // Material name editing
            const nameInput = materialEl.querySelector('.material-name');
            nameInput.addEventListener('change', (e) => {
                material.name = e.target.value;
            });
            nameInput.addEventListener('click', (e) => e.stopPropagation());

            // Apply material button
            materialEl.querySelector('.apply-material-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyMaterialToSelected(material);
            });

            // Edit material button
            materialEl.querySelector('.edit-material-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editMaterial(material);
            });

            // Delete material button
            materialEl.querySelector('.delete-material-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMaterial(material);
            });

            this.container.appendChild(materialEl);
        });
    }

    createNewMaterial() {
        // Use config defaults if available
        const defaults = {
            name: 'New Material',
            color: 0x00ff41,
            metalness: 0.2,
            roughness: 0.3
        };

        // Override with config defaults if available
        if (typeof APP_DEFAULTS !== 'undefined') {
            defaults.name = APP_DEFAULTS.materials.defaultMaterialName;
            defaults.color = parseInt(APP_DEFAULTS.materials.defaultColor.substring(1), 16);
            defaults.metalness = APP_DEFAULTS.materials.defaultMetalness;
            defaults.roughness = APP_DEFAULTS.materials.defaultRoughness;
        }

        // Show edit dialog with defaults
        this.showCreateMaterialDialog(defaults);
    }

    showCreateMaterialDialog(defaults) {
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'material-edit-dialog';
        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>Create New Material</h3>
                <button class="close-dialog-btn">&times;</button>
            </div>
            <div class="dialog-content">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="new-material-name" value="${defaults.name}">
                </div>
                <div class="form-group">
                    <label>Color:</label>
                    <input type="color" id="new-material-color" value="#${defaults.color.toString(16).padStart(6, '0')}">
                </div>
                <div class="form-group">
                    <label>Metalness: ${defaults.metalness.toFixed(2)}</label>
                    <input type="range" id="new-material-metalness" min="0" max="1" step="0.01" value="${defaults.metalness}">
                </div>
                <div class="form-group">
                    <label>Roughness: ${defaults.roughness.toFixed(2)}</label>
                    <input type="range" id="new-material-roughness" min="0" max="1" step="0.01" value="${defaults.roughness}">
                </div>
            </div>
            <div class="dialog-actions">
                <button class="btn" id="cancel-create-material">Cancel</button>
                <button class="btn primary" id="save-create-material">Create</button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add event listeners
        dialog.querySelector('.close-dialog-btn').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#cancel-create-material').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#save-create-material').addEventListener('click', () => {
            // Save new material
            const nameInput = dialog.querySelector('#new-material-name');
            const colorInput = dialog.querySelector('#new-material-color');
            const metalnessInput = dialog.querySelector('#new-material-metalness');
            const roughnessInput = dialog.querySelector('#new-material-roughness');

            // Parse color
            let colorValue = colorInput.value;
            if (colorValue.startsWith('#')) {
                colorValue = parseInt(colorValue.substring(1), 16);
            }

            this.createMaterial(
                nameInput.value,
                colorValue,
                parseFloat(metalnessInput.value),
                parseFloat(roughnessInput.value)
            );

            dialog.remove();
            this.render();
            this.app.ui.showNotification('Material created successfully!', 'success');
        });
    }

    selectMaterial(material) {
        this.selectedMaterial = material;
        this.render();
    }

    applyMaterialToSelected(material) {
        if (!this.app.selectedObject) {
            this.app.ui.showNotification('No object selected!', 'error');
            return;
        }

        const obj = this.app.selectedObject;
        let targetMesh = null;

        if (obj.userData.type === 'shape') {
            targetMesh = obj;
        } else if (obj.userData.name && obj.parent.userData.name && obj.parent.userData.name.includes('Joint')) {
            // Figure part
            targetMesh = obj.children.find(c => c.isMesh);
        } else if (obj.userData.type === 'figure') {
            // Apply to whole figure
            obj.traverse(c => {
                if (c.isMesh && c.material) {
                    c.material.color.setHex(material.color);
                    c.material.metalness = material.metalness;
                    c.material.roughness = material.roughness;
                }
            });
            return;
        }

        if (targetMesh && targetMesh.material) {
            targetMesh.material.color.setHex(material.color);
            targetMesh.material.metalness = material.metalness;
            targetMesh.material.roughness = material.roughness;

            // Add to objects using this material
            if (!material.objectsUsing.includes(obj)) {
                material.objectsUsing.push(obj);
            }

            this.app.ui.showNotification(`Applied material to ${obj.userData.name || obj.userData.type}`, 'success');

            // Update the UI to reflect the new material properties
            if (this.app.ui && this.app.ui.updateMaterialPropertiesUI) {
                this.app.ui.updateMaterialPropertiesUI(material, targetMesh);
            }
        }
    }

    editMaterial(material) {
        // Show edit dialog
        const dialog = document.createElement('div');
        dialog.className = 'material-edit-dialog';
        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>Edit Material: ${material.name}</h3>
                <button class="close-dialog-btn">&times;</button>
            </div>
            <div class="dialog-content">
                <div class="form-group">
                    <label>Color:</label>
                    <input type="color" id="edit-material-color" value="#${material.color.toString(16).padStart(6, '0')}">
                </div>
                <div class="form-group">
                    <label>Metalness: ${material.metalness.toFixed(2)}</label>
                    <input type="range" id="edit-material-metalness" min="0" max="1" step="0.01" value="${material.metalness}">
                </div>
                <div class="form-group">
                    <label>Roughness: ${material.roughness.toFixed(2)}</label>
                    <input type="range" id="edit-material-roughness" min="0" max="1" step="0.01" value="${material.roughness}">
                </div>
            </div>
            <div class="dialog-actions">
                <button class="btn" id="cancel-edit-material">Cancel</button>
                <button class="btn primary" id="save-edit-material">Save</button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add event listeners
        dialog.querySelector('.close-dialog-btn').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#cancel-edit-material').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#save-edit-material').addEventListener('click', () => {
            // Save changes
            const colorInput = dialog.querySelector('#edit-material-color');
            const metalnessInput = dialog.querySelector('#edit-material-metalness');
            const roughnessInput = dialog.querySelector('#edit-material-roughness');

            // Parse color
            let colorValue = colorInput.value;
            if (colorValue.startsWith('#')) {
                colorValue = parseInt(colorValue.substring(1), 16);
            }

            material.color = colorValue;
            material.metalness = parseFloat(metalnessInput.value);
            material.roughness = parseFloat(roughnessInput.value);

            // Update all objects using this material
            material.objectsUsing.forEach(obj => {
                if (obj.userData.type === 'figure') {
                    obj.traverse(c => {
                        if (c.isMesh && c.material) {
                            c.material.color.setHex(material.color);
                            c.material.metalness = material.metalness;
                            c.material.roughness = material.roughness;
                        }
                    });
                } else if (obj.isMesh && obj.material) {
                    obj.material.color.setHex(material.color);
                    obj.material.metalness = material.metalness;
                    obj.material.roughness = material.roughness;
                }
            });

            dialog.remove();
            this.render();
            this.app.ui.showNotification('Material updated successfully!', 'success');
        });
    }

    deleteMaterial(material) {
        if (material.objectsUsing.length > 0) {
            const confirmDelete = confirm(`This material is used by ${material.objectsUsing.length} objects. Delete anyway?`);
            if (!confirmDelete) return;
        }

        const index = this.materials.indexOf(material);
        if (index > -1) {
            this.materials.splice(index, 1);
            if (this.selectedMaterial === material) {
                this.selectedMaterial = null;
            }
            this.render();
        }
    }

    // Render materials for the materials section (full view)
    renderMaterialsSection() {
        if (!this.materialsSectionContainer) return;

        const materialsContent = this.materialsSectionContainer.querySelector('.panel-content');
        if (!materialsContent) return;

        materialsContent.innerHTML = '';

        // Add create material button
        const createBtn = document.createElement('button');
        createBtn.className = 'btn primary';
        createBtn.style.marginBottom = '12px';
        createBtn.style.width = '100%';
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Create Material';
        createBtn.addEventListener('click', () => this.createNewMaterial());
        materialsContent.appendChild(createBtn);

        // Render each material with more details
        this.materials.forEach(material => {
            const materialEl = document.createElement('div');
            materialEl.className = 'material-item-full';
            materialEl.dataset.materialId = material.id;
            if (this.selectedMaterial === material) {
                materialEl.classList.add('selected');
            }

            materialEl.innerHTML = `
                <div class="material-preview-full" style="background-color: #${material.color.toString(16).padStart(6, '0')}" title="Used by: ${material.objectsUsing.length} objects"></div>
                <div class="material-info-full">
                    <input type="text" class="material-name-full" value="${material.name}">
                    <div class="material-properties-full">
                        <span>M: ${material.metalness.toFixed(2)}</span>
                        <span>R: ${material.roughness.toFixed(2)}</span>
                    </div>
                </div>
                <div class="material-actions-full">
                    <button class="btn apply-material-btn" title="Apply to Selected"><i class="fas fa-check"></i></button>
                    <button class="btn edit-material-btn" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn delete-material-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;

            // Add event listeners
            materialEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('material-name-full') ||
                    e.target.classList.contains('apply-material-btn') ||
                    e.target.classList.contains('edit-material-btn') ||
                    e.target.classList.contains('delete-material-btn')) {
                    return; // Let specific handlers handle these
                }
                this.selectMaterial(material);
            });

            // Material name editing
            const nameInput = materialEl.querySelector('.material-name-full');
            nameInput.addEventListener('change', (e) => {
                material.name = e.target.value;
            });
            nameInput.addEventListener('click', (e) => e.stopPropagation());

            // Apply material button
            materialEl.querySelector('.apply-material-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyMaterialToSelected(material);
            });

            // Edit material button
            materialEl.querySelector('.edit-material-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editMaterial(material);
            });

            // Delete material button
            materialEl.querySelector('.delete-material-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMaterial(material);
            });

            materialsContent.appendChild(materialEl);
        });
    }
}