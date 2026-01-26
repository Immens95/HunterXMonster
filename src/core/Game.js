
import { SceneManager } from '../rendering/SceneManager.js';
import { AssetManager } from '../assets/AssetManager.js';
import { InputManager } from '../systems/InputManager.js';
import { InventoryManager } from '../systems/InventoryManager.js';
import { CryptoManager } from '../systems/CryptoManager.js';
import { SettingsManager } from './SettingsManager.js';
import { MenuState } from './GameState.js';

export class Game {
    constructor() {
        this.assetManager = new AssetManager();
        this.inputManager = new InputManager();
        this.inventoryManager = new InventoryManager(this);
        this.cryptoManager = new CryptoManager(this);
        this.settingsManager = new SettingsManager();
        
        this.sceneManager = null;
        this.currentState = null;
        this.playerData = {
            level: 1,
            exp: 0,
            nen: 'Nessuno',
            zeny: 0,
            hp: 100,
            maxHp: 100,
            stamina: 100,
            maxStamina: 100,
            aura: 50,
            maxAura: 50,
            attack: 15,
            defense: 5,
            x: 0,
            y: 0
        };
        
        this.lastTime = performance.now();
        this.init().catch(err => {
            console.error("Errore critico durante l'inizializzazione:", err);
            this.updateLoadingText("Errore durante il caricamento. Controlla la console.");
            // Fallback per mostrare comunque qualcosa in caso di errore non fatale
            setTimeout(() => this.showLoading(false), 3000);
        });
    }

    async init() {
        this.showLoading(true);
        this.updateLoadingText("Inizializzazione renderer...");
        
        this.sceneManager = new SceneManager('three-container');
        
        // Caricamento dati di gioco (JSON) prima degli asset
        await this.loadGameData();

        this.assetManager.onProgress = (progress, url) => {
            this.updateLoadingBar(progress);
            this.updateLoadingText(`Caricamento: ${url.split('/').pop()}`);
        };

        this.assetManager.onComplete = () => {
            console.log("Tutti gli asset caricati.");
            this.finishLoading();
        };

        // Caricamento asset iniziali
        await this.loadInitialAssets();
        
        // Se non ci sono asset da caricare, il manager.onLoad potrebbe non scattare
        // Verifichiamo se dobbiamo forzare il completamento
        if (this.assetManager.manager.itemsLoaded === this.assetManager.manager.itemsTotal) {
            this.finishLoading();
        }
    }

    async loadGameData() {
        try {
            const [monstersResp, itemsResp] = await Promise.all([
                fetch('data/monsters.json'),
                fetch('data/items.json')
            ]);
            this.monsters = await monstersResp.json();
            this.items = await itemsResp.json();
            console.log("Dati di gioco caricati.");
        } catch (e) {
            console.warn("Usando fallback per i dati di gioco.");
            this.monsters = [
                { id: 1, name: "Jagras", hp: 100, maxHp: 100, attack: 10, reward: 100, exp: 50 },
                { id: 2, name: "Rathalos", hp: 500, maxHp: 500, attack: 45, reward: 1000, exp: 500 }
            ];
            this.items = [
                { id: 'potion', name: 'Pozione HP', price: 50, effect: { type: 'heal', value: 50 } }
            ];
        }
    }

    async loadInitialAssets() {
        // Aggiungi qui gli asset critici
        // Esempio: await this.assetManager.loadTexture('grass', 'assets/textures/grass.jpg');
    }

    finishLoading() {
        if (this.loaded) return;
        this.loaded = true;
        this.showLoading(false);
        this.start();
    }

    start() {
        this.changeState(new MenuState(this));
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    gameLoop(time) {
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.currentState) {
            this.currentState.update(deltaTime);
        }

        this.sceneManager.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    showLoading(show) {
        const screen = document.getElementById('loading-screen');
        if (screen) screen.style.display = show ? 'flex' : 'none';
    }

    updateLoadingBar(progress) {
        const fill = document.getElementById('loading-bar-fill');
        if (fill) fill.style.width = `${progress}%`;
    }

    updateLoadingText(text) {
        const el = document.getElementById('loading-text');
        if (el) el.innerText = text;
    }

    changeState(newState) {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }
        this.currentState = newState;
        if (this.currentState && this.currentState.enter) {
            this.currentState.enter();
        }
    }
}
