import * as THREE from 'three';

const SCENE_COMPONENT_IDS = [
    'animation',
    'audioSource',
    'light',
    'trigger',
    'interactable',
    'collectible',
    'movingPlatform',
    'billboard',
    'lod',
    'visibility'
];

/**
 * Runtime for components attached from the Properties panel. The serialisable
 * settings live in object.userData.components; this class owns the live
 * Three.js objects, timers and input handling derived from those settings.
 */
export class ComponentManager {
    constructor(app) {
        this.app = app;
        this.attachments = new Map();
        this.audioListener = null;
        this.collectedCount = 0;
        this.interactionPrompt = null;
        this._bindEvents();
    }

    _bindEvents() {
        this._onKeyDown = (event) => this._handleKeyDown(event);
        window.addEventListener('keydown', this._onKeyDown);

        const resumeAudio = () => {
            if (this.audioListener?.context?.state === 'suspended') {
                this.audioListener.context.resume().catch(() => {});
            }
            document.removeEventListener('pointerdown', resumeAudio);
        };
        document.addEventListener('pointerdown', resumeAudio);
    }

    getData(obj, id) {
        return obj?.userData?.components?.[id] || null;
    }

    _ensureAudioListener() {
        const camera = this.app.camera;
        if (!camera) return null;
        if (!this.audioListener) this.audioListener = new THREE.AudioListener();
        if (this.audioListener.parent !== camera) {
            this.audioListener.removeFromParent();
            camera.add(this.audioListener);
        }
        return this.audioListener;
    }

    ensureAll() {
        const objects = this.app.getAllObjects ? this.app.getAllObjects() : [...(this.app.objects || [])];
        objects.forEach(obj => this.ensureObject(obj));
    }

    ensureObject(obj) {
        if (!obj?.userData) return;
        const components = obj.userData.components;
        const attached = this.attachments.get(obj.uuid) || new Map();
        this.attachments.set(obj.uuid, attached);

        if (!components) return;
        SCENE_COMPONENT_IDS.forEach(id => {
            const data = components[id];
            if (data && typeof data === 'object') {
                if (!attached.has(id)) {
                    const state = this.attach(obj, id, data);
                    if (state) attached.set(id, state);
                }
            } else if (attached.has(id)) {
                this.detach(obj, id);
            }
        });
    }

    attach(obj, id, data) {
        let state = { obj, id, data };
        try {
            if (id === 'animation') {
                const clipId = this._clipId(obj);
                const clip = this.app.animationManager?.getClip(clipId);
                this.app.animationManager?.setLoop(data.loop !== false);
                this.app.animationManager?.setSpeed(data.speed ?? 1);
                if (data.autoplay !== false && clip) {
                    setTimeout(() => this.app.animationManager?.play(), 0);
                }
            } else if (id === 'audioSource') {
                const listener = this._ensureAudioListener();
                if (!listener) return null;
                const sound = data.positional !== false
                    ? new THREE.PositionalAudio(listener)
                    : new THREE.Audio(listener);
                sound.setLoop(!!data.loop);
                sound.setVolume(Number(data.volume ?? 1));
                if (sound.isPositionalAudio) {
                    sound.setRefDistance(Number(data.refDistance ?? 1));
                    sound.setMaxDistance(Number(data.maxDistance ?? 20));
                }
                obj.add(sound);
                state.sound = sound;
                const url = this._resolveAudioUrl(data);
                if (url) {
                    sound.load(url, () => {
                        if (data.autoplay) this.playAudioState(state);
                    }, () => {
                        console.warn('Could not load audio component source:', url);
                    });
                }
            } else if (id === 'light') {
                const light = this._createComponentLight(data);
                obj.add(light);
                if (light.target) obj.add(light.target);
                state.light = light;
            } else if (id === 'trigger') {
                state.inside = false;
                state.fired = false;
            } else if (id === 'collectible') {
                state.originY = obj.position.y;
                state.phase = Math.random() * Math.PI * 2;
                state.collected = false;
            } else if (id === 'movingPlatform') {
                state.origin = obj.position.clone();
                state.time = 0;
            } else if (id === 'billboard') {
                state.sprite = this._createLabelSprite(data);
                if (state.sprite) obj.add(state.sprite);
            } else if (id === 'lod') {
                state.restoreVisible = true;
            } else if (id === 'visibility') {
                obj.visible = data.visible !== false;
            }
            return state;
        } catch (error) {
            console.warn(`Could not attach ${id} component:`, error);
            return null;
        }
    }

