// Gestore errori globale per il debug
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Errore Globale: ' + msg + '\nURL: ' + url + '\nLinea: ' + lineNo + '\nColonna: ' + columnNo + '\nErrore: ' + error);
    return false;
};

// --- Game Configuration & Constants ---
let player = {
    level: 1,
    exp: 0,
    nen: 'Nessuno',
    zeny: 0,
    hp: 100,
    maxHp: 100,
    attack: 15,
    defense: 5,
    x: 0,
    y: 0,
    exploredMap: [],
    inventory: []
};

// --- 3D Scene Management (Three.js) ---
let scene, camera, renderer, playerMesh, npcMesh, mixer;
let chests = [];
let worldEnemies = [];
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity, direction, clock, loader;

let isPaused = false;
let isTouchDevice = false;
let cameraAngle = 0;
let cameraDistance = 600;
let cameraPitch = 0.8; 
let joystickData = { active: false, x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };

function initThree() {
    console.log("Inizializzazione Three.js...");
    
    // UI Debug temporanea per l'utente
    const debugStatus = document.createElement('div');
    debugStatus.id = "three-debug-status";
    debugStatus.style = "position:absolute; top:50px; left:10px; color:white; background:rgba(0,0,0,0.8); padding:5px; font-size:10px; z-index:10000;";
    debugStatus.innerText = "Inizializzazione 3D...";
    document.body.appendChild(debugStatus);

    if (typeof THREE === 'undefined') {
        debugStatus.innerText = "ERRORE: THREE non definito!";
        debugStatus.style.background = "red";
        return;
    }
    const container = document.getElementById('three-container');
    if (!container) {
        console.error("Container 'three-container' non trovato!");
        debugStatus.innerText = "ERRORE: Container non trovato!";
        return;
    }

    if (!velocity) velocity = new THREE.Vector3();
    if (!direction) direction = new THREE.Vector3();
    if (!clock) clock = new THREE.Clock();

    // Rilevamento Dispositivo Touch
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    console.log("Dispositivo Touch Rilevato:", isTouchDevice);

    if (isTouchDevice) {
        document.getElementById('joystick-container').classList.remove('hidden');
        setupJoystick();
        setupTouchCamera();
    } else {
        setupMouseCamera();
    }

    debugStatus.innerText = "Preparazione renderer...";

    // Forza visibilità container per calcolare dimensioni
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    console.log(`Dimensioni container: ${width}x${height}`);

    if (animationId) cancelAnimationFrame(animationId);
    while (container.firstChild) container.removeChild(container.firstChild);

    try {
        if (typeof THREE.GLTFLoader === 'undefined') {
            throw new Error("GLTFLoader non trovato.");
        }
        loader = new THREE.GLTFLoader();
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        
        camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
        
        renderer = new THREE.WebGLRenderer({ 
            antialias: GameSettings.graphics.antialias,
            powerPreference: "high-performance" 
        });
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        
        // Assicuriamoci che il canvas sia visibile
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";

        // Debug Cube - Per confermare che il rendering funziona
        const debugGeo = new THREE.BoxGeometry(100, 100, 100);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const debugCube = new THREE.Mesh(debugGeo, debugMat);
        debugCube.position.set(player.x, 50, player.y);
        scene.add(debugCube);
        console.log("Cubo di debug aggiunto alla scena.");

        window.addEventListener('resize', onWindowResize, false);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(100, 500, 100);
        scene.add(directionalLight);

        // Floor with texture
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('assets/textures/grass.jpg', (tex) => {
            console.log("Texture caricata con successo.");
        }, undefined, (err) => {
            console.warn("Errore caricamento texture grass.jpg, uso colore piatto.");
        });
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(50, 50);

        const floorGeo = new THREE.PlaneGeometry(MAP_CONFIG.MAP_WIDTH * MAP_CONFIG.TILE_SIZE * 5, MAP_CONFIG.MAP_HEIGHT * MAP_CONFIG.TILE_SIZE * 5);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27, map: grassTexture });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Load Player Model
        loader.load('assets/models/player.glb', (gltf) => {
            playerMesh = gltf.scene;
            playerMesh.scale.set(40, 40, 40);
            playerMesh.position.set(player.x, 0, player.y);
            scene.add(playerMesh);
            
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(playerMesh);
                mixer.clipAction(gltf.animations[0]).play();
            }
        }, undefined, (error) => {
            console.error("Errore caricamento modello player:", error);
        });

        // Load NPC Model
        loader.load('assets/models/npc.glb', (gltf) => {
            npcMesh = gltf.scene;
            npcMesh.scale.set(40, 40, 40);
            npcMesh.position.set(15 * MAP_CONFIG.TILE_SIZE, 0, 15 * MAP_CONFIG.TILE_SIZE);
            scene.add(npcMesh);
        }, undefined, (error) => {
            console.error("Errore caricamento modello NPC:", error);
        });

        // Chests
        chests = [];
        for(let i=0; i<15; i++) {
            spawn3DChest();
        }

        // Enemies in World
        worldEnemies = [];
        for(let i=0; i<10; i++) {
            spawn3DEnemy();
        }

        camera.position.set(player.x, 400, player.y + 400);
        camera.lookAt(player.x, 0, player.y);

        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        animate();
        console.log("Three.js inizializzato correttamente.");
        debugStatus.innerText = "3D Pronto!";
        setTimeout(() => debugStatus.remove(), 3000);
    } catch (e) {
        console.error("Errore durante l'inizializzazione di Three.js:", e);
        debugStatus.innerText = "ERRORE: " + e.message;
        debugStatus.style.background = "red";
    }
}

