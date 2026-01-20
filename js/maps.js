const MAP_CONFIG = {
    TILE_SIZE: 32,
    MAP_WIDTH: 40,
    MAP_HEIGHT: 40
};

function generateMap() {
    return Array(MAP_CONFIG.MAP_HEIGHT).fill().map(() => Array(MAP_CONFIG.MAP_WIDTH).fill(0));
}

function getTileAt(x, y) {
    const tx = Math.floor(x / MAP_CONFIG.TILE_SIZE);
    const ty = Math.floor(y / MAP_CONFIG.TILE_SIZE);
    return { tx, ty };
}
