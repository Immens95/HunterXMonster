function addToInventory(item) {
    if (!player.inventory) player.inventory = [];
    player.inventory.push(item);
    console.log(`Aggiunto all'inventario: ${item.name}`);
    updateUI();
}

function useInventoryItem(index) {
    if (!player.inventory || !player.inventory[index]) return false;
    
    const item = player.inventory[index];
    if (applyItemEffect(item, player)) {
        player.inventory.splice(index, 1);
        updateUI();
        openInventoryMenu(); // Refresh menu
        return true;
    }
    return false;
}

function openInventoryMenu() {
    const invList = document.getElementById('inventory-list');
    if (!invList) return;
    
    invList.innerHTML = '';
    
    // Mostra Carte Mostro
    if (player.monsterCards && player.monsterCards.length > 0) {
        const title = document.createElement('h3');
        title.innerText = "Carte Mostro";
        title.style.fontSize = "0.6rem";
        title.style.color = "var(--rpg-gold)";
        invList.appendChild(title);

        player.monsterCards.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'inventory-item monster-card';
            cardDiv.innerHTML = `
                <div class="item-info">
                    <span class="item-name">🎴 ${card.name}</span>
                    <span class="item-desc">ATK: ${card.stats.atk} | HP: ${card.stats.hp}</span>
                </div>
                <button class="use-btn" onclick="summonMonsterOutside(${index})">EVOCA</button>
            `;
            invList.appendChild(cardDiv);
        });
    }

    const itemTitle = document.createElement('h3');
    itemTitle.innerText = "Oggetti";
    itemTitle.style.fontSize = "0.6rem";
    itemTitle.style.color = "var(--rpg-gold)";
    invList.appendChild(itemTitle);
    
    if (!player.inventory || player.inventory.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'empty-msg';
        msg.innerText = "L'inventario è vuoto.";
        invList.appendChild(msg);
        return;
    }
    
    player.inventory.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-desc">${item.description || ''}</span>
            </div>
            <button class="use-btn" onclick="useInventoryItem(${index})">USA</button>
        `;
        invList.appendChild(itemDiv);
    });
}

function summonMonsterOutside(index) {
    const card = player.monsterCards[index];
    if (typeof spawnAllyMonster === 'function') {
        spawnAllyMonster(card);
    }
    showScreen('exploration');
}

let bestiaryRenderer, bestiaryScene, bestiaryCamera, bestiaryMonster;

function updateBestiaryUI() {
    const list = document.getElementById('bestiary-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!player.monsterCards || player.monsterCards.length === 0) {
        list.innerHTML = '<p style="padding:10px;">Nessuna carta catturata.</p>';
        return;
    }

    player.monsterCards.forEach((card, idx) => {
        const div = document.createElement('div');
        div.className = 'inventory-item monster-card-item';
        div.innerHTML = `<span>🎴 ${card.name}</span>`;
        div.onclick = () => selectBestiaryCard(idx, div);
        list.appendChild(div);
    });

    // Seleziona la prima carta di default
    if (list.firstChild) {
        selectBestiaryCard(0, list.firstChild);
    }
}

function selectBestiaryCard(idx, element) {
    const card = player.monsterCards[idx];
    if (!card) return;
    
    // UI highlight
    document.querySelectorAll('.monster-card-item').forEach(e => e.classList.remove('selected'));
    element.classList.add('selected');

    // Dettagli
    const nameDetail = document.getElementById('card-name-detail');
    const statsDetail = document.getElementById('card-stats-detail');
    const abList = document.getElementById('card-abilities-detail');

    if (nameDetail) nameDetail.innerText = card.name;
    if (statsDetail) statsDetail.innerText = `HP: ${card.stats.hp} | ATK: ${card.stats.atk} | DEF: ${card.stats.def || 0}`;
    
    if (abList) {
        abList.innerHTML = '';
        if (card.abilities) {
            card.abilities.forEach(ab => {
                const span = document.createElement('span');
                span.className = 'ability-tag';
                span.innerText = ab;
                abList.appendChild(span);
            });
        }
    }

    initBestiary3D(card);
}

function initBestiary3D(card) {
    const container = document.getElementById('card-3d-view');
    if (!container) return;
    
    if (!bestiaryRenderer) {
        if (typeof THREE === 'undefined') return;
        bestiaryScene = new THREE.Scene();
        bestiaryCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 1000);
        bestiaryCamera.position.set(0, 40, 150);
        bestiaryCamera.lookAt(0, 30, 0);

        bestiaryRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        bestiaryRenderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(bestiaryRenderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7.5);
        bestiaryScene.add(light);
        bestiaryScene.add(new THREE.AmbientLight(0x404040));
    }

    // Rimuovi mostro precedente
    if (bestiaryMonster) bestiaryScene.remove(bestiaryMonster);

    // Crea visualizzazione basata sui dati della carta
    let geometry, material;
    const type = card.modelData ? card.modelData.type : 'default';
    
    if (type === 'boss') {
        geometry = new THREE.TorusKnotGeometry(15, 5, 100, 16);
        material = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x330000 });
    } else if (type === 'flying') {
        geometry = new THREE.ConeGeometry(20, 40, 4);
        material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    } else {
        geometry = new THREE.CylinderGeometry(20, 20, 60, 8);
        material = new THREE.MeshPhongMaterial({ color: 0x8888ff });
    }
    
    bestiaryMonster = new THREE.Mesh(geometry, material);
    bestiaryMonster.position.y = 30;
    
    // Applica scala se presente
    if (card.modelData && card.modelData.scale) {
        bestiaryMonster.scale.set(card.modelData.scale, card.modelData.scale, card.modelData.scale);
    }
    
    bestiaryScene.add(bestiaryMonster);

    // Loop animazione dedicato
    function render() {
        const screen = document.getElementById('bestiary-screen');
        if (!screen || screen.classList.contains('hidden')) return;
        requestAnimationFrame(render);
        if (bestiaryMonster) bestiaryMonster.rotation.y += 0.01;
        bestiaryRenderer.render(bestiaryScene, bestiaryCamera);
    }
    render();
}