function setupJoystick() {
    const container = document.getElementById('joystick-container');
    const stick = document.getElementById('joystick-stick');
    const base = document.getElementById('joystick-base');
    if (!container || !stick || !base) return;

    const limit = 40;
    
    const handleMove = (e) => {
        if (!joystickData.active) return;
        const touch = e.touches ? Array.from(e.touches).find(t => t.target.closest('#joystick-container')) : e;
        if (!touch) return;

        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > limit) {
            dx = (dx / dist) * limit;
            dy = (dy / dist) * limit;
        }
        
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        joystickData.x = dx / limit;
        joystickData.y = dy / limit;
        
        moveLeft = joystickData.x < -0.3;
        moveRight = joystickData.x > 0.3;
        moveForward = joystickData.y < -0.3;
        moveBackward = joystickData.y > 0.3;
        
        e.preventDefault();
    };

    const handleStart = (e) => {
        joystickData.active = true;
        handleMove(e);
    };

    const handleEnd = () => {
        joystickData.active = false;
        stick.style.transform = `translate(0, 0)`;
        joystickData.x = 0;
        joystickData.y = 0;
        moveLeft = moveRight = moveForward = moveBackward = false;
    };

    container.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
}

function setupTouchCamera() {
    const container = document.getElementById('three-container');
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
        if (isPaused) return;
        const touch = e.touches[0];
        // Se il touch non è sul joystick, iniziamo a ruotare la camera
        if (!e.target.closest('#joystick-container')) {
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (isPaused || touchStartX === 0) return;
        const touch = Array.from(e.touches).find(t => !t.target.closest('#joystick-container'));
        if (!touch) return;

        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        cameraAngle -= dx * 0.01;
        cameraPitch = Math.max(0.2, Math.min(1.4, cameraPitch + dy * 0.01));

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });

    window.addEventListener('touchend', () => {
        touchStartX = 0;
        touchStartY = 0;
    });
}

function setupMouseCamera() {
    window.addEventListener('mousemove', (e) => {
        if (isPaused) return;
        
        // Se il mouse si muove, ruotiamo la camera (stile libera o con tasto destro)
        // Per ora facciamo rotazione libera se siamo in esplorazione
        if (screens.exploration && !screens.exploration.classList.contains('hidden')) {
            if (lastMousePos.x !== 0) {
                const dx = e.clientX - lastMousePos.x;
                const dy = e.clientY - lastMousePos.y;
                
                // Opzionale: ruota solo se un tasto è premuto, o sempre
                // Facciamo ruota sempre se il mouse è nel container
                if (e.buttons === 1 || e.buttons === 2) { // Click sinistro o destro per ruotare
                    cameraAngle -= dx * 0.005;
                    cameraPitch = Math.max(0.2, Math.min(1.4, cameraPitch + dy * 0.005));
                }
            }
            lastMousePos.x = e.clientX;
            lastMousePos.y = e.clientY;
        }
    });
}

function spawn3DChest() {
    const geo = new THREE.BoxGeometry(40, 40, 40);
    const mat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
    const chest = new THREE.Mesh(geo, mat);
    chest.position.set(
        (Math.random() - 0.5) * MAP_CONFIG.MAP_WIDTH * MAP_CONFIG.TILE_SIZE * 1.5,
        20,
        (Math.random() - 0.5) * MAP_CONFIG.MAP_HEIGHT * MAP_CONFIG.TILE_SIZE * 1.5
    );
    scene.add(chest);
    chests.push(chest);
}

