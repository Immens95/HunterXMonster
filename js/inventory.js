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
    
    if (!player.inventory || player.inventory.length === 0) {
        invList.innerHTML = '<p class="empty-msg">L\'inventario è vuoto.</p>';
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
