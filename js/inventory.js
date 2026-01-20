let inventory = [];

function addToInventory(item) {
    inventory.push(item);
    console.log(`Aggiunto all'inventario: ${item.name}`);
}

function useItem(index, player) {
    const item = inventory[index];
    if (item && item.effect) {
        item.effect(player);
        inventory.splice(index, 1);
        return true;
    }
    return false;
}