function spawn3DEnemy() {
    const geo = new THREE.IcosahedronGeometry(30, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geo, mat);
    enemy.position.set(
        (Math.random() - 0.5) * MAP_CONFIG.MAP_WIDTH * MAP_CONFIG.TILE_SIZE * 1.5,
        30,
        (Math.random() - 0.5) * MAP_CONFIG.MAP_HEIGHT * MAP_CONFIG.TILE_SIZE * 1.5
    );
    scene.add(enemy);
    worldEnemies.push(enemy);
}

function handleGamepadInput() {
    if (!GameSettings.gamepad.enabled) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;

    const deadzone = GameSettings.gamepad.deadzone;
    
    // Movimento con analogico sinistro
    const xAxis = gp.axes[0];
    const yAxis = gp.axes[1];

    moveLeft = xAxis < -deadzone;
    moveRight = xAxis > deadzone;
    moveForward = yAxis < -deadzone;
    moveBackward = yAxis > deadzone;

    // Pausa con tasto Start (tipicamente indice 9 o 16)
    if (gp.buttons[9]?.pressed || gp.buttons[16]?.pressed) {
        if (!isPaused) togglePause();
    }
}

function onWindowResize() {
    if (!camera || !renderer || !screens.exploration) return;
    const container = document.getElementById('three-container');
    if (!container) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onKeyDown(event) {
    if (event.code === GameSettings.controls.pause) {
        togglePause();
        return;
    }
    if (isPaused) return;

    switch (event.code) {
        case GameSettings.controls.forward: 
        case 'ArrowUp': moveForward = true; break;
        case GameSettings.controls.left: 
        case 'ArrowLeft': moveLeft = true; break;
        case GameSettings.controls.backward: 
        case 'ArrowDown': moveBackward = true; break;
        case GameSettings.controls.right: 
        case 'ArrowRight': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case GameSettings.controls.forward: 
        case 'ArrowUp': moveForward = false; break;
        case GameSettings.controls.left: 
        case 'ArrowLeft': moveLeft = false; break;
        case GameSettings.controls.backward: 
        case 'ArrowDown': moveBackward = false; break;
        case GameSettings.controls.right: 
        case 'ArrowRight': moveRight = false; break;
    }
}

let animationId;

function animate() {
    if (!scene || isPaused) return;
    animationId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    // Supporto Gamepad
    handleGamepadInput();

    if (mixer) mixer.update(delta);

    // Fallback: se playerMesh non è ancora caricato, la camera guarda il centro
    if (playerMesh) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        // Inversione Controlli: A/Left muove a sinistra (-1), D/Right muove a destra (+1)
        // Ma nel sistema di coordinate, direzione.x negativo potrebbe essere destra a seconda della camera.
        // Con camera fissa dietro al player, dobbiamo assicurarci che left vada a sinistra RELATIVAMENTE al player/camera.
        // direction.x = Number(moveLeft) - Number(moveRight); // Vecchio (Left +, Right -) -> Dipende dal sistema
        // Proviamo a invertire:
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveLeft) - Number(moveRight); // Se Left è true -> +1. Se Right è true -> -1.
        // Se vogliamo invertire: Left -> -1, Right -> +1
        direction.x = Number(moveRight) - Number(moveLeft); // Right(1) - Left(0) = +1 (Destra) | Right(0) - Left(1) = -1 (Sinistra)
        
        direction.normalize();

        // Se la camera ruota, dobbiamo ruotare anche il vettore di movimento
        if (moveForward || moveBackward || moveLeft || moveRight) {
             // Ruota la direzione di input in base all'angolo della camera
             const camDir = new THREE.Vector3(direction.x, 0, direction.z);
             camDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
             
             velocity.x -= camDir.x * 4000.0 * delta;
             velocity.z -= camDir.z * 4000.0 * delta;
        }

        playerMesh.position.x += velocity.x * delta;
        playerMesh.position.z += velocity.z * delta;

        // Rotation
        if (moveForward || moveBackward || moveLeft || moveRight) {
            const angle = Math.atan2(-velocity.x, -velocity.z);
            playerMesh.rotation.y = angle;
        }

        // Update player data for saving
        player.x = playerMesh.position.x;
        player.y = playerMesh.position.z;

        // Camera follow
        const camX = playerMesh.position.x + Math.sin(cameraAngle) * cameraDistance;
        const camZ = playerMesh.position.z + Math.cos(cameraAngle) * cameraDistance;
        const camY = cameraDistance * cameraPitch; // Altezza basata sul pitch

        camera.position.set(camX, camY, camZ);
        camera.lookAt(playerMesh.position);
    } else {
        // Se il modello non c'è, guarda dove dovrebbe essere il giocatore
        camera.position.set(player.x, 400, player.y + 400);
        camera.lookAt(player.x, 0, player.y);
    }

        // Collision with chests
        chests.forEach((chest, index) => {
            if (playerMesh.position.distanceTo(chest.position) < 50) {
                scene.remove(chest);
                chests.splice(index, 1);
                
                // 70% chance di trovare un oggetto, 30% solo zeny
                if (Math.random() < 0.7) {
                    const item = getRandomItem();
                    if (item) {
                        addToInventory(item);
                        log(`Hai trovato: ${item.name}!`);
                    }
                } else {
                    const gold = 100 + Math.floor(Math.random() * 200);
                    player.zeny += gold;
                    log(`Hai trovato ${gold} Zeny nel forziere!`);
                }
                updateUI();
            }
        });

        // Collision with world enemies
        worldEnemies.forEach((enemy, index) => {
            if (playerMesh.position.distanceTo(enemy.position) < 50) {
                scene.remove(enemy);
                worldEnemies.splice(index, 1);
                moveForward = moveBackward = moveLeft = moveRight = false;
                startHunt();
            }
        });

        // Random Encounter
        if ((moveForward || moveBackward || moveLeft || moveRight) && Math.random() < 0.005) {
            moveForward = moveBackward = moveLeft = moveRight = false;
            startHunt();
        }
    }

    renderer.render(scene, camera);
}

