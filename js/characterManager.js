import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterPoser } from '../Art/CharacterPoser.js';

export class CharacterManager {
    constructor(app) {
        this.app = app;
        this.characters = [];
        this.loader = new GLTFLoader();
        
        // Mixamo Xbot/Ybot models plus the child variants that include pose clips.
        this.models = {
            'xbot': './Art/Xbot.glb',
            'ybot': './Art/Ybot.glb',
            'xbot-child': './Art/Xbot_child.glb',
            'ybot-child': './Art/Ybot_child.glb'
        };
        this.labels = {
            'xbot': 'Xbot Character',
            'ybot': 'Ybot Character',
            'xbot-child': 'Child Xbot',
            'ybot-child': 'Child Ybot'
        };
        this.poseLibrary = null;
        this.poseLibraryPromise = this.loadPoseLibrary();
    }

    async loadPoseLibrary() {
        try {
            const response = await fetch('./Art/poses.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.poseLibrary = await response.json();
        } catch (error) {
            console.warn('Could not load Art/poses.json; pose controls will use clip poses only.', error);
        }
        return this.poseLibrary;
    }

    async ensurePoseLibrary() {
        if (!this.poseLibrary && this.poseLibraryPromise) await this.poseLibraryPromise;
        return this.poseLibrary;
    }

    addCharacter(type = 'xbot') {
        const url = this.models[type] || this.models['xbot'];
        
        // Show loading state
        document.body.style.cursor = 'wait';

        return new Promise((resolve, reject) => {
            this.loader.load(url, async (gltf) => {
                try {
                    const model = gltf.scene;
                    
                    // 1. Setup Shadows & Position
                    model.traverse((object) => {
                        if (object.isMesh) {
                            object.castShadow = true;
                        }
                    });
                    model.position.set(0, 0, 0);

                    // Create the poser before mixer actions start moving the bones.
                    const library = await this.ensurePoseLibrary();
                    let poser = null;
                    try {
                        poser = new CharacterPoser(model, gltf.animations || [], library);
                    } catch (error) {
                        console.warn('Character posing is unavailable for this model:', error);
                    }

                    // 2. Setup Animation Mixer
                    const mixer = new THREE.AnimationMixer(model);
                    const animations = gltf.animations;
                    const actions = {};

                    // 3. Find specific clips (Idle, Walk, Run)
                    // Mixamo files usually have them in specific indices or names
                    const idleClip = animations.find(a => a.name.toLowerCase().includes('idle')) || animations[0];
                    const runClip = animations.find(a => a.name.toLowerCase().includes('run')) || animations[1];
                    const walkClip = animations.find(a => a.name.toLowerCase().includes('walk')) || animations[3];

                    // 4. Create Actions
                    if (idleClip) {
                        const action = mixer.clipAction(idleClip);
                        action.enabled = true;
                        action.setEffectiveWeight(1); // Start idle
                        action.play();
                        actions['idle'] = action;
                    }
                    if (walkClip) {
                        const action = mixer.clipAction(walkClip);
                        action.enabled = true;
                        action.setEffectiveWeight(0);
                        action.play();
                        actions['walk'] = action;
                    }
                    if (runClip) {
                        const action = mixer.clipAction(runClip);
                        action.enabled = true;
                        action.setEffectiveWeight(0);
                        action.play();
                        actions['run'] = action;
                    }

                    // 5. Store Data
                    model.userData = {
                        type: 'character',
                        characterType: type,
                        name: this.labels[type] || 'Character',
                        id: Date.now(),
                        manager: this,
                        mixer: mixer,
                        actions: actions
                    };

                    const charData = {
                        model: model,
                        mixer: mixer,
                        actions: actions,
                        poser: poser,
                        state: 'idle',
                        posing: false
                    };

                    this.characters.push(charData);

                    // Register the loaded model immediately so it appears in the
                    // Hierarchy even before the history command selects it.
                    if (this.app.objects && !this.app.objects.includes(model)) {
                        this.app.objects.push(model);
                    }
                    this.app.ui?.renderHierarchyPanel?.();
                    
                    document.body.style.cursor = 'default';
                    
                    // Show notification if UI is available
                    if (this.app.ui && this.app.ui.showNotification) {
                        this.app.ui.showNotification(`${this.labels[type] || 'Character'} loaded!`, 'success');
                    }
                    
                    resolve(model);
                    
                } catch (error) {
                    reject(error);
                }

            }, undefined, (e) => {
                console.error('Error loading character:', e);
                document.body.style.cursor = 'default';
                
                // Show error notification if UI is available
                if (this.app.ui && this.app.ui.showNotification) {
                    this.app.ui.showNotification('Failed to load character', 'error');
                }
                
                reject(e);
            });
        });
    }

    update(delta) {
        for (const char of this.characters) {
            if (char.mixer) char.mixer.update(delta);
            if (char.poser) char.poser.update(delta);
        }
    }

    getCharacter(model) {
        return this.characters.find(char => char.model === model) || null;
    }

    getPoser(model) {
        return this.getCharacter(model)?.poser || null;
    }

    getPoseNames(model) {
        return this.getPoser(model)?.list() || [];
    }

    getBones(model) {
        const poser = this.getPoser(model);
        return poser ? [...poser.bones.keys()] : [];
    }

    _beginPosing(char) {
        if (!char) return false;
        char.posing = true;
        char.state = 'pose';
        char.mixer?.stopAllAction();
        return true;
    }

    applyPose(model, name, duration = 0.3) {
        const char = this.getCharacter(model);
        if (!char?.poser || !char.poser.has(name)) return false;
        this._beginPosing(char);
        char.poser.apply(name, { duration });
        model.userData.poseName = name;
        delete model.userData.poseData;
        return true;
    }

    applyCustomPose(model, pose, duration = 0.2) {
        const char = this.getCharacter(model);
        if (!char?.poser || !pose?.rotations) return false;
        this._beginPosing(char);
        char.poser.applyPose(pose, { duration });
        model.userData.poseData = pose;
        delete model.userData.poseName;
        return true;
    }

    setBone(model, boneName, x, y, z) {
        const char = this.getCharacter(model);
        if (!char?.poser) return false;
        this._beginPosing(char);
        char.poser.setBone(boneName, x, y, z);
        model.userData.poseData = char.poser.getPose();
        delete model.userData.poseName;
        return true;
    }

    setHipsDrop(model, value) {
        const char = this.getCharacter(model);
        if (!char?.poser) return false;
        this._beginPosing(char);
        char.poser.setHipsDrop(value);
        model.userData.poseData = char.poser.getPose();
        delete model.userData.poseName;
        return true;
    }

    resetBone(model, boneName) {
        const char = this.getCharacter(model);
        if (!char?.poser) return false;
        char.poser.resetBone(boneName);
        model.userData.poseData = char.poser.getPose();
        delete model.userData.poseName;
        return true;
    }

    resetPose(model, duration = 0.2) {
        const char = this.getCharacter(model);
        if (!char?.poser) return false;
        this._beginPosing(char);
        char.poser.reset({ duration });
        model.userData.poseData = char.poser.getPose();
        delete model.userData.poseName;
        return true;
    }

    resumeAnimation(model, state = 'idle') {
        const char = this.getCharacter(model);
        if (!char) return false;
        char.posing = false;
        const action = char.actions[state] || char.actions.idle;
        if (!action) return false;
        char.mixer.stopAllAction();
        action.reset();
        action.enabled = true;
        action.setEffectiveWeight(1);
        action.play();
        char.state = state;
        delete model.userData.poseData;
        delete model.userData.poseName;
        return true;
    }

    applySavedPose(model) {
        const userData = model.userData || {};
        if (userData.poseData) return this.applyCustomPose(model, userData.poseData, 0);
        if (userData.poseName) return this.applyPose(model, userData.poseName, 0);
        return false;
    }

    // --- Blending Logic from character.html ---

    setAnimation(model, targetState) {
        const char = this.characters.find(c => c.model === model);
        if (!char) return;

        const actions = char.actions;
        const endAction = actions[targetState];
        if (!endAction) return;

        // Find currently active action (highest weight)
        let startAction = null;
        let maxWeight = -1;
        
        for (const key in actions) {
            const act = actions[key];
            if (act.getEffectiveWeight() > maxWeight) {
                maxWeight = act.getEffectiveWeight();
                startAction = act;
            }
        }

        // Only transition if different
        if (startAction !== endAction) {
            this.executeCrossFade(startAction, endAction, 1.0); // 1.0s duration
            char.state = targetState;
        }
    }

    executeCrossFade(startAction, endAction, duration) {
        // Ensure the new action is enabled and ready
        if (endAction) {
            this.setWeight(endAction, 1);
            endAction.time = 0;

            if (startAction) {
                // Crossfade: Fade out start, Fade in end
                startAction.crossFadeTo(endAction, duration, true);
            } else {
                // Just fade in
                endAction.fadeIn(duration);
            }
        } else {
            // Just fade out current
            if (startAction) startAction.fadeOut(duration);
        }
    }

    setWeight(action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }
}