    detach(obj, id) {
        const attached = this.attachments.get(obj.uuid);
        const state = attached?.get(id);
        if (state) {
            if (id === 'audioSource' && state.sound) {
                state.sound.stop();
                state.sound.disconnect();
                state.sound.removeFromParent();
            } else if (id === 'light' && state.light) {
                state.light.removeFromParent();
                state.light.target?.removeFromParent();
                state.light.dispose?.();
            } else if (id === 'billboard' && state.sprite) {
                state.sprite.removeFromParent();
                state.sprite.material?.map?.dispose();
                state.sprite.material?.dispose();
            } else if (id === 'movingPlatform' && state.origin) {
                obj.position.copy(state.origin);
            } else if (id === 'collectible' && state.collected) {
                obj.visible = true;
            } else if (id === 'lod' && state.restoreVisible) {
                obj.visible = true;
            }
        }
        attached?.delete(id);
        if (attached && attached.size === 0) this.attachments.delete(obj.uuid);
    }

    detachAll(obj) {
        const attached = this.attachments.get(obj.uuid);
        if (!attached) return;
        [...attached.keys()].forEach(id => this.detach(obj, id));
    }

    clear() {
        this.attachments.forEach((map, uuid) => {
            const obj = this.app.scene?.getObjectByProperty('uuid', uuid);
            if (obj) this.detachAll(obj);
        });
        this.attachments.clear();
    }

    refreshComponent(obj, id) {
        this.detach(obj, id);
        this.ensureObject(obj);
    }

    update(delta) {
        this._ensureAudioListener();
        this.ensureAll();
        this._updateInteractionPrompt();

        this.attachments.forEach(map => {
            map.forEach((state) => {
                const { obj, id, data } = state;
                if (!obj || !obj.parent) return;

                if (id === 'collectible') {
                    if (state.collected) return;
                    state.phase += delta;
                    if (data.spin !== false) obj.rotation.y += delta * 1.8;
                    if (data.bob !== false) obj.position.y = state.originY + Math.sin(state.phase * 2.2) * 0.15;
                } else if (id === 'movingPlatform') {
                    state.time += delta * Math.max(0.01, Number(data.speed ?? 1));
                    const phase = state.time % 2;
                    const amount = phase <= 1 ? phase : 2 - phase;
                    obj.position.set(
                        state.origin.x + Number(data.offsetX ?? 0) * amount,
                        state.origin.y + Number(data.offsetY ?? 0) * amount,
                        state.origin.z + Number(data.offsetZ ?? 0) * amount
                    );
                } else if (id === 'billboard') {
                    if (data.mode === 'label') {
                        if (!state.sprite) {
                            state.sprite = this._createLabelSprite(data);
                            if (state.sprite) obj.add(state.sprite);
                        }
                    } else {
                        if (state.sprite) {
                            state.sprite.removeFromParent();
                            state.sprite = null;
                        }
                        obj.lookAt(this.app.camera.position);
                    }
                } else if (id === 'lod') {
                    const distance = obj.position.distanceTo(this.app.camera.position);
                    obj.visible = distance >= Number(data.minDistance ?? 0) && distance <= Number(data.maxDistance ?? 30);
                } else if (id === 'trigger') {
                    this._updateTrigger(state, delta);
                }
            });
        });
    }

