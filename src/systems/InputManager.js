
export class InputManager {
    constructor() {
        this.keys = {};
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isPressed(code) {
        return !!this.keys[code];
    }
}
