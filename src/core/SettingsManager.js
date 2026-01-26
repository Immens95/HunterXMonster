
export class SettingsManager {
    constructor() {
        this.settings = {
            graphics: {
                quality: 'high',
                antialias: true,
                shadows: true,
                resolutionScale: 1.0,
                targetFPS: 60
            },
            audio: {
                volume: 0.5
            }
        };
        this.load();
    }

    load() {
        const saved = localStorage.getItem('hxm_settings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    save() {
        localStorage.setItem('hxm_settings', JSON.stringify(this.settings));
    }

    apply(game) {
        if (game.sceneManager) {
            game.sceneManager.renderer.shadowMap.enabled = this.settings.graphics.shadows;
            // Altre applicazioni...
        }
    }
}
