export class FileManager {
    constructor(app) {
        this.app = app;
        this.autosaveEnabled = false;
        this.autosaveInterval = 5; // minutes
        this.autosaveTimer = null;
    }

    saveScene() {
        const data = [];
        
        // Helper to serialize an object
        const processObj = (obj) => {
            // Only process objects with our specific types
            if (obj.userData.type) {
                const item = {
                    type: obj.userData.type,
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                    userData: obj.userData
                };

                if (obj.userData.type === 'shape') {
                    item.shapeType = obj.userData.shapeType;
                    item.color = '#' + obj.material.color.getHexString();
                } else if (obj.userData.type === 'light') {
                    const l = obj.children[0];
                    item.lightType = obj.userData.lightType;
                    item.color = '#' + l.color.getHexString();
                    item.intensity = l.intensity;
                } else if (obj.userData.type === 'figure') {
                    item.gender = obj.userData.gender;
                    // Save posing data (rotation of limbs)
                    item.joints = {};
                    obj.traverse(child => {
                        if (child.userData.name && child.userData.name.includes('Joint')) {
                            item.joints[child.userData.name] = {
                                x: child.rotation.x,
                                y: child.rotation.y,
                                z: child.rotation.z
                            };
                        }
                    });
                }
                data.push(item);
            }
        };

        // Traverse only direct children of scene to find our managed roots
        this.app.scene.children.forEach(child => {
            processObj(child);
        });

        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scene.json';
        a.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    saveToBrowser() {
        const data = [];
        
        // Helper to serialize an object
        const processObj = (obj) => {
            // Only process objects with our specific types
            if (obj.userData.type) {
                const item = {
                    type: obj.userData.type,
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                    userData: obj.userData
                };

                if (obj.userData.type === 'shape') {
                    item.shapeType = obj.userData.shapeType;
                    item.color = '#' + obj.material.color.getHexString();
                } else if (obj.userData.type === 'light') {
                    const l = obj.children[0];
                    item.lightType = obj.userData.lightType;
                    item.color = '#' + l.color.getHexString();
                    item.intensity = l.intensity;
                } else if (obj.userData.type === 'figure') {
                    item.gender = obj.userData.gender;
                    // Save posing data (rotation of limbs)
                    item.joints = {};
                    obj.traverse(child => {
                        if (child.userData.name && child.userData.name.includes('Joint')) {
                            item.joints[child.userData.name] = {
                                x: child.rotation.x,
                                y: child.rotation.y,
                                z: child.rotation.z
                            };
                        }
                    });
                }
                data.push(item);
            }
        };

        // Traverse only direct children of scene to find our managed roots
        this.app.scene.children.forEach(child => {
            processObj(child);
        });

        // Save to localStorage
        localStorage.setItem('pixel3d-scene', JSON.stringify(data));
        this.saveFolderStructure();
    }

    // Save folder structure
    saveFolderStructure() {
        if (!this.app.layerManager) return;

        const folderData = this.app.layerManager.folders.map(folder => ({
            id: folder.id,
            name: folder.name,
            expanded: folder.expanded,
            objects: folder.objects.map(obj => obj.id || Math.random().toString(36).substr(2, 9))
        }));

        localStorage.setItem('pixel3d-folders', JSON.stringify(folderData));
    }

    // Load folder structure
    loadFolderStructure() {
        if (!this.app.layerManager) return;

        const saved = localStorage.getItem('pixel3d-folders');
        if (saved) {
            try {
                const folderData = JSON.parse(saved);
                this.app.layerManager.folders = folderData.map(folder => ({
                    id: folder.id,
                    name: folder.name,
                    expanded: folder.expanded || true,
                    objects: []
                }));
                this.app.layerManager.render();
            } catch (err) {
                console.error("Failed to load folder structure:", err);
            }
        }
    }

    // Autosave methods
    setAutosaveEnabled(enabled) {
        this.autosaveEnabled = enabled;
        if (enabled) {
            this.startAutosave();
        } else {
            this.stopAutosave();
        }
    }

    setAutosaveInterval(minutes) {
        this.autosaveInterval = minutes;
        if (this.autosaveEnabled) {
            this.startAutosave(); // Restart with new interval
        }
    }

    startAutosave() {
        this.stopAutosave(); // Clear any existing timer
        this.autosaveTimer = setInterval(() => {
            this.saveToBrowser();
            if (this.app.ui && this.app.ui.showNotification) {
                this.app.ui.showNotification('Scene autosaved!', 'success');
            }
        }, this.autosaveInterval * 60 * 1000); // Convert minutes to milliseconds
    }

    stopAutosave() {
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    loadScene(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.loadData(data); // Refactored to separate method so AI can call it
            } catch (err) {
                console.error("Failed to load scene:", err);
                // Note: FileManager doesn't have access to UI, so alerts are still used here
                alert("Error loading scene file");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    // New helper that accepts raw data (used by File Input AND Gemini AI)
    loadData(data) {
        this.app.clearScene();
        
        let loadedCount = 0;
        data.forEach(item => {
            let newObj = null;

            if (item.type === 'shape') {
                this.app.addShape(item.shapeType);
                newObj = this.app.selectedObject;
                if (newObj && item.color) newObj.material.color.set(item.color);
            } 
            else if (item.type === 'light') {
                this.app.addLight(item.lightType);
                newObj = this.app.selectedObject;
                if (newObj) {
                    newObj.children[0].color.set(item.color);
                    newObj.children[0].intensity = item.intensity;
                }
            }
            else if (item.type === 'figure') {
                this.app.addFigure(item.gender);
                newObj = this.app.selectedObject;
                
                // Restore posing
                if (item.joints) {
                    newObj.traverse(child => {
                        if (child.userData.name && item.joints[child.userData.name]) {
                            const rot = item.joints[child.userData.name];
                            child.rotation.set(rot.x, rot.y, rot.z);
                        }
                    });
                }
            }

            if (newObj) {
                if (item.position) newObj.position.set(item.position.x, item.position.y, item.position.z);
                if (item.rotation) newObj.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
                if (item.scale) newObj.scale.set(item.scale.x, item.scale.y, item.scale.z);
                loadedCount++;
            }
        });
        
        this.app.deselect(); // Clear selection after loading
        
        // Show notification via UI (if available)
        if (this.app.ui && this.app.ui.showNotification) {
            this.app.ui.showNotification(`Scene loaded! (${loadedCount} objects)`, 'success');
        }

        // Load folder structure and restore object organization
        this.loadFolderStructure();
        this.restoreObjectsToFolders();
    }

    // Restore objects to their folders after loading
    restoreObjectsToFolders() {
        if (!this.app.layerManager) return;

        const saved = localStorage.getItem('pixel3d-folders');
        if (!saved) return;

        try {
            const folderData = JSON.parse(saved);

            // Create a map of object IDs to actual objects
            const objectMap = {};
            this.app.getAllObjects().forEach(obj => {
                const objId = obj.id || Math.random().toString(36).substr(2, 9);
                objectMap[objId] = obj;
            });

            // Restore objects to their folders
            folderData.forEach(folder => {
                const existingFolder = this.app.layerManager.folders.find(f => f.id === folder.id);
                if (existingFolder) {
                    folder.objects.forEach(objId => {
                        const obj = objectMap[objId];
                        if (obj) {
                            // Remove from main objects array if it exists there
                            const idx = this.app.objects.indexOf(obj);
                            if (idx > -1) {
                                this.app.objects.splice(idx, 1);
                            }
                            // Add to folder
                            existingFolder.objects.push(obj);
                        }
                    });
                }
            });

            // Refresh the UI
            if (this.app.layerManager) {
                this.app.layerManager.render();
            }
        } catch (err) {
            console.error("Failed to restore objects to folders:", err);
        }
    }
}