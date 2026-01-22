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
    stamina: 100,
    maxStamina: 100,
    aura: 50,
    maxAura: 50,
    attack: 15,
    defense: 5,
    x: 0,
    y: 0,
    exploredMap: [],
    inventory: [],
    monsterCards: [] // Sistema Carte Mostro
};

// Costanti Combattimento
const COMBAT_MODES = { ACTION: 'action', MENU: 'menu' };
let currentCombatMode = COMBAT_MODES.ACTION;
let combatState = {
    turn: 'player', // per modalità menu
    isDodging: false,
    isParrying: false,
    activeSummon: null,
    rageTimer: 0
};

 // --- Crypto & Web3 Configuration ---
const CRYPTO_CONFIG = {
    WALLET_ADDRESS: '0x0000000000000000000000000000000000000000', // Sostituire con il proprio wallet
    NETWORKS: {
        ETH: { name: 'Ethereum', symbol: 'ETH', chainId: '0x1' },
        BSC: { name: 'Binance Smart Chain', symbol: 'BNB', chainId: '0x38' },
        POLYGON: { name: 'Polygon', symbol: 'MATIC', chainId: '0x89' }
    },
    TOKENS: {
        USDT: { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
        BTC: { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8 } // WBTC su Ethereum
    }
};

let web3;
let userAccount;

async function initWeb3() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                userAccount = accounts[0];
                console.log("Wallet connesso:", userAccount);
            }
        } catch (error) {
            console.error("Errore inizializzazione Web3:", error);
        }
    } else {
        console.warn("MetaMask non trovato.");
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        alert("Installa MetaMask per usare le funzioni Crypto!");
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        log(`Wallet connesso: ${userAccount.substring(0, 6)}...${userAccount.substring(38)}`);
        updateUI();
        return true;
    } catch (error) {
        console.error("Errore connessione wallet:", error);
        return false;
    }
}

async function payWithCrypto(amountInUSD, currency = 'ETH') {
    if (!userAccount) {
        const connected = await connectWallet();
        if (!connected) return;
    }

    try {
        log(`Inizializzazione pagamento ${amountInUSD} USD in ${currency}...`);
        
        if (currency === 'ETH') {
            // Esempio semplificato: 1 ETH = 2500 USD (In produzione servirebbe un oracolo come Chainlink)
            const ethPrice = 2500; 
            const amountInEth = amountInUSD / ethPrice;
            const weiValue = web3.utils.toWei(amountInEth.toFixed(18), 'ether');

            await web3.eth.sendTransaction({
                from: userAccount,
                to: CRYPTO_CONFIG.WALLET_ADDRESS,
                value: weiValue
            });
        } else if (currency === 'USDT' || currency === 'BTC') {
            const tokenAddress = currency === 'USDT' ? CRYPTO_CONFIG.TOKENS.USDT.address : CRYPTO_CONFIG.TOKENS.BTC.address;
            const decimals = currency === 'USDT' ? CRYPTO_CONFIG.TOKENS.USDT.decimals : CRYPTO_CONFIG.TOKENS.BTC.decimals;
            
            const minABI = [
                {
                    "constant": false,
                    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
                    "name": "transfer",
                    "outputs": [{"name": "success", "type": "boolean"}],
                    "type": "function"
                }
            ];
            const contract = new web3.eth.Contract(minABI, tokenAddress);
            // Esempio: 1 BTC = 60000 USD per calcolo approssimativo (in produzione servirebbe un oracolo)
            const price = currency === 'USDT' ? 1 : 60000;
            const amount = amountInUSD / price;
            const value = amount * Math.pow(10, decimals);
            
            await contract.methods.transfer(CRYPTO_CONFIG.WALLET_ADDRESS, web3.utils.toBN(value.toFixed(0))).send({ from: userAccount });
        }

        log("Pagamento completato con successo!");
        return true;
    } catch (error) {
        console.error("Errore pagamento:", error);
        log("Errore durante il pagamento crypto.");
        return false;
    }
}

