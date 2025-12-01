export class LayerManager {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('layers-list');
    }

    // Refresh the list in the properties panel
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        const objects = this.app.objects;

        // Iterate in reverse to show newest on top (visual stack order)
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            
            const el = document.createElement('div');
            el.className = 'layer-item';
            if (this.app.selectedObject === obj) el.classList.add('selected');

            // --- ICON LOGIC ---
            let iconClass = 'fa-cube'; // Default
            
            if (obj.userData.type === 'figure') {
                if (obj.userData.gender === 'female') iconClass = 'fa-female';
                else iconClass = 'fa-male';
            } 
            else if (obj.userData.type === 'light') {
                switch(obj.userData.lightType) {
                    case 'point': iconClass = 'fa-lightbulb'; break;
                    case 'spot': iconClass = 'fa-bullseye'; break;
                    case 'directional': iconClass = 'fa-sun'; break;
                    default: iconClass = 'fa-lightbulb';
                }
            }
            else if (obj.userData.type === 'shape') {
                switch(obj.userData.shapeType) {
                    case 'box': iconClass = 'fa-cube'; break;
                    case 'sphere': iconClass = 'fa-circle'; break;
                    case 'cone': iconClass = 'fa-caret-up'; break;
                    case 'cylinder': iconClass = 'fa-database'; break;
                    case 'plane': iconClass = 'fa-vector-square'; break;
                    case 'torus': iconClass = 'fa-life-ring'; break;
                    default: iconClass = 'fa-shapes';
                }
            }

            // Determine Name
            let name = obj.userData.name || obj.userData.shapeType || obj.userData.lightType || 'Object';
            if (obj.userData.type === 'figure') name = obj.userData.gender + ' Figure';
            // Title case
            name = name.charAt(0).toUpperCase() + name.slice(1);

            // Create HTML structure
            el.innerHTML = `
                <i class="fas ${iconClass} layer-icon"></i>
                <input type="text" class="layer-name" value="${name}">
                <div class="layer-actions">
                    <i class="fas fa-chevron-up layer-btn" title="Move Up"></i>
                    <i class="fas fa-chevron-down layer-btn" title="Move Down"></i>
                    <i class="fas fa-trash layer-btn delete" title="Delete"></i>
                </div>
            `;

            // --- EVENTS ---
            
            // Select Object (Clicking the row, but not inputs/buttons)
            el.addEventListener('click', (e) => {
                if(e.target.tagName === 'I' || e.target.tagName === 'INPUT') return;
                this.app.selectObject(obj);
            });

            // Rename Object
            const input = el.querySelector('.layer-name');
            input.addEventListener('change', (e) => {
                obj.userData.name = e.target.value;
                // We need to refresh the properties panel title if it's currently selected
                if (this.app.selectedObject === obj) {
                    this.app.ui.renderPropertiesPanel(obj); 
                }
            });
            input.addEventListener('click', (e) => e.stopPropagation()); // Prevent selection trigger

            // Actions Buttons
            const btns = el.querySelectorAll('.layer-btn');
            
            // Move Up (towards end of array = drawn on top)
            btns[0].addEventListener('click', (e) => {
                e.stopPropagation();
                this.reorderObject(obj, 1);
            });

            // Move Down (towards start of array = drawn behind)
            btns[1].addEventListener('click', (e) => {
                e.stopPropagation();
                this.reorderObject(obj, -1);
            });

            // Delete
            btns[2].addEventListener('click', (e) => { 
                e.stopPropagation();
                this.app.selectObject(obj);
                this.app.deleteSelected(); 
            });

            this.container.appendChild(el);
        }
    }

    // Logic to reorder objects in the Scene and the internal Array
    reorderObject(obj, direction) {
        // Direction: 1 = Up (Visual Top), -1 = Down (Visual Bottom)
        const idx = this.app.objects.indexOf(obj);
        if (idx === -1) return;

        const newIdx = idx + direction;
        
        // Bounds check
        if (newIdx < 0 || newIdx >= this.app.objects.length) return;

        // Swap in our tracking array
        [this.app.objects[idx], this.app.objects[newIdx]] = [this.app.objects[newIdx], this.app.objects[idx]];
        
        // Update UI
        this.app.ui.updateUI(this.app.selectedObject);
    }
}