    _updateTrigger(state, delta) {
        const { obj, data } = state;
        if (data.oneShot && state.fired) return;

        const camera = this.app.camera;
        if (!camera) return;
        const local = obj.worldToLocal(camera.position.clone());
        let inside = false;

        if ((data.shape || 'box') === 'sphere') {
            inside = local.length() <= Number(data.radius ?? 1);
        } else {
            inside = Math.abs(local.x) <= Number(data.sizeX ?? 1) / 2
                && Math.abs(local.y) <= Number(data.sizeY ?? 1) / 2
                && Math.abs(local.z) <= Number(data.sizeZ ?? 1) / 2;
        }

        if (inside && !state.inside) {
            state.fired = true;
            const message = data.message || `${obj.userData.name || 'Trigger'} activated`;
            this.app.ui?.showNotification?.(message, 'info');
            window.dispatchEvent(new CustomEvent('pixel3d:trigger', {
                detail: { object: obj, component: data }
            }));
        }
        state.inside = inside;
    }

    _createComponentLight(data) {
        const color = data.color || '#ffffff';
        const intensity = Number(data.intensity ?? 1);
        let light;
        switch (data.type || 'point') {
            case 'spot':
                light = new THREE.SpotLight(color, intensity, Number(data.distance ?? 20), Number(data.angle ?? Math.PI / 6), Number(data.penumbra ?? 0.2));
                light.position.set(0, 3, 2);
                light.target.position.set(0, 0, 0);
                break;
            case 'directional':
                light = new THREE.DirectionalLight(color, intensity);
                light.position.set(3, 5, 3);
                light.target.position.set(0, 0, 0);
                break;
            case 'ambient':
                light = new THREE.AmbientLight(color, intensity);
                break;
            case 'hemisphere':
                light = new THREE.HemisphereLight(color, data.groundColor || '#444444', intensity);
                break;
            default:
                light = new THREE.PointLight(color, intensity, Number(data.distance ?? 20));
                light.position.set(0, 1, 0);
        }
        light.castShadow = data.castShadow === true;
        return light;
    }

    _createLabelSprite(data) {
        if (data.mode !== 'label') return null;
        const text = data.text || 'Label';
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = data.background || 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `600 ${Number(data.fontSize ?? 48)}px Inter, sans-serif`;
        ctx.fillStyle = data.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(material);
        const scale = Number(data.scale ?? 1);
        sprite.scale.set(2 * scale, 0.5 * scale, 1);
        sprite.position.y = Number(data.offsetY ?? 1.5);
        sprite.renderOrder = 10;
        return sprite;
    }

    _resolveAudioUrl(data) {
        if (data.assetId) {
            const asset = this.app.ui?.getAsset?.('audio', data.assetId);
            if (asset?.url) return asset.url;
        }
        return data.url || '';
    }

    _clipId(obj) {
        return obj.userData?.id || obj.uuid;
    }

    playAudioForObject(obj) {
        const state = this.attachments.get(obj.uuid)?.get('audioSource');
        if (state) this.playAudioState(state);
    }

    playAudioState(state) {
        if (!state?.sound) return;
        const play = () => {
            if (!state.sound.isPlaying) state.sound.play();
        };
        if (this.audioListener?.context?.state === 'suspended') {
            this.audioListener.context.resume().then(play).catch(() => {});
        } else {
            play();
        }
    }

    stopAudioForObject(obj) {
        const state = this.attachments.get(obj.uuid)?.get('audioSource');
        if (state?.sound?.isPlaying) state.sound.stop();
    }

    playAnimationForObject(obj) {
        const clip = this.app.animationManager?.getClip(this._clipId(obj));
        if (!clip) {
            this.app.ui?.showNotification?.('This object has no animation clip yet', 'warning');
            return;
        }
        this.app.animationManager.setLoop(this.getData(obj, 'animation')?.loop !== false);
        this.app.animationManager.play();
    }

