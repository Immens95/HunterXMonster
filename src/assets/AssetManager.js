
export class AssetManager {
    constructor() {
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.gltfLoader = new THREE.GLTFLoader(this.manager);
        this.audioLoader = new THREE.AudioLoader(this.manager);
        
        this.assets = {
            textures: {},
            models: {},
            audio: {}
        };

        this._onComplete = null;
        this.onProgress = null;

        this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = (itemsLoaded / itemsTotal) * 100;
            if (this.onProgress) this.onProgress(progress, url);
        };

        this.manager.onLoad = () => {
            if (this._onComplete) this._onComplete();
        };
    }

    set onComplete(callback) {
        this._onComplete = callback;
        // Se è già caricato tutto, chiama subito il callback
        if (this.manager.itemsLoaded === this.manager.itemsTotal) {
            setTimeout(() => {
                if (this._onComplete) this._onComplete();
            }, 0);
        }
    }

    get onComplete() {
        return this._onComplete;
    }

    async loadTexture(name, path) {
        if (this.assets.textures[name]) return this.assets.textures[name];
        return new Promise((resolve, reject) => {
            this.textureLoader.load(path, (texture) => {
                this.assets.textures[name] = texture;
                resolve(texture);
            }, undefined, reject);
        });
    }

    async loadModel(name, path) {
        if (this.assets.models[name]) return this.assets.models[name];
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(path, (gltf) => {
                this.assets.models[name] = gltf;
                resolve(gltf);
            }, undefined, reject);
        });
    }

    getTexture(name) {
        return this.assets.textures[name];
    }

    getModel(name) {
        return this.assets.models[name];
    }
}
