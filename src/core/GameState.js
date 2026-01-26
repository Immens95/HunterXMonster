
import { Terrain } from '../rendering/Terrain.js';
import { Player } from '../systems/Player.js';

export class GameState {
    constructor(game) {
        this.game = game;
    }
    enter() {}
    update(deltaTime) {}
    exit() {}

    showScreen(id) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.style.display = 'none');
        const target = document.getElementById(id);
        if (target) target.style.display = 'block';
    }
}

export class MenuState extends GameState {
    enter() {
        this.showScreen('menu-screen');
        this.setupButtons();
    }

    setupButtons() {
        const btn = document.getElementById('new-game-btn');
        if (btn) {
            btn.onclick = () => {
                this.game.changeState(new ExplorationState(this.game));
            };
        }
    }
}

export class ExplorationState extends GameState {
    constructor(game) {
        super(game);
        this.terrain = null;
        this.player = null;
        this.npcs = [];
        this.worldInitialized = false;
    }

    async enter() {
        this.showScreen('exploration-screen');
        if (!this.worldInitialized) {
            await this.initWorld();
            this.worldInitialized = true;
        }
    }

    async initWorld() {
        this.game.showLoading(true);
        this.game.updateLoadingText("Generazione terreno...");
        
        this.terrain = new Terrain(10000, 100);
        const terrainMesh = this.terrain.generate(this.game.assetManager);
        this.game.sceneManager.add(terrainMesh);

        this.game.updateLoadingText("Caricamento personaggio...");
        this.player = new Player(this.game);
        await this.player.init();

        this.game.updateLoadingText("Caricamento NPC...");
        await this.spawnNPCs();

        this.game.showLoading(false);
    }

    async spawnNPCs() {
        // Esempio: Spawna un mostro Jagras come NPC interattivo
        const monsterData = this.game.monsters[0];
        try {
            const gltf = await this.game.assetManager.loadModel('jagras', 'assets/models/monsters/duck.glb'); // Usiamo duck come fallback per Jagras se non c'è il modello
            const mesh = gltf.scene.clone();
            mesh.scale.set(30, 30, 30);
            
            const x = 500;
            const z = 500;
            const y = this.terrain.getHeight(x, z);
            mesh.position.set(x, y, z);
            
            this.game.sceneManager.add(mesh);
            this.npcs.push({ mesh, data: monsterData, type: 'monster' });
        } catch (e) {
            console.warn("Impossibile caricare il modello del mostro:", e);
        }
    }

    update(deltaTime) {
        if (this.player) {
            this.player.update(deltaTime, this.terrain);
            this.checkCollisions();
        }
    }

    checkCollisions() {
        if (!this.player || !this.player.mesh) return;

        for (const npc of this.npcs) {
            const dist = this.player.mesh.position.distanceTo(npc.mesh.position);
            if (dist < 100) {
                if (npc.type === 'monster') {
                    console.log("Incontro con un mostro!");
                    this.game.changeState(new HuntState(this.game, npc.data));
                }
            }
        }
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }
}

export class HuntState extends GameState {
    constructor(game, monster) {
        super(game);
        this.monster = monster;
    }

    enter() {
        this.showScreen('hunt-screen');
        this.updateUI();
        this.setupButtons();
    }

    setupButtons() {
        const attackBtn = document.getElementById('action-attack-btn');
        if (attackBtn) {
            attackBtn.onclick = () => this.playerAttack();
        }
    }

    playerAttack() {
        const damage = Math.max(1, this.game.playerData.attack - (this.monster.defense || 0));
        this.monster.hp -= damage;
        console.log(`Hai inflitto ${damage} danni a ${this.monster.name}!`);
        this.updateHP();
        this.checkBattleEnd();
    }

    updateUI() {
        const nameEl = document.getElementById('monster-name');
        if (nameEl) nameEl.innerText = this.monster.name;
        this.updateHP();
    }

    updateHP() {
        const hpBar = document.getElementById('monster-hp');
        if (hpBar) {
            const percent = (this.monster.hp / this.monster.maxHp) * 100;
            hpBar.style.width = `${percent}%`;
        }
    }

    update(deltaTime) {
        // Logica di battaglia...
    }

    checkBattleEnd() {
        if (this.monster.hp <= 0) {
            console.log("Mostro sconfitto!");
            this.game.changeState(new ExplorationState(this.game));
        }
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }
}