function openCryptoShop() {
    // Crea il modal se non esiste
    let modal = document.getElementById('crypto-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'crypto-modal';
        modal.className = 'rpg-modal';
        modal.innerHTML = `
            <div class="rpg-modal-content">
                <span class="close-modal">&times;</span>
                <h2>Crypto Shop</h2>
                <p>Acquista potenziamenti con le tue monete preferite!</p>
                <div class="crypto-options">
                    <div class="crypto-item">
                        <span>Potion Pack (10 USD)</span>
                        <div class="buy-buttons">
                            <button onclick="payWithCrypto(10, 'ETH')" class="rpg-button small">Paga ETH</button>
                            <button onclick="payWithCrypto(10, 'USDT')" class="rpg-button small">Paga USDT</button>
                            <button onclick="payWithCrypto(10, 'BTC')" class="rpg-button small">Paga BTC</button>
                        </div>
                    </div>
                </div>
                <div id="crypto-status"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').onclick = () => {
            modal.style.display = 'none';
        };
    }
    modal.style.display = 'flex';
}

function log(msg) {
    const status = document.getElementById('crypto-status');
    if (status) status.innerText = msg;
    console.log(msg);
}

function updateUI() {
    // Aggiorna eventuali elementi UI quando il wallet si connette
}

// --- Combat Data & Skills ---
const PHYSICAL_ATTACKS = [
    { name: "Attacco Rapido", damage: 1.0, crit: 0.1, stamina: 10, effect: null },
    { name: "Colpo Critico", damage: 1.5, crit: 0.4, stamina: 25, effect: "critico" },
    { name: "Affondo", damage: 1.2, crit: 0.2, stamina: 15, effect: "sanguinamento" },
    { name: "Spazzata", damage: 0.8, crit: 0.05, stamina: 20, effect: "stordimento" }
];

const NEN_ABILITIES = [
    { name: "Ten", type: "Difesa", aura: 10, effect: "riduce danni 50%", duration: 2 },
    { name: "Ren", type: "Attacco", aura: 20, effect: "aumenta atk 50%", duration: 3 },
    { name: "Zetsu", type: "Utility", aura: 15, effect: "invisibilità/fuga", duration: 1 },
    { name: "Gyo", type: "Supporto", aura: 5, effect: "scopre debolezze", duration: 1 }
];

// --- Combat UI Logic ---
function setupCombatUI() {
    // Toggle Modalità
    document.getElementById('toggle-action-btn').onclick = () => switchCombatMode(COMBAT_MODES.ACTION);
    document.getElementById('toggle-menu-btn').onclick = () => switchCombatMode(COMBAT_MODES.MENU);

    // Navigazione Menu FF
    document.querySelectorAll('#ff-main-menu button[data-target]').forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.getAttribute('data-target');
            showFFSubmenu(targetId);
        };
    });

    document.querySelectorAll('.back-to-main').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.ff-submenu').forEach(el => el.classList.add('hidden'));
            document.getElementById('ff-main-menu').classList.remove('hidden');
        };
    });

    // Action Mode Buttons
    document.getElementById('action-attack-btn').onclick = () => playerAttackAction();
    document.getElementById('action-dodge-btn').onclick = () => playerDodgeAction();
    document.getElementById('action-parry-btn').onclick = () => playerParryAction();
    document.getElementById('action-nen-btn').onclick = () => playerNenAction();

    // Skill Buttons
    document.getElementById('skill-capture-btn').onclick = tryCaptureMonster;
    document.getElementById('skill-summon-btn').onclick = trySummonMonster;
    document.getElementById('ff-flee-btn').onclick = fleeBattle;
}

function switchCombatMode(mode) {
    currentCombatMode = mode;
    document.getElementById('toggle-action-btn').classList.toggle('active', mode === COMBAT_MODES.ACTION);
    document.getElementById('toggle-menu-btn').classList.toggle('active', mode === COMBAT_MODES.MENU);
    
    document.getElementById('action-ui').classList.toggle('hidden', mode !== COMBAT_MODES.ACTION);
    document.getElementById('menu-ui').classList.toggle('hidden', mode !== COMBAT_MODES.MENU);
    
    log(`Modalità cambiata in: ${mode.toUpperCase()}`);
}

function showFFSubmenu(menuId) {
    document.getElementById('ff-main-menu').classList.add('hidden');
    const menu = document.getElementById(menuId);
    menu.classList.remove('hidden');
    
    const list = menu.querySelector('.submenu-list');
    list.innerHTML = '';

    if (menuId === 'ff-physical-menu') {
        PHYSICAL_ATTACKS.forEach(atk => {
            const btn = document.createElement('button');
            btn.innerHTML = `${atk.name}<br><small>Dmg: x${atk.damage} | Stamina: ${atk.stamina}</small>`;
            btn.onclick = () => executePhysicalAttack(atk);
            list.appendChild(btn);
        });
    } else if (menuId === 'ff-nen-menu') {
        NEN_ABILITIES.forEach(nen => {
            const btn = document.createElement('button');
            btn.innerHTML = `${nen.name}<br><small>${nen.type} | Aura: ${nen.aura}</small>`;
            btn.onclick = () => executeNenAbility(nen);
            list.appendChild(btn);
        });
    } else if (menuId === 'ff-items-menu') {
        if (player.inventory.length === 0) {
            list.innerHTML = '<p class="empty-msg">Nessun oggetto disponibile</p>';
        } else {
            player.inventory.forEach((item, idx) => {
                const btn = document.createElement('button');
                btn.innerHTML = `${item.name} x${item.quantity || 1}`;
                btn.onclick = () => useItemInBattle(item, idx);
                list.appendChild(btn);
            });
        }
    }
}

// --- Combat Execution Logic ---

function startHunt(isLux = false) {
    if (!monsters || monsters.length === 0) return;
    const randomIndex = Math.floor(Math.random() * monsters.length);
    currentMonster = { ...monsters[randomIndex] };
    
    // Logica Lux: se posseduto, potenzia il mostro
    if (isLux) {
        currentMonster.isLux = true;
        currentMonster.name = "Lux " + currentMonster.name;
        currentMonster.maxHp = Math.floor(currentMonster.maxHp * 1.5);
        currentMonster.hp = currentMonster.maxHp;
        currentMonster.attack = Math.floor(currentMonster.attack * 1.3);
        currentMonster.reward = Math.floor(currentMonster.reward * 2);
        currentMonster.exp = Math.floor(currentMonster.exp * 2);
    }
    
    // Transizione Camera 3D verso il "mostro" immaginario
    if (camera && playerMesh) {
        const targetPos = new THREE.Vector3().copy(playerMesh.position).add(new THREE.Vector3(0, 100, -200));
        // Piccola animazione flash
        const overlay = document.querySelector('.crt-overlay');
        if (overlay) {
            overlay.style.backgroundColor = 'white';
            overlay.style.opacity = '0.5';
            setTimeout(() => {
                overlay.style.backgroundColor = 'transparent';
                overlay.style.opacity = '1';
            }, 100);
        }
    }

    document.getElementById('monster-name').innerText = currentMonster.name;
    if (currentMonster.isLux) {
        document.getElementById('monster-name').style.color = "#00ffff";
        document.getElementById('monster-name').style.textShadow = "0 0 10px #00ffff";
    } else {
        document.getElementById('monster-name').style.color = "white";
        document.getElementById('monster-name').style.textShadow = "none";
    }
    updateMonsterHP();
    updatePlayerBattleHUD();
    
    let battleMsg = `<p>SCONTRO AVVIATO: ${currentMonster.name}</p>`;
    if (currentMonster.isLux) {
        battleMsg += `<p style="color:#00ffff; font-size:0.8rem;">ATTENZIONE: Un parassita Lux ha preso il controllo di questa creatura!</p>`;
    }
    document.getElementById('battle-log').innerHTML = battleMsg;
    
    showScreen('hunt');
    setupCombatUI(); // Inizializza pulsanti ogni volta
}

function updatePlayerBattleHUD() {
    document.getElementById('battle-hp-bar').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('battle-stamina-bar').style.width = `${(player.stamina / player.maxStamina) * 100}%`;
    document.getElementById('battle-aura-bar').style.width = `${(player.aura / player.maxAura) * 100}%`;
}

let damageTexts = [];

function spawnDamageText(amount, position, color = 0xff0000) {
    if (!scene) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
    ctx.textAlign = 'center';
    ctx.fillText(amount, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.position.copy(position).add(new THREE.Vector3(0, 40, 0));
    sprite.scale.set(40, 40, 1);
    
    scene.add(sprite);
    damageTexts.push({ sprite, life: 1.0 });
}

function updateDamageTexts(delta) {
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const dt = damageTexts[i];
        dt.life -= delta;
        dt.sprite.position.y += 20 * delta; // Sale verso l'alto
        dt.sprite.material.opacity = dt.life;
        
        if (dt.life <= 0) {
            scene.remove(dt.sprite);
            damageTexts.splice(i, 1);
        }
    }
}

// Action Combat
function playerAttackAction() {
    if (player.stamina < 10) { log("Stamina insufficiente!"); return; }
    player.stamina -= 10;
    
    const damage = Math.max(1, player.attack - (currentMonster.defense || 0));
    currentMonster.hp -= damage;
    log(`Attacco Rapido: ${damage} danni!`);
    
    // Pop-up danno 3D
    if (playerMesh) {
        const spawnPos = playerMesh.position.clone().add(new THREE.Vector3(0, 0, -100));
        spawnDamageText(damage, spawnPos);
    }
    
    checkBattleEnd();
    updatePlayerBattleHUD();
    updateMonsterHP();
}

function playerDodgeAction() {
    if (player.stamina < 15) { log("Stamina insufficiente!"); return; }
    player.stamina -= 15;
    combatState.isDodging = true;
    log("Schivata attiva!");
    setTimeout(() => { combatState.isDodging = false; }, 500);
    updatePlayerBattleHUD();
}

function playerParryAction() {
    if (player.stamina < 5) { log("Stamina insufficiente!"); return; }
    player.stamina -= 5;
    combatState.isParrying = true;
    log("Parata attiva!");
    setTimeout(() => { combatState.isParrying = false; }, 800);
    updatePlayerBattleHUD();
}

function playerNenAction() {
    if (player.aura < 10) { log("Aura insufficiente!"); return; }
    player.aura -= 10;
    const damage = player.attack * 2;
    currentMonster.hp -= damage;
    log(`NEN BURST: ${damage} danni!`);
    checkBattleEnd();
    updatePlayerBattleHUD();
    updateMonsterHP();
}

// Menu Combat (Turn-based)
function executePhysicalAttack(atk) {
    if (player.stamina < atk.stamina) { log("Stamina insufficiente!"); return; }
    player.stamina -= atk.stamina;
    
    let damage = player.attack * atk.damage;
    if (Math.random() < atk.crit) {
        damage *= 2;
        log("COLPO CRITICO!");
    }
    
    currentMonster.hp -= Math.floor(damage);
    log(`${atk.name}: ${Math.floor(damage)} danni!`);
    
    // Pop-up danno 3D
    if (playerMesh) {
        const spawnPos = playerMesh.position.clone().add(new THREE.Vector3(0, 0, -100));
        spawnDamageText(Math.floor(damage), spawnPos, atk.crit > 0.3 ? 0xffff00 : 0xff0000);
    }
    
    if (atk.effect) log(`Effetto applicato: ${atk.effect}`);
    
    updatePlayerBattleHUD();
    updateMonsterHP();
    
    if (!checkBattleEnd()) {
        setTimeout(monsterAttack, 800);
    }
}

let nenParticles = null;

function spawnNenParticles(type) {
    if (!scene || !playerMesh) return;
    
    // Rimuovi particelle precedenti
    if (nenParticles) scene.remove(nenParticles);

    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    let particleColor;
    switch(type) {
        case 'Ten': particleColor = new THREE.Color(0x00ff00); break; // Verde (Difesa)
        case 'Ren': particleColor = new THREE.Color(0xff0000); break; // Rosso (Attacco)
        case 'Zetsu': particleColor = new THREE.Color(0x888888); break; // Grigio (Invisibilità)
        case 'Gyo': particleColor = new THREE.Color(0xffff00); break; // Giallo (Percezione)
        default: particleColor = new THREE.Color(0x00ffff);
    }

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = Math.random() * 80;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
        
        colors[i * 3] = particleColor.r;
        colors[i * 3 + 1] = particleColor.g;
        colors[i * 3 + 2] = particleColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    nenParticles = new THREE.Points(geometry, material);
    nenParticles.position.copy(playerMesh.position);
    scene.add(nenParticles);

    // Rimuovi dopo 3 secondi
    setTimeout(() => {
        if (nenParticles) {
            scene.remove(nenParticles);
            nenParticles = null;
        }
    }, 3000);
}

function updateNenParticles(delta) {
    if (!nenParticles || !playerMesh) return;
    
    nenParticles.position.copy(playerMesh.position);
    const positions = nenParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 50 * delta; // Salgono verso l'alto
        if (positions[i + 1] > 80) positions[i + 1] = 0;
    }
    nenParticles.geometry.attributes.position.needsUpdate = true;
    nenParticles.rotation.y += delta * 5;
}

function executeNenAbility(nen) {
    if (player.aura < nen.aura) { log("Aura insufficiente!"); return; }
    player.aura -= nen.aura;
    
    log(`Usi ${nen.name}: ${nen.effect}`);
    spawnNenParticles(nen.name);
    
    updatePlayerBattleHUD();
    if (!checkBattleEnd()) {
        setTimeout(monsterAttack, 800);
    }
}

function useItemInBattle(item, idx) {
    log(`Usi ${item.name}`);
    
    // Logica item
    if (item.effect === "heal") {
        player.hp = Math.min(player.maxHp, player.hp + (item.value || 50));
        log(`Recuperati HP!`);
    } else if (item.effect === "stamina") {
        player.stamina = Math.min(player.maxStamina, player.stamina + (item.value || 50));
        log(`Recuperata Stamina!`);
    } else if (item.effect === "aura") {
        player.aura = Math.min(player.maxAura, player.aura + (item.value || 30));
        log(`Recuperata Aura!`);
    }

    player.inventory.splice(idx, 1);
    showFFSubmenu('ff-items-menu'); // Refresh
    updatePlayerBattleHUD();
    setTimeout(monsterAttack, 800);
}

function monsterAttack() {
    if (!currentMonster || currentMonster.hp <= 0) return;
    
    // Attacco Speciale Lux
    if (currentMonster.isLux && Math.random() < 0.3) {
        log("<span style='color:#00ffff;'>ATTACCO MENTALE LUX! Lo spirito ignora la tua difesa fisica.</span>");
        let luxDamage = Math.floor(currentMonster.attack * 0.8);
        player.hp -= luxDamage;
        if (playerMesh) spawnDamageText(luxDamage, playerMesh.position, 0x00ffff);
        updatePlayerBattleHUD();
        checkPlayerDeath();
        return;
    }
    
    let damage = Math.max(1, currentMonster.attack - player.defense);
    
    if (combatState.isDodging) {
        log(`${currentMonster.name} attacca ma schivi agilmente!`);
        return;
    }
    
    if (combatState.isParrying) {
        damage = Math.floor(damage * 0.2);
        log(`${currentMonster.name} attacca ma pari il colpo!`);
    }

    player.hp -= damage;
    log(`${currentMonster.name} attacca: ${damage} danni!`);
    
    // Pop-up danno 3D sul giocatore
    if (playerMesh) {
        spawnDamageText(damage, playerMesh.position, 0xffffff);
    }
    
    updatePlayerBattleHUD();
    checkPlayerDeath();
}

function checkPlayerDeath() {
    if (player.hp <= 0) {
        log("SCONFITTA...");
        // Reset player stats
        player.hp = player.maxHp;
        player.stamina = player.maxStamina;
        player.aura = player.maxAura;
        setTimeout(() => showScreen('menu'), 2000);
    }
}

function checkBattleEnd() {
    if (currentMonster.hp <= 0) {
        winHunt();
        return true;
    }
    return false;
}

function fleeBattle() {
    log("Fuga riuscita!");
    setTimeout(() => showScreen('exploration'), 1000);
}

// --- Monster Card System ---

function tryCaptureMonster() {
    if (currentMonster.isLux) {
        log("ERRORE: Impossibile catturare una creatura posseduta dai Lux! La loro mente parassita protegge il corpo.");
        return;
    }
    const hpRatio = currentMonster.hp / currentMonster.maxHp;
    const captureChance = 0.1 + (1.0 - hpRatio) * 0.7; // Bonus chance se HP bassi
    
    log(`Tentativo di cattura su ${currentMonster.name}...`);
    
    // Effetto flash cattura
    const screen = document.getElementById('hunt-screen');
    if (screen) {
        screen.style.filter = 'brightness(3) contrast(2)';
        setTimeout(() => { screen.style.filter = 'none'; }, 300);
    }

    if (Math.random() < captureChance) {
        const card = {
            id: currentMonster.id,
            name: currentMonster.name,
            stats: { 
                atk: currentMonster.attack, 
                hp: currentMonster.maxHp,
                def: currentMonster.defense || 0
            },
            modelData: {
                type: currentMonster.id,
                scale: currentMonster.scale || 1
            },
            abilities: currentMonster.abilities || ["Rage Burst"],
            type: "Monster",
            timestamp: Date.now()
        };
        player.monsterCards.push(card);
        log(`✨ SUCCESSO! ${currentMonster.name} è ora una tua Carta! ✨`);
        saveGame();
        setTimeout(() => showScreen('exploration'), 2000);
    } else {
        log("Cattura fallita! Il mostro si libera con rabbia.");
        setTimeout(monsterAttack, 1000);
    }
}

function trySummonMonster() {
    if (!player.monsterCards || player.monsterCards.length === 0) {
        log("Nessuna carta mostro disponibile!");
        return;
    }
    
    const card = player.monsterCards[player.monsterCards.length - 1];
    
    if (combatState.activeSummon) {
        log(`${combatState.activeSummon.name} è già in campo!`);
        return;
    }

    log(`EVOCAZIONE: ${card.name}!`);
    spawnSummonEffect();

    combatState.activeSummon = card;
    combatState.rageTimer = 15; 
    
    log(`${card.name} entra in modalità RAGE! Danni raddoppiati.`);
    
    const rageDamage = card.stats.atk * 2;
    currentMonster.hp -= rageDamage;
    log(`${card.name} colpisce: ${rageDamage} danni!`);
    
    updateMonsterHP();
    checkBattleEnd();
}

function spawnSummonEffect() {
    if (!scene || !playerMesh) return;
    const geo = new THREE.SphereGeometry(50, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(playerMesh.position).add(new THREE.Vector3(0, 50, -100));
    scene.add(sphere);
    
    let scale = 1;
    const interval = setInterval(() => {
        scale += 0.2;
        sphere.scale.set(scale, scale, scale);
        sphere.material.opacity -= 0.05;
        if (sphere.material.opacity <= 0) {
            clearInterval(interval);
            scene.remove(sphere);
        }
    }, 50);
}

// --- 3D Scene Management (Three.js) ---
let scene, camera, renderer, playerMesh, npcMesh, mixer;
let chests = [];
let worldEnemies = [];
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity, direction, clock, loader, loadingManager;

let isPaused = false;
let isTouchDevice = false;
let cameraAngle = 0;
let cameraDistance = 600;
let cameraPitch = 0.8; 
let joystickData = { active: false, x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };

function initLoadingManager() {
    loadingManager = new THREE.LoadingManager();
    const loadingBar = document.getElementById('loading-bar-fill');
    const loadingText = document.getElementById('loading-text');
    const loadingScreen = document.getElementById('loading-screen');

    loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
        console.log(`Inizio caricamento: ${url}. Caricati ${itemsLoaded}/${itemsTotal} elementi.`);
    };

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal) * 100;
        if (loadingBar) loadingBar.style.width = progress + '%';
        if (loadingText) loadingText.innerText = `Caricamento: ${Math.round(progress)}%`;
    };

    loadingManager.onLoad = () => {
        console.log('Tutti gli asset caricati.');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.classList.add('hidden'), 500);
        }
    };

    loadingManager.onError = (url) => {
        console.error('Errore nel caricamento di:', url);
    };
}

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

    initLoadingManager();

    try {
        if (typeof THREE.GLTFLoader === 'undefined') {
            throw new Error("GLTFLoader non trovato.");
        }
        loader = new THREE.GLTFLoader(loadingManager);
        scene = new THREE.Scene();
        
        // Skybox moderna
        const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
        const skybox = cubeTextureLoader.load([
            'assets/textures/skybox/px.jpg', 'assets/textures/skybox/nx.jpg',
            'assets/textures/skybox/py.jpg', 'assets/textures/skybox/ny.jpg',
            'assets/textures/skybox/pz.jpg', 'assets/textures/skybox/nz.jpg'
        ], undefined, undefined, (err) => {
            console.warn("Skybox textures non trovate, uso fallback colore.");
            scene.background = new THREE.Color(0x87ceeb);
        });
        scene.background = skybox;
        
        // Aggiunta Nebbia per profondità
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.0002);
        
        camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
        
        renderer = new THREE.WebGLRenderer({ 
            antialias: GameSettings.graphics.antialias,
            powerPreference: "high-performance",
            precision: "mediump", // Ottimizzazione precisione shader
            alpha: false,
            stencil: false,
            depth: true
        });
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita il pixel ratio per performance
        container.appendChild(renderer.domElement);
        
        // Ottimizzazioni Renderer
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = GameSettings.graphics.shadows;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Assicuriamoci che il canvas sia visibile
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";

        // Debug Cube rimosso o reso invisibile se non necessario, ma lo teniamo per ora
        const debugGeo = new THREE.BoxGeometry(100, 100, 100);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, visible: false });
        const debugCube = new THREE.Mesh(debugGeo, debugMat);
        debugCube.position.set(player.x, 50, player.y);
        scene.add(debugCube);

        window.addEventListener('resize', onWindowResize, false);

        // Lights migliorate
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        // HemisphereLight per colori più naturali
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 500, 0);
        scene.add(hemiLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 500, 200);
        directionalLight.castShadow = GameSettings.graphics.shadows;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);

        // Floor with texture
        const textureLoader = new THREE.TextureLoader(loadingManager);
        const grassTexture = textureLoader.load('assets/textures/grass.jpg');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(100, 100); // Più ripetizioni per texture più fine

        // Terreno Avanzato con Altezze
        const terrainSize = MAP_CONFIG.MAP_WIDTH * MAP_CONFIG.TILE_SIZE * 10;
        const terrainRes = 128; // Risoluzione mesh terreno
        const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainRes, terrainRes);
        
        // Modifica altezze (Heightmap procedurale semplice)
        const vertices = terrainGeo.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] / 500;
            const z = vertices[i + 1] / 500;
            // Rumore per creare colline
            const height = Math.sin(x) * Math.cos(z) * 150 + 
                           Math.sin(x * 2) * 50;
            vertices[i + 2] = height;
        }
        terrainGeo.computeVertexNormals();

        const terrainMat = new THREE.MeshPhongMaterial({ 
            color: 0x3a7d32, 
            map: grassTexture,
            shininess: 5,
            flatShading: false
        });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = GameSettings.graphics.shadows;
        scene.add(terrain);

        // Funzione per ottenere altezza terreno in un punto (per player e nemici)
        window.getTerrainHeight = function(x, z) {
            const nx = x / 500;
            const nz = z / 500;
            return Math.sin(nx) * Math.cos(nz) * 150 + Math.sin(nx * 2) * 50;
        };

        // Popolamento Ambiente (Alberi e Rocce)
        spawnEnvironment();

        // Inizializza Particelle
        initParticles();

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

function spawnEnvironment() {
    const range = 7000;
    const count = 450; // Aumentato ulteriormente
    
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * range;
        const z = (Math.random() - 0.5) * range;
        
        if (Math.abs(x) < 300 && Math.abs(z) < 300) continue;
        
        const rand = Math.random();
        if (rand > 0.85) {
            spawnTree(x, z);
        } else if (rand > 0.75) {
            spawnRock(x, z);
        } else if (rand > 0.70) {
            spawnCrystal(x, z);
        } else if (rand > 0.65) {
            spawnRuins(x, z);
        } else if (rand > 0.4) {
            spawnBush(x, z);
        } else {
            spawnFlower(x, z);
        }
    }
}

function spawnCrystal(x, z) {
    const geo = new THREE.OctahedronGeometry(20 + Math.random() * 20, 0);
    const mat = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff, 
        emissive: 0x005555, 
        transparent: true, 
        opacity: 0.8,
        shininess: 100
    });
    const crystal = new THREE.Mesh(geo, mat);
    crystal.position.set(x, 20, z);
    crystal.rotation.set(Math.random(), Math.random(), Math.random());
    crystal.castShadow = true;
    scene.add(crystal);
    
    // Luce puntiforme per il cristallo
    const light = new THREE.PointLight(0x00ffff, 0.5, 100);
    light.position.set(x, 30, z);
    scene.add(light);
}

function spawnRuins(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
    
    // Colonna caduta
    const colGeo = new THREE.CylinderGeometry(15, 15, 80, 8);
    const col = new THREE.Mesh(colGeo, mat);
    col.rotation.z = Math.PI / 2;
    col.rotation.y = Math.random() * Math.PI;
    col.position.y = 15;
    col.castShadow = true;
    group.add(col);
    
    // Base
    const baseGeo = new THREE.BoxGeometry(40, 20, 40);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 10;
    base.castShadow = true;
    group.add(base);
    
    group.position.set(x, 0, z);
    scene.add(group);
}

function spawnBush(x, z) {
    const group = new THREE.Group();
    const count = 3 + Math.floor(Math.random() * 3);
    
    for(let i=0; i<count; i++) {
        const geo = new THREE.SphereGeometry(15 + Math.random() * 10, 8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: 0x1a4a1a });
        const bushPart = new THREE.Mesh(geo, mat);
        bushPart.position.set(
            (Math.random() - 0.5) * 30,
            10 + Math.random() * 10,
            (Math.random() - 0.5) * 30
        );
        bushPart.castShadow = true;
        bushPart.receiveShadow = true;
        group.add(bushPart);
    }
    
    group.position.set(x, 0, z);
    scene.add(group);
}

function spawnFlower(x, z) {
    const group = new THREE.Group();
    
    // Stem
    const stemGeo = new THREE.CylinderGeometry(1, 1, 20);
    const stemMat = new THREE.MeshPhongMaterial({ color: 0x2d5a27 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 10;
    group.add(stem);
    
    // Petals
    const colors = [0xffffff, 0xffeb3b, 0xf44336, 0xe91e63];
    const petalColor = colors[Math.floor(Math.random() * colors.length)];
    const petalGeo = new THREE.SphereGeometry(5, 8, 8);
    const petalMat = new THREE.MeshPhongMaterial({ color: petalColor });
    
    for(let i=0; i<5; i++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        const angle = (i / 5) * Math.PI * 2;
        petal.position.set(
            Math.cos(angle) * 5,
            20,
            Math.sin(angle) * 5
        );
        group.add(petal);
    }
    
    // Center
    const centerGeo = new THREE.SphereGeometry(4, 8, 8);
    const centerMat = new THREE.MeshPhongMaterial({ color: 0x3e2723 });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 20;
    group.add(center);
    
    group.position.set(x, 0, z);
    group.scale.set(0.5 + Math.random(), 0.5 + Math.random(), 0.5 + Math.random());
    scene.add(group);
}

function spawnTree(x, z) {
    const group = new THREE.Group();
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(15, 20, 100, 8);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4d2926 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 50;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    
    // Leaves (Stylized Low Poly)
    const leavesGeo = new THREE.ConeGeometry(60, 150, 6);
    const leavesMat = new THREE.MeshPhongMaterial({ color: 0x2d5a27 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 150;
    leaves.castShadow = true;
    group.add(leaves);
    
    const leaves2 = leaves.clone();
    leaves2.scale.set(0.8, 0.8, 0.8);
    leaves2.position.y = 190;
    group.add(leaves2);
    
    group.position.set(x, 0, z);
    scene.add(group);
}

function spawnRock(x, z) {
    const geo = new THREE.DodecahedronGeometry(20 + Math.random() * 30, 0);
    const mat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const rock = new THREE.Mesh(geo, mat);
    
    rock.position.set(x, 10, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.scale.y = 0.5 + Math.random();
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}

function spawn3DChest() {
    const geo = new THREE.BoxGeometry(40, 40, 40);
    const mat = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        emissive: 0x332200,
        specular: 0xffffff,
        shininess: 100
    });
    const chest = new THREE.Mesh(geo, mat);
    
    // Random position
    const x = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    
    chest.position.set(x, 20, z);
    chest.castShadow = true;
    scene.add(chest);
    chests.push(chest);
}

function spawn3DEnemy() {
    const isLux = Math.random() < 0.2; // 20% probabilità di essere posseduto dai Lux
    
    const geo = new THREE.IcosahedronGeometry(30, 0);
    const mat = new THREE.MeshPhongMaterial({ 
        color: isLux ? 0x00ffff : 0xff0000, // Azzurro etereo per i Lux
        emissive: isLux ? 0x004444 : 0x550000,
        shininess: isLux ? 100 : 50,
        transparent: isLux,
        opacity: isLux ? 0.8 : 1.0
    });
    const enemy = new THREE.Mesh(geo, mat);
    
    // Aura Lux (solo se posseduto)
    if (isLux) {
        const auraGeo = new THREE.IcosahedronGeometry(35, 1);
        const auraMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            wireframe: true, 
            transparent: true, 
            opacity: 0.3 
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        enemy.add(aura);
        
        // Luce puntiforme per l'effetto "spirito"
        const light = new THREE.PointLight(0x00ffff, 1, 100);
        enemy.add(light);
    }

    const x = (Math.random() - 0.5) * 3000;
    const z = (Math.random() - 0.5) * 3000;
    const y = window.getTerrainHeight ? window.getTerrainHeight(x, z) + 30 : 30;
    
    enemy.position.set(x, y, z);
    enemy.castShadow = true;
    enemy.userData.isLux = isLux; // Memorizziamo lo stato Lux
    
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
    const container = document.getElementById('three-container');
    if (!container || !camera || !renderer) return;

    // Usa le dimensioni reali del container che ora è responsive
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    
    // Su mobile spesso le dimensioni cambiano dopo una rotazione
    setTimeout(() => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    }, 100);
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
let lastAnimateTime = 0;
const targetInterval = 1000 / 60; // 60 FPS target

let particleSystem;

function initParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 5000;
        positions[i * 3 + 1] = Math.random() * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 5000;
        
        // Colore lucciole (giallo/verde tenue)
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 5,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function updateParticles(time) {
    if (!particleSystem) return;
    
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        // Movimento oscillatorio
        positions[i + 1] += Math.sin(time * 0.001 + positions[i]) * 0.1;
        positions[i] += Math.cos(time * 0.001 + positions[i + 1]) * 0.1;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function spawnAllyMonster(card) {
    if (!scene || !playerMesh) return;
    
    // Rimuovi eventuale alleato precedente
    if (combatState.currentAlly) {
        scene.remove(combatState.currentAlly);
    }

    const geo = new THREE.CylinderGeometry(20, 20, 60, 8);
    const mat = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00, 
        emissive: 0x003300,
        transparent: true,
        opacity: 0.8
    });
    const ally = new THREE.Mesh(geo, mat);
    
    // Posiziona l'alleato vicino al giocatore
    ally.position.copy(playerMesh.position).add(new THREE.Vector3(50, 0, 50));
    scene.add(ally);
    combatState.currentAlly = ally;
    
    log(`${card.name} ti accompagna nell'esplorazione!`);
    
    // Animazione di "seguito" semplice nel loop animate
}

function animate(time) {
    if (!scene || isPaused) return;
    animationId = requestAnimationFrame(animate);

    // Limitatore FPS per stabilità
    const delta = clock.getDelta();
    const frameDelta = time - lastAnimateTime;
    
    // Se il frame è troppo veloce, saltiamo (opzionale, Three.js gestisce bene ma aiuta su mobile)
    // if (frameDelta < targetInterval) return; 
    lastAnimateTime = time;
    
    // Supporto Gamepad
    handleGamepadInput();

    if (mixer) mixer.update(delta);

    // Rigenerazione Statistiche
    if (!isPaused) {
        if (player.stamina < player.maxStamina) player.stamina += 5 * delta;
        if (player.aura < player.maxAura) player.aura += 2 * delta;
        
        // Update HUD se in battaglia
        if (screens.hunt && !screens.hunt.classList.contains('hidden')) {
            updatePlayerBattleHUD();
        }
    }

    // Modalità Rage (Summon)
    if (combatState.activeSummon && combatState.rageTimer > 0) {
        combatState.rageTimer -= delta;
        if (combatState.rageTimer <= 0) {
            log(`${combatState.activeSummon.name} torna nella carta.`);
            combatState.activeSummon = null;
        }
    }

    // Aggiorna Particelle Ambientali
    updateParticles(time);
    updateNenParticles(delta);
    updateDamageTexts(delta);

    // Fallback: se playerMesh non è ancora caricato, la camera guarda il centro
    if (playerMesh) {
        // Attrito più veloce per reattività
        velocity.x -= velocity.x * 12.0 * delta;
        velocity.z -= velocity.z * 12.0 * delta;

        // Inversione Controlli: A/Left muove a sinistra (-1), D/Right muove a destra (+1)
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        
        direction.normalize();

        // Se la camera ruota, dobbiamo ruotare anche il vettore di movimento
        if (moveForward || moveBackward || moveLeft || moveRight) {
             const camDir = new THREE.Vector3(direction.x, 0, direction.z);
             camDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
             
             velocity.x -= camDir.x * 4500.0 * delta;
             velocity.z -= camDir.z * 4500.0 * delta;
        }

        playerMesh.position.x += velocity.x * delta;
        playerMesh.position.z += velocity.z * delta;
        
        // Adatta altezza al terreno
        if (window.getTerrainHeight) {
            playerMesh.position.y = window.getTerrainHeight(playerMesh.position.x, playerMesh.position.z);
        }

        // Rotation fluida
        if (moveForward || moveBackward || moveLeft || moveRight) {
            const targetAngle = Math.atan2(-velocity.x, -velocity.z);
            // Interpolazione rotazione per fluidità
            const currentRotation = playerMesh.rotation.y;
            let diff = targetAngle - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            playerMesh.rotation.y += diff * 15.0 * delta;
        }

        // Update player data
        player.x = playerMesh.position.x;
        player.y = playerMesh.position.z;

        // Camera follow fluida
        const camX = playerMesh.position.x + Math.sin(cameraAngle) * cameraDistance;
        const camZ = playerMesh.position.z + Math.cos(cameraAngle) * cameraDistance;
        const camY = cameraDistance * cameraPitch;

        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1);
        camera.lookAt(playerMesh.position);

        // Seguito Alleato (Monster Card)
        if (combatState.currentAlly) {
            const targetPos = playerMesh.position.clone().add(new THREE.Vector3(60, 0, 60));
            combatState.currentAlly.position.lerp(targetPos, 0.05);
            combatState.currentAlly.rotation.y += delta * 2; // Ruota su se stesso
        }

        // Collision with chests
        chests.forEach((chest, index) => {
            if (Math.abs(playerMesh.position.x - chest.position.x) < 50 && 
                Math.abs(playerMesh.position.z - chest.position.z) < 50) {
                scene.remove(chest);
                chests.splice(index, 1);
                
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
            if (Math.abs(playerMesh.position.x - enemy.position.x) < 50 && 
                Math.abs(playerMesh.position.z - enemy.position.z) < 50) {
                const isLux = enemy.userData.isLux;
                scene.remove(enemy);
                worldEnemies.splice(index, 1);
                moveForward = moveBackward = moveLeft = moveRight = false;
                startHunt(isLux);
            }
        });

        // Random Encounter - Ridotto frequenza per fluidità
        if ((moveForward || moveBackward || moveLeft || moveRight) && Math.random() < 0.003) {
            moveForward = moveBackward = moveLeft = moveRight = false;
            const isLux = Math.random() < 0.15; // 15% chance in random encounters
            startHunt(isLux);
        }
    } else {
        camera.position.set(player.x, 400, player.y + 400);
        camera.lookAt(player.x, 0, player.y);
    }

    renderer.render(scene, camera);
}

// --- DOM & Game State Management ---
let screens = {};

async function init() {
    console.log("Inizializzazione gioco...");
    
    // Inizializza il manager di caricamento subito
    initLoadingManager();

    // Verifica caricamento librerie critiche
    if (typeof THREE === 'undefined') {
        console.error("Errore: Three.js non caricato!");
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.innerText = "ERRORE: Motore 3D non trovato!";
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
        inventory: document.getElementById('inventory-screen'),
        triad: document.getElementById('triple-triad-screen')
    };

    try {
        // Inizializza Web3
        await initWeb3();
        
        // Configura i listener
        setupEventListeners();
        
        // Caricamento dati asincrono con caching
        const loadData = async () => {
            const [monsters, items] = await Promise.all([
                loadMonsters(),
                loadItems()
            ]);
            console.log("Dati caricati e pronti.");
        };

        loadData();

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
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // Pulsante Fullscreen
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn(`Errore attivazione fullscreen: ${err.message}`);
                });
                fsBtn.innerHTML = '<span class="icon">❐</span>';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    fsBtn.innerHTML = '<span class="icon">⛶</span>';
                }
            }
        });
    }

    // Pulsante Crypto Shop (Nuovo)
    const cryptoBtn = document.getElementById('crypto-shop-btn');
    if (cryptoBtn) {
        cryptoBtn.addEventListener('click', () => {
            openCryptoShop();
        });
    }

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

    // I pulsanti battaglia ora vengono configurati in setupCombatUI() quando si entra in hunt-screen

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
    const lvl = document.getElementById('player-level');
    const nen = document.getElementById('player-nen');
    const zeny = document.getElementById('player-zeny');
    if (lvl) lvl.innerText = player.level;
    if (nen) nen.innerText = player.nen;
    if (zeny) zeny.innerText = player.zeny;
}

// --- Battle System (Old functions removed, using new system above) ---

function winHunt() {
    log(`${currentMonster.name} è stato sconfitto!`);
    if (currentMonster.isLux) {
        log("<span style='color:#00ffff;'>Lo spirito Lux abbandona l'ospite e svanisce nel nulla...</span>");
        log("<span style='color:#00ffff;'>Hai liberato questa creatura dal parassita.</span>");
    }
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
