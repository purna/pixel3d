import * as THREE from 'three';

export class HistoryManager {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50; // Limit history to prevent memory issues
    }

    // Execute a command and add it to history
    async executeCommand(command) {
        // Remove any history after current index (when adding new command after undo)
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Execute the command (handle both sync and async)
        let success;
        if (command.execute.constructor.name === 'AsyncFunction') {
            success = await command.execute();
        } else {
            success = command.execute();
        }
        
        if (success !== false) { // Only add to history if execution was successful
            this.history.push(command);
            this.currentIndex++;

            // Limit history size
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
                this.currentIndex--;
            }

            this.updateUndoRedoButtons();
        }

        return success;
    }

    // Undo the last command
    undo() {
        if (this.canUndo()) {
            const command = this.history[this.currentIndex];
            command.undo();
            this.currentIndex--;
            this.updateUndoRedoButtons();
            return true;
        }
        return false;
    }

    // Redo the next command
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            const command = this.history[this.currentIndex];
            command.execute();
            this.updateUndoRedoButtons();
            return true;
        }
        return false;
    }

    // Check if undo is possible
    canUndo() {
        return this.currentIndex >= 0;
    }

    // Check if redo is possible
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    // Update the visual state of undo/redo buttons
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.style.opacity = this.canUndo() ? '1' : '0.5';
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.style.opacity = this.canRedo() ? '1' : '0.5';
        }
    }

    // Clear history (useful when scene is cleared)
    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
        this.updateUndoRedoButtons();
    }

    // Get current history info for debugging
    getHistoryInfo() {
        return {
            totalCommands: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }
}


// Command classes for different operations

export class AddObjectCommand {
    constructor(app, object) {
        this.app = app;
        this.object = object;
        this.objectId = this.generateObjectId();
    }

    generateObjectId() {
        return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    execute() {
        if (!this.object) return false;
        
        // Store object ID for identification
        this.object.userData.objectId = this.objectId;
        this.object.userData.commandId = this.generateObjectId();
        
        // Add to scene
        this.app.addToScene(this.object);
        
        // Select the new object
        this.app.selectObject(this.object);
        
        return true;
    }

    undo() {
        if (!this.object) return false;
        
        // Deselect if this object is selected
        if (this.app.selectedObject === this.object) {
            this.app.deselect();
        }
        
        // Remove from scene
        this.app.scene.remove(this.object);
        
        // Remove from objects array
        const idx = this.app.objects.indexOf(this.object);
        if (idx > -1) {
            this.app.objects.splice(idx, 1);
        }
        
        // Update UI
        this.app.ui.updateUI(null);
        
        return true;
    }
}

export class DeleteObjectCommand {
    constructor(app, object) {
        this.app = app;
        this.object = object;
        this.serializedObject = null;
    }

    execute() {
        if (!this.object) return false;
        
        // Serialize object before deletion
        this.serializedObject = this.serializeObject(this.object);
        
        // Deselect if this object is selected
        if (this.app.selectedObject === this.object) {
            this.app.deselect();
        }
        
        // Find root object to remove
        let root = this.object;
        while (root.parent && root.parent !== this.app.scene) {
            root = root.parent;
        }
        
        // Remove from scene
        this.app.scene.remove(root);
        
        // Remove from objects array
        const idx = this.app.objects.indexOf(root);
        if (idx > -1) {
            this.app.objects.splice(idx, 1);
        }
        
        // Update UI
        this.app.ui.updateUI(null);
        
        return true;
    }

    undo() {
        if (!this.serializedObject) return false;
        
        // Deserialize and recreate object
        const restoredObject = this.deserializeObject(this.serializedObject);
        if (restoredObject) {
            this.app.addToScene(restoredObject);
            
            // Select the restored object
            this.app.selectObject(restoredObject);
            
            return true;
        }
        
        return false;
    }

    serializeObject(obj) {
        // Basic serialization for simple restoration
        return {
            type: obj.userData.type || obj.type,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            userData: { ...obj.userData }
        };
    }