// --- DOM & Game State Management ---
let screens = {};

async function init() {
    console.log("Inizializzazione gioco...");
    
    // Verifica caricamento librerie critiche
    if (typeof THREE === 'undefined') {
        console.error("Errore: Three.js non caricato!");
        alert("Errore caricamento motore 3D. Controlla la connessione.");
        return;
    }

    // Inizializza i riferimenti agli schermi DOM
    screens = {
        menu: document.getElementById('menu-screen'),
        exploration: document.getElementById('exploration-screen'),
        hunt: document.getElementById('hunt-screen'),
        shop: document.getElementById('shop-screen'),
        character: document.getElementById('character-screen'),
        pause: document.getElementById('pause-screen'),
        settings: document.getElementById('settings-screen'),
        inventory: document.getElementById('inventory-screen')
    };

    try {
        // Configura i listener PRIMA del caricamento dei dati
        setupEventListeners();
        
        // Carica dati in background
        loadMonsters().then(() => console.log("Mostri caricati."));
        loadItems().then(() => console.log("Oggetti caricati."));

        console.log("Gioco inizializzato correttamente.");
    } catch (e) {
        console.error("Errore durante l'inizializzazione del gioco:", e);
    }
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        showScreen('pause');
        if (animationId) cancelAnimationFrame(animationId);
    } else {
        showScreen('exploration');
        animate();
    }
}

