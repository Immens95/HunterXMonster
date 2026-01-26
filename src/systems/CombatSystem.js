
export class CombatSystem {
    constructor(game) {
        this.game = game;
        this.currentMonster = null;
        this.combatMode = 'action';
    }

    startBattle(monster) {
        this.currentMonster = { ...monster };
        this.game.changeState(new HuntState(this.game, this.currentMonster));
    }

    playerAttack() {
        if (!this.currentMonster) return;
        const damage = Math.max(1, this.game.player.attack - (this.currentMonster.defense || 0));
        this.currentMonster.hp -= damage;
        this.checkBattleEnd();
    }

    checkBattleEnd() {
        if (this.currentMonster.hp <= 0) {
            console.log("Mostro sconfitto!");
            this.game.changeState(new ExplorationState(this.game));
        }
    }
}