    deserializeObject(data) {
        // This creates a basic Three.js object
        // In a real implementation, you'd want to use the ObjectFactory
        const obj = new THREE.Object3D();
        obj.position.set(data.position.x, data.position.y, data.position.z);
        obj.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        obj.scale.set(data.scale.x, data.scale.y, data.scale.z);
        obj.userData = { ...data.userData };
        
        // Add basic geometry based on type
        if (data.userData.type === 'shape' && data.userData.shapeType) {
            const geometry = new THREE.BoxGeometry(1, 1, 1); // Default geometry
            const material = new THREE.MeshLambertMaterial({ color: 0x00ff41 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = { ...data.userData };
            obj.add(mesh);
        }
        
        return obj;
    }
}

export class TransformObjectCommand {
    constructor(app, object, oldTransform, newTransform) {
        this.app = app;
        this.object = object;
        this.oldTransform = oldTransform;
        this.newTransform = newTransform;
    }

    execute() {
        if (!this.object) return false;
        
        this.object.position.set(
            this.newTransform.position.x,
            this.newTransform.position.y,
            this.newTransform.position.z
        );
        this.object.rotation.set(
            this.newTransform.rotation.x,
            this.newTransform.rotation.y,
            this.newTransform.rotation.z
        );
        this.object.scale.set(
            this.newTransform.scale.x,
            this.newTransform.scale.y,
            this.newTransform.scale.z
        );
        
        // Update UI
        this.app.ui.updateUI(this.app.selectedObject);
        
        return true;
    }

    undo() {
        if (!this.object) return false;
        
        this.object.position.set(
            this.oldTransform.position.x,
            this.oldTransform.position.y,
            this.oldTransform.position.z
        );
        this.object.rotation.set(
            this.oldTransform.rotation.x,
            this.oldTransform.rotation.y,
            this.oldTransform.rotation.z
        );
        this.object.scale.set(
            this.oldTransform.scale.x,
            this.oldTransform.scale.y,
            this.oldTransform.scale.z
        );
        
        // Update UI
        this.app.ui.updateUI(this.app.selectedObject);
        
        return true;
    }
}

export class ClearSceneCommand {
    constructor(app) {
        this.app = app;
        this.serializedScene = null;
    }

    execute() {
        // Serialize current scene before clearing
        this.serializedScene = this.serializeScene();
        
        // Clear the scene
        this.app.clearScene();
        
        return true;
    }

    undo() {
        if (!this.serializedScene) return false;
        
        // Restore scene from serialization
        this.deserializeScene(this.serializedScene);
        
        return true;
    }

    serializeScene() {
        const sceneData = [];
        this.app.objects.forEach(obj => {
            sceneData.push(this.serializeObject(obj));
        });
        return sceneData;
    }

    deserializeScene(sceneData) {
        // Clear current scene first
        this.app.clearScene();
        
        // Recreate objects (simplified implementation)
        sceneData.forEach(objData => {
            const obj = this.deserializeObject(objData);
            if (obj) {
                this.app.addToScene(obj);
            }
        });
        
        this.app.ui.updateUI(null);
    }

    serializeObject(obj) {
        return {
            type: obj.userData.type || obj.type,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            userData: obj.userData
        };
    }

    deserializeObject(data) {
        const obj = new THREE.Object3D();
        obj.position.set(data.position.x, data.position.y, data.position.z);
        obj.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        obj.scale.set(data.scale.x, data.scale.y, data.scale.z);
        obj.userData = { ...data.userData };
        return obj;
    }
}

export class AddCharacterCommand {
    constructor(app, characterType) {
        this.app = app;
        this.characterType = characterType;
        this.characterModel = null;
    }

    async execute() {
        try {
            // Load character through character manager
            const model = await this.app.characterManager.addCharacter(this.characterType);
            this.characterModel = model;
            
            if (model) {
                // Add to scene and select
                this.app.addToScene(model);
                this.app.selectObject(model);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to add character:', error);
            return false;
        }
    }

    undo() {
        if (!this.characterModel) return false;
        
        // Deselect if this object is selected
        if (this.app.selectedObject === this.characterModel) {
            this.app.deselect();
        }
        
        // Remove from scene
        this.app.scene.remove(this.characterModel);
        
        // Remove from objects array
        const idx = this.app.objects.indexOf(this.characterModel);
        if (idx > -1) {
            this.app.objects.splice(idx, 1);
        }
        
        // Remove from character manager
        const charIndex = this.app.characterManager.characters.findIndex(c => c.model === this.characterModel);
        if (charIndex > -1) {
            this.app.characterManager.characters.splice(charIndex, 1);
        }
        
        // Update UI
        this.app.ui.updateUI(null);
        
        return true;
    }
}
