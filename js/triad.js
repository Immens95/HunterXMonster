/**
 * Triple Triad Implementation for HunterXMonster
 * Logic based on FF8 Triple Triad (3x3 board, 4 values per card)
 */

class TripleTriad {
    constructor() {
        this.board = Array(9).fill(null);
        this.playerHand = [];
        this.opponentHand = [];
        this.turn = 'player'; // 'player' or 'opponent'
        this.selectedCardIndex = null;
        this.isGameOver = false;
        
        this.init();
    }

    init() {
        this.setupBoardUI();
        this.setupEventListeners();
    }

    setupBoardUI() {
        const boardEl = document.querySelector('.triad-board');
        if (!boardEl) return;
        boardEl.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'triad-cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.handleCellClick(i));
            boardEl.appendChild(cell);
        }
    }

    setupEventListeners() {
        const quitBtn = document.getElementById('triad-quit-btn');
        if (quitBtn) {
            quitBtn.onclick = () => {
                if (confirm("Vuoi davvero abbandonare la partita?")) {
                    showScreen('exploration');
                }
            };
        }
    }

    startMatch(opponentCards = null) {
        this.board = Array(9).fill(null);
        this.isGameOver = false;
        this.turn = 'player';
        this.selectedCardIndex = null;
        
        // Setup Player Hand (from captured cards)
        this.playerHand = this.getHandFromInventory();
        
        // Setup Opponent Hand
        this.opponentHand = opponentCards || this.generateOpponentHand();
        
        this.render();
        showScreen('triad');
        this.updateTurnIndicator();
    }

    getHandFromInventory() {
        // Prendi fino a 5 carte dal mazzo del giocatore, o genera alcune base se ne ha poche
        let cards = [...(player.monsterCards || [])];
        if (cards.length > 5) {
            cards = cards.slice(0, 5);
        }
        
        // Se ha meno di 5 carte, aggiungiamo delle carte base temporanee
        while (cards.length < 5) {
            cards.push(this.generateBaseCard());
        }

        return cards.map(c => this.augmentCardData(c, 'player'));
    }

    generateOpponentHand() {
        const hand = [];
        for (let i = 0; i < 5; i++) {
            hand.push(this.augmentCardData(this.generateBaseCard(), 'opponent'));
        }
        return hand;
    }

    generateBaseCard() {
        const baseCards = [
            { name: "Slime", stats: { atk: 10, hp: 50 } },
            { name: "Wolf", stats: { atk: 15, hp: 70 } },
            { name: "Bat", stats: { atk: 12, hp: 40 } }
        ];
        return baseCards[Math.floor(Math.random() * baseCards.length)];
    }

    augmentCardData(card, owner) {
        // Triple Triad values (Up, Right, Down, Left) 1-10
        // Derivate dai parametri reali del mostro
        const atk = card.stats ? card.stats.atk : 10;
        const hp = card.stats ? card.stats.hp : 50;
        
        const vUp = Math.min(10, Math.ceil(atk / 10));
        const vDown = Math.min(10, Math.ceil(hp / 20));
        const vLeft = Math.min(10, Math.ceil((atk + hp) / 30));
        const vRight = Math.min(10, Math.ceil(atk / 12) + 1);

        return {
            ...card,
            owner: owner,
            values: [vUp, vRight, vDown, vLeft],
            id: Math.random().toString(36).substr(2, 9)
        };
    }

    render() {
        this.renderHand('.triad-player-hand', this.playerHand, 'player');
        this.renderHand('.triad-opponent-hand', this.opponentHand, 'opponent');
        this.renderBoard();
    }

    renderHand(selector, hand, type) {
        const container = document.querySelector(selector);
        if (!container) return;
        container.innerHTML = '';
        
        hand.forEach((card, index) => {
            if (card.onBoard) return;
            const cardEl = this.createCardElement(card, type === 'player');
            if (type === 'player' && this.turn === 'player') {
                cardEl.addEventListener('click', () => {
                    this.selectedCardIndex = index;
                    document.querySelectorAll('.triad-player-hand .triad-card').forEach(c => c.classList.remove('selected'));
                    cardEl.classList.add('selected');
                });
                if (this.selectedCardIndex === index) cardEl.classList.add('selected');
            }
            container.appendChild(cardEl);
        });
    }

    createCardElement(card, isPlayer) {
        const el = document.createElement('div');
        el.className = `triad-card ${isPlayer ? 'player' : 'opponent'}`;
        
        // Se è dell'avversario e non è sul tabellone, nascondi i valori (opzionale)
        const showValues = isPlayer || card.onBoard;
        
        el.innerHTML = `
            <div class="card-values">
                <div class="v-up">${card.values[0]}</div>
                <div class="v-right">${card.values[1]}</div>
                <div class="v-down">${card.values[2]}</div>
                <div class="v-left">${card.values[3]}</div>
            </div>
            <div class="card-name" style="position:absolute;bottom:5px;width:100%;text-align:center;font-size:8px;">${card.name}</div>
        `;
        return el;
    }

    renderBoard() {
        const cells = document.querySelectorAll('.triad-cell');
        cells.forEach((cell, i) => {
            cell.innerHTML = '';
            if (this.board[i]) {
                const cardEl = this.createCardElement(this.board[i], this.board[i].owner === 'player');
                cardEl.classList.add('on-board');
                cell.appendChild(cardEl);
            }
        });
    }

    handleCellClick(index) {
        if (this.turn !== 'player' || this.selectedCardIndex === null || this.board[index] || this.isGameOver) return;
        
        const card = this.playerHand[this.selectedCardIndex];
        this.placeCard(index, card);
        this.selectedCardIndex = null;
        
        if (!this.checkGameOver()) {
            this.turn = 'opponent';
            this.updateTurnIndicator();
            setTimeout(() => this.opponentMove(), 1000);
        }
    }

    placeCard(index, card) {
        card.onBoard = true;
        this.board[index] = card;
        this.resolveCaptures(index);
        this.render();
    }

    resolveCaptures(index) {
        const card = this.board[index];
        const neighbors = [
            { pos: index - 3, side: 2, oppSide: 0 }, // Up (checks Down of neighbor)
            { pos: index + 1, side: 1, oppSide: 3 }, // Right (checks Left of neighbor)
            { pos: index + 3, side: 0, oppSide: 2 }, // Down (checks Up of neighbor)
            { pos: index - 1, side: 3, oppSide: 1 }  // Left (checks Right of neighbor)
        ];

        // Valid neighbors constraints
        const isRightEdge = (index % 3 === 2);
        const isLeftEdge = (index % 3 === 0);

        neighbors.forEach(n => {
            if (n.pos < 0 || n.pos > 8) return;
            if (n.side === 1 && isRightEdge) return;
            if (n.side === 3 && isLeftEdge) return;
            
            const neighbor = this.board[n.pos];
            if (neighbor && neighbor.owner !== card.owner) {
                if (card.values[n.side] > neighbor.values[n.oppSide]) {
                    neighbor.owner = card.owner; // Capture!
                }
            }
        });
    }

    opponentMove() {
        if (this.isGameOver) return;
        
        // IA Semplice: trova il primo spazio vuoto e gioca la prima carta disponibile
        const emptyCells = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        const availableCards = this.opponentHand.filter(c => !c.onBoard);
        
        if (emptyCells.length > 0 && availableCards.length > 0) {
            const cellIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const card = availableCards[0];
            this.placeCard(cellIndex, card);
        }

        if (!this.checkGameOver()) {
            this.turn = 'player';
            this.updateTurnIndicator();
        }
    }

    updateTurnIndicator() {
        const el = document.getElementById('triad-turn-indicator');
        if (el) {
            el.innerText = this.turn === 'player' ? "Tuo Turno" : "Turno Avversario";
            el.style.color = this.turn === 'player' ? 'var(--accent-color)' : '#ff416c';
        }
    }

    checkGameOver() {
        if (this.board.every(cell => cell !== null)) {
            this.isGameOver = true;
            this.calculateResult();
            return true;
        }
        return false;
    }

    calculateResult() {
        let pScore = this.board.filter(c => c.owner === 'player').length;
        // Aggiungi carte rimaste in mano (standard TT rules)
        pScore += this.playerHand.filter(c => !c.onBoard).length;
        
        const oScore = 10 - pScore;
        
        let msg = `Fine Partita! Giocatore: ${pScore} - Avversario: ${oScore}\n`;
        if (pScore > 5) {
            msg += "HAI VINTO!";
            player.zeny += 500;
        } else if (pScore < 5) {
            msg += "HAI PERSO...";
        } else {
            msg += "PAREGGIO!";
        }
        
        alert(msg);
        updateUI();
        showScreen('exploration');
    }
}

// Singleton instance
window.tripleTriad = new TripleTriad();