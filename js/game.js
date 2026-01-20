// --- Game Configuration & Constants ---

let phaserGame;
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
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const loader = new THREE.GLTFLoader();
const clock = new THREE.Clock();

function initThree() {
    const container = document.getElementById('three-container');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a472a);
    scene.fog = new THREE.FogExp2(0x1a472a, 0.002);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1 : 1);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 50, 10);
    scene.add(directionalLight);

    // Floor with texture
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('assets/textures/grass.jpg');
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(50, 50);

    const floorGeo = new THREE.PlaneGeometry(MAP_CONFIG.MAP_WIDTH * MAP_CONFIG.TILE_SIZE * 2, MAP_CONFIG.MAP_HEIGHT * MAP_CONFIG.TILE_SIZE * 2);
    const floorMat = new THREE.MeshLambertMaterial({ map: grassTexture });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Load Player Model
    loader.load('assets/models/player.glb', (gltf) => {
        playerMesh = gltf.scene;
        playerMesh.scale.set(40, 40, 40);
        playerMesh.position.set(player.x, 0, player.y);
        scene.add(playerMesh);
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(playerMesh);
            mixer.clipAction(gltf.animations[0]).play(); // Play first animation (usually idle or walk)
        }
    });

    // Load NPC Model
    loader.load('assets/models/npc.glb', (gltf) => {
        npcMesh = gltf.scene;
        npcMesh.scale.set(40, 40, 40);
        npcMesh.position.set(15 * MAP_CONFIG.TILE_SIZE, 0, 15 * MAP_CONFIG.TILE_SIZE);
        scene.add(npcMesh);
    });

    // Chests (keep as cubes for now but maybe add texture)
    for(let i=0; i<15; i++) {
        spawn3DChest();
    }

    camera.position.set(player.x, 400, player.y + 400);
    camera.lookAt(player.x, 0, player.y);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    animate();
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

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = true; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
        case 'ArrowDown': case 'KeyS': moveBackward = true; break;
        case 'ArrowRight': case 'KeyD': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward = false; break;
        case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
}

function animate() {
    if (!scene) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    if (mixer) mixer.update(delta);

    if (playerMesh) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 4000.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 4000.0 * delta;

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
        camera.position.x = playerMesh.position.x;
        camera.position.z = playerMesh.position.z + 400;
        camera.lookAt(playerMesh.position);

        // Collision with chests
        chests.forEach((chest, index) => {
            if (playerMesh.position.distanceTo(chest.position) < 50) {
                scene.remove(chest);
                chests.splice(index, 1);
                const gold = 100 + Math.floor(Math.random() * 200);
                player.zeny += gold;
                updateUI();
                console.log(`Raccolto forziere: +${gold} Zeny`);
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
const screens = {
    menu: document.getElementById('menu-screen'),
    exploration: document.getElementById('exploration-screen'),
    hunt: document.getElementById('hunt-screen'),
    shop: document.getElementById('shop-screen'),
    character: document.getElementById('character-screen')
};

async function init() {
    await loadMonsters();
    setupEventListeners();
}

function setupEventListeners() {
    const btnNewGame = document.getElementById('new-game-btn');
    if (btnNewGame) btnNewGame.onclick = startNewGame;

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

function startNewGame() {
    player = {
        level: 1, exp: 0, nen: 'Nessuno', zeny: 0, hp: 100, maxHp: 100,
        attack: 15, defense: 5, x: 20 * MAP_CONFIG.TILE_SIZE, y: 20 * MAP_CONFIG.TILE_SIZE,
        exploredMap: []
    };
    updateUI();
    initThree();
    showScreen('exploration');
}

function saveGame() {
    localStorage.setItem('hxm_v3_save', JSON.stringify(player));
    alert("Progresso 3D Salvato!");
}

function loadGame() {
    const saved = localStorage.getItem('hxm_v3_save');
    if (saved) {
        player = JSON.parse(saved);
        updateUI();
        initThree();
        showScreen('exploration');
    } else {
        alert("Nessun salvataggio trovato.");
    }
}


function showScreen(name) {
    Object.values(screens).forEach(s => s?.classList.add('hidden'));
    screens[name]?.classList.remove('hidden');
    
    // Resume 3D if needed
}

function updateUI() {
    document.getElementById('player-level').innerText = player.level;
    document.getElementById('player-nen').innerText = player.nen;
    document.getElementById('player-zeny').innerText = player.zeny;
}

// --- Battle System (Phaser integrated) ---
function startHunt() {
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

init();