    collect(obj) {
        const data = this.getData(obj, 'collectible');
        if (!data) return;
        const state = this.attachments.get(obj.uuid)?.get('collectible');
        if (state?.collected) return;
        if (state) state.collected = true;
        obj.visible = false;
        this.collectedCount += Number(data.value ?? 1);
        this.app.ui?.showNotification?.(`Collected! Score: ${this.collectedCount}`, 'success');
    }

    toggleVisibility(obj) {
        obj.visible = !obj.visible;
        const data = this.getData(obj, 'visibility');
        if (data) data.visible = obj.visible;
        return obj.visible;
    }

    _updateInteractionPrompt() {
        const camera = this.app.camera;
        if (!camera) return;
        if (!this.interactionPrompt) {
            this.interactionPrompt = document.createElement('div');
            this.interactionPrompt.id = 'component-interaction-prompt';
            this.interactionPrompt.style.cssText = [
                'position:fixed',
                'left:50%',
                'bottom:120px',
                'transform:translateX(-50%)',
                'padding:8px 14px',
                'border:1px solid var(--border-color, #334155)',
                'border-radius:999px',
                'background:rgba(15,23,42,.9)',
                'color:#fff',
                'font:600 0.75rem Inter,sans-serif',
                'letter-spacing:.02em',
                'pointer-events:none',
                'z-index:9999',
                'display:none',
                'box-shadow:0 8px 24px rgba(0,0,0,.35)'
            ].join(';');
            document.body.appendChild(this.interactionPrompt);
        }

        const objects = this.app.getAllObjects ? this.app.getAllObjects() : [];
        let nearest = null;
        objects.forEach(obj => {
            const data = this.getData(obj, 'interactable');
            if (!data || !obj.visible) return;
            const distance = obj.position.distanceTo(camera.position);
            if (distance > Number(data.range ?? 3)) return;
            if (!nearest || distance < nearest.distance) nearest = { obj, data, distance };
        });

        if (nearest) {
            const key = (nearest.data.key || 'e').toUpperCase();
            this.interactionPrompt.textContent = `${key} · ${nearest.data.prompt || 'Interact'}`;
            this.interactionPrompt.style.display = 'block';
        } else {
            this.interactionPrompt.style.display = 'none';
        }
    }

    _handleKeyDown(event) {
        const tag = event.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const key = event.key.toLowerCase();
        const selected = this.app.selectedObject;

        if (selected) {
            const visibility = this.getData(selected, 'visibility');
            if (visibility?.toggleKey && visibility.toggleKey.toLowerCase() === key) {
                event.preventDefault();
                this.toggleVisibility(selected);
                this.app.ui?.renderPropertiesPanel?.(selected);
                return;
            }
        }

        const objects = this.app.getAllObjects ? this.app.getAllObjects() : [];
        const camera = this.app.camera;
        if (!camera) return;
        const interactables = objects
            .map(obj => ({ obj, data: this.getData(obj, 'interactable') }))
            .filter(({ obj, data }) => data && obj.visible && obj.position.distanceTo(camera.position) <= Number(data.range ?? 3))
            .sort((a, b) => a.obj.position.distanceTo(camera.position) - b.obj.position.distanceTo(camera.position));

        const target = interactables.find(({ data }) => (data.key || 'e').toLowerCase() === key);
        if (!target) return;
        event.preventDefault();
        this.performInteraction(target.obj, target.data);
    }

    performInteraction(obj, data) {
        switch (data.action || 'none') {
            case 'toggleVisibility':
                this.toggleVisibility(obj);
                break;
            case 'playAnimation':
                this.playAnimationForObject(obj);
                break;
            case 'playAudio':
                this.playAudioForObject(obj);
                break;
            case 'collect':
                this.collect(obj);
                break;
            default:
                this.app.ui?.showNotification?.(data.prompt || 'Interacted', 'info');
        }
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        this.clear();
        this.audioListener?.removeFromParent();
        this.interactionPrompt?.remove();
    }
}

export { SCENE_COMPONENT_IDS };
