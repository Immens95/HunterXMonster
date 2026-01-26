
import { Game } from './core/Game.js';
import { MenuState } from './core/GameState.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.changeState(new MenuState(game));
    
    // Esponi il game globalmente per debug se necessario
    window.game = game;
});
