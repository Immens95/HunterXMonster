/**
 * Modulo per la gestione delle impostazioni di gioco e dei controlli.
 */
const GameSettings = {
    graphics: {
        resolutionScale: 1.0,
        targetFPS: 60,
        lodDistance: 1000,
        antialias: false,
        shadows: true
    },
    controls: {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        pause: 'Escape'
    },
    gamepad: {
        deadzone: 0.1,
        enabled: true
    },

    save() {
        localStorage.setItem('hxm_settings', JSON.stringify({
            graphics: this.graphics,
            controls: this.controls
        }));
    },

    load() {
        const saved = localStorage.getItem('hxm_settings');
        if (saved) {
            const data = JSON.parse(saved);
            this.graphics = { ...this.graphics, ...data.graphics };
            this.controls = { ...this.controls, ...data.controls };
        }
    },

    apply(renderer, camera) {
        if (renderer) {
            const width = window.innerWidth * this.graphics.resolutionScale;
            const height = window.innerHeight * this.graphics.resolutionScale;
            renderer.setSize(width, height, false);
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
        }
        if (camera) {
            camera.far = this.graphics.lodDistance;
            camera.updateProjectionMatrix();
        }
    }
};

GameSettings.load();
window.GameSettings = GameSettings;
