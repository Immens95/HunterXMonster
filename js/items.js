let gameItems = [];

async function loadItems() {
    try {
        const response = await fetch('data/items.json');
        gameItems = await response.json();
        console.log("Oggetti caricati:", gameItems.length);
    } catch (e) {
        console.error("Errore caricamento oggetti, uso fallback:", e);
        gameItems = [
            { id: 'potion', name: 'Pozione HP', price: 50, effect: { type: 'heal', value: 50 } }
        ];
    }
}

function applyItemEffect(item, player) {
    if (!item.effect) return false;
    
    switch(item.effect.type) {
        case 'heal':
            player.hp = Math.min(player.maxHp, player.hp + item.effect.value);
            return true;
        case 'stat_boost':
            player[item.effect.stat] += item.effect.value;
            return true;
        case 'money':
            player.zeny += item.effect.value;
            return true;
        default:
            return false;
    }
}

function getRandomItem() {
    if (gameItems.length === 0) return null;
    const idx = Math.floor(Math.random() * gameItems.length);
    return { ...gameItems[idx] };
}