function setupEventListeners() {
    console.log("Configurazione event listeners...");
    
    // Menu di Pausa e Navigazione
    const btnPause = document.getElementById('pause-btn');
    if (btnPause) btnPause.onclick = togglePause;

    const btnResume = document.getElementById('resume-btn');
    if (btnResume) btnResume.onclick = () => togglePause();

    const btnInventory = document.getElementById('inventory-btn');
    if (btnInventory) btnInventory.onclick = () => {
        showScreen('inventory');
        openInventoryMenu();
    };

    const btnCharMenu = document.getElementById('char-menu-btn');
    if (btnCharMenu) btnCharMenu.onclick = openCharacterMenu;

    const btnSettings = document.getElementById('settings-btn');
    if (btnSettings) btnSettings.onclick = () => {
        showScreen('settings');
        updateSettingsUI();
    };

    const btnBackToPause = document.querySelector('.back-to-pause-btn');
    if (btnBackToPause) btnBackToPause.onclick = () => showScreen('pause');

    const btnQuit = document.getElementById('quit-btn');
    if (btnQuit) btnQuit.onclick = () => {
        isPaused = false;
        showScreen('menu');
    };

    // Salva/Carica nel menu di pausa
    const btnPauseSave = document.getElementById('pause-save-btn');
    if (btnPauseSave) btnPauseSave.onclick = saveGame;

    const btnPauseLoad = document.getElementById('pause-load-btn');
    if (btnPauseLoad) btnPauseLoad.onclick = loadGame;

    // Impostazioni Grafiche
    document.getElementById('res-scale').oninput = (e) => {
        GameSettings.graphics.resolutionScale = parseFloat(e.target.value);
        GameSettings.apply(renderer, camera);
        GameSettings.save();
    };

    document.getElementById('lod-dist').oninput = (e) => {
        GameSettings.graphics.lodDistance = parseInt(e.target.value);
        GameSettings.apply(renderer, camera);
        GameSettings.save();
    };

    document.getElementById('target-fps').onchange = (e) => {
        GameSettings.graphics.targetFPS = parseInt(e.target.value);
        GameSettings.save();
    };

    const btnNewGame = document.getElementById('new-game-btn');
    if (btnNewGame) {
        btnNewGame.onclick = () => {
            console.log("Pulsante Nuova Partita cliccato");
            startNewGame();
        };
    } else {
        console.warn("Pulsante 'new-game-btn' non trovato!");
    }

    const btnLoadGame = document.getElementById('load-game-btn');
    if (btnLoadGame) btnLoadGame.onclick = loadGame;

    const btnShop = document.getElementById('shop-btn');
    if (btnShop) btnShop.onclick = () => showScreen('shop');

    const btnSave = document.getElementById('menu-save-btn');
    if (btnSave) btnSave.onclick = saveGame;

    const btnChar = document.getElementById('char-menu-btn');
    if (btnChar) btnChar.onclick = openCharacterMenu;

    const btnBackToMap = document.querySelector('.back-to-map-btn');
    if (btnBackToMap) btnBackToMap.onclick = () => showScreen('exploration');

    const btnBack = document.querySelector('.back-btn');
    if (btnBack) btnBack.onclick = () => showScreen('menu');

    const btnAttack = document.getElementById('attack-btn');
    if (btnAttack) btnAttack.onclick = playerAttack;

    const btnFlee = document.getElementById('flee-btn');
    if (btnFlee) btnFlee.onclick = () => {
        log("Sei fuggito!");
        setTimeout(() => showScreen('exploration'), 1000);
    };

    const btnNen = document.getElementById('nen-btn');
    if (btnNen) btnNen.onclick = () => log("Nen non ancora pronto!");

    document.querySelectorAll('.buy-crypto').forEach(btn => {
        btn.onclick = () => handleCryptoPayment(btn.dataset.amount, btn.dataset.reward);
    });
}

function updateSettingsUI() {
    document.getElementById('res-scale').value = GameSettings.graphics.resolutionScale;
    document.getElementById('lod-dist').value = GameSettings.graphics.lodDistance;
    document.getElementById('target-fps').value = GameSettings.graphics.targetFPS;

    const bindings = document.getElementById('key-bindings');
    bindings.innerHTML = '';
    for (let action in GameSettings.controls) {
        const div = document.createElement('div');
        div.className = 'key-row';
        div.innerHTML = `<span>${action.toUpperCase()}</span> <span>${GameSettings.controls[action]}</span>`;
        bindings.appendChild(div);
    }
}

function startNewGame() {
    console.log("Avvio nuova partita...");
    try {
        player = {
            level: 1, exp: 0, nen: 'Nessuno', zeny: 0, hp: 100, maxHp: 100,
            attack: 15, defense: 5, x: 20 * MAP_CONFIG.TILE_SIZE, y: 20 * MAP_CONFIG.TILE_SIZE,
            exploredMap: [], inventory: []
        };
        updateUI();
        showScreen('exploration');
        // Piccolo ritardo per assicurarsi che il DOM sia aggiornato e le dimensioni siano corrette
        requestAnimationFrame(() => {
            initThree();
        });
        console.log("Nuova partita avviata.");
    } catch (e) {
        console.error("Errore durante l'avvio della nuova partita:", e);
    }
}

function saveGame() {
    localStorage.setItem('hxm_v3_save', JSON.stringify(player));
    alert("Progresso 3D Salvato!");
}

