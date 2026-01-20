const ITEMS = {
    POTION: { id: 'potion', name: 'Pozione HP', price: 50, effect: (p) => p.hp = Math.min(p.maxHp, p.hp + 50) },
    ANTIDOTE: { id: 'antidote', name: 'Antidoto', price: 30, effect: (p) => p.status = 'normal' }
};

function spawnChests(scene, group, count) {
    for(let i=0; i<count; i++) {
        let cx = Math.floor(Math.random() * (MAP_CONFIG.MAP_WIDTH-2) + 1) * MAP_CONFIG.TILE_SIZE;
        let cy = Math.floor(Math.random() * (MAP_CONFIG.MAP_HEIGHT-2) + 1) * MAP_CONFIG.TILE_SIZE;
        let chest = scene.add.rectangle(cx + MAP_CONFIG.TILE_SIZE/2, cy + MAP_CONFIG.TILE_SIZE/2, 20, 20, 0xe67e22);
        group.add(chest);
    }
}