function loadGame() {
    const saved = localStorage.getItem('hxm_v3_save');
    if (saved) {
        try {
            player = JSON.parse(saved);
            updateUI();
            showScreen('exploration');
            requestAnimationFrame(() => {
                initThree();
            });
            console.log("Salvataggio caricato.");
        } catch (e) {
            console.error("Errore nel caricamento del salvataggio:", e);
            alert("Salvataggio corrotto.");
        }
    } else {
        alert("Nessun salvataggio trovato.");
    }
}


function showScreen(name) {
    console.log(`Cambio schermata in: ${name}`);
    Object.values(screens).forEach(s => s?.classList.add('hidden'));
    if (screens[name]) {
        screens[name].classList.remove('hidden');
    } else {
        console.error(`Schermata '${name}' non trovata!`);
    }
}

function updateUI() {
    document.getElementById('player-level').innerText = player.level;
    document.getElementById('player-nen').innerText = player.nen;
    document.getElementById('player-zeny').innerText = player.zeny;
}

// --- Battle System (Phaser integrated) ---
function startHunt() {
    if (!monsters || monsters.length === 0) {
        console.warn("Nessun mostro caricato, impossibile iniziare la caccia.");
        return;
    }
    const randomIndex = Math.floor(Math.random() * monsters.length);
    currentMonster = { ...monsters[randomIndex] };
    
    document.getElementById('monster-name').innerText = currentMonster.name;
    updateMonsterHP();
    document.getElementById('battle-log').innerHTML = `<p>ATTENZIONE! Un ${currentMonster.name} ti ha scoperto!</p>`;
    
    showScreen('hunt');
}

function playerAttack() {
    if (!currentMonster) return;
    const damage = Math.max(1, player.attack - (currentMonster.defense || 0) + Math.floor(Math.random() * 5));
    currentMonster.hp -= damage;
    log(`Attacchi: ${damage} danni!`);
    
    if (currentMonster.hp <= 0) winHunt();
    else {
        updateMonsterHP();
        setTimeout(monsterAttack, 600);
    }
}

function monsterAttack() {
    if (!currentMonster) return;
    const damage = Math.max(1, currentMonster.attack - player.defense + Math.floor(Math.random() * 5));
    player.hp -= damage;
    log(`${currentMonster.name} ruggisce e attacca: ${damage} danni!`);
    updateUI();

    if (player.hp <= 0) {
        log("SCONFITTA... Sei tornato al campo base.");
        player.hp = player.maxHp;
        setTimeout(() => showScreen('menu'), 2000);
    }
}

function winHunt() {
    log(`${currentMonster.name} è fuggito o è stato domato!`);
    player.zeny += currentMonster.reward;
    player.exp += currentMonster.exp;
    if (player.exp >= player.level * 100) levelUp();
    updateUI();
    setTimeout(() => showScreen('exploration'), 1500);
}

function levelUp() {
    player.level++;
    player.attack += 5;
    player.maxHp += 20;
    player.hp = player.maxHp;
    log(`LIVELLO AUMENTATO! Sei al LV ${player.level}`);
}

function log(msg) {
    const logEl = document.getElementById('battle-log');
    logEl.innerHTML += `<p>> ${msg}</p>`;
    logEl.scrollTop = logEl.scrollHeight;
}

function updateMonsterHP() {
    const percent = (currentMonster.hp / currentMonster.maxHp) * 100;
    document.getElementById('monster-hp').style.width = percent + '%';
}

function openCharacterMenu() {
    document.getElementById('stat-hp').innerText = `${player.hp}/${player.maxHp}`;
    document.getElementById('stat-atk').innerText = player.attack;
    document.getElementById('stat-def').innerText = player.defense;
    document.getElementById('stat-xp').innerText = player.exp;
    document.getElementById('stat-nen-type').innerText = player.nen;
    showScreen('character');
}

async function handleCryptoPayment(amount, reward) {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const web3 = new Web3(window.ethereum);
            const tx = {
                to: '0x0000000000000000000000000000000000000000',
                from: accounts[0],
                value: web3.utils.toHex(web3.utils.toWei(amount, 'ether')),
            };
            await window.ethereum.request({ method: 'eth_sendTransaction', params: [tx] });
            player.zeny += parseInt(reward);
            updateUI();
            alert("Zeny ricevuti tramite portale Crypto!");
        } catch (e) { alert("Transazione fallita."); }
    } else { alert("MetaMask non trovato."); }
}

// Avvia il gioco al caricamento della pagina
window.addEventListener('DOMContentLoaded', init);
