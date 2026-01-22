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
        if (card.captured) el.classList.add('captured');
        
        // Se è dell'avversario e non è sul tabellone, nascondi i valori (stile FF8)
        const showValues = isPlayer || card.onBoard;
        
        // Determina colore sfondo in base al tipo (se esistente) o nome
        const cardColor = this.getCardColor(card.name);
        
        el.innerHTML = `
            <div class="card-inner" style="width:100%;height:100%;background:radial-gradient(circle at 30% 30%, ${cardColor} 0%, #000 100%);">
                <div class="card-values" style="${showValues ? '' : 'display:none;'}">
                    <div class="v-up">${card.values[0] === 10 ? 'A' : card.values[0]}</div>
                    <div class="v-right">${card.values[1] === 10 ? 'A' : card.values[1]}</div>
                    <div class="v-down">${card.values[2] === 10 ? 'A' : card.values[2]}</div>
                    <div class="v-left">${card.values[3] === 10 ? 'A' : card.values[3]}</div>
                </div>
                <div class="card-name">${card.name}</div>
            </div>
        `;
        return el;
    }

    getCardColor(name) {
        const colors = {
            "Slime": "#00ff00",
            "Wolf": "#888888",
            "Bat": "#440044",
            "Dragon": "#ff0000",
            "Golem": "#8b4513",
            "Duck": "#ffff00"
        };
        return colors[name] || "#3498db";
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
        this.render();
        
        // Sound effect placeholder
        // playSound('card_place');

        // Check captures
        this.checkCaptures(index, card);
    }

    checkCaptures(index, card) {
        const row = Math.floor(index / 3);
        const col = index % 3;
        
        const neighbors = [
            { idx: index - 3, side: 0, oppSide: 2, condition: row > 0 }, // Up
            { idx: index + 1, side: 1, oppSide: 3, condition: col < 2 }, // Right
            { idx: index + 3, side: 2, oppSide: 0, condition: row < 2 }, // Down
            { idx: index - 1, side: 3, oppSide: 1, condition: col > 0 }  // Left
        ];

        let capturedAny = false;
        neighbors.forEach(n => {
            if (n.condition && this.board[n.idx] && this.board[n.idx].owner !== card.owner) {
                const myValue = card.values[n.side];
                const oppValue = this.board[n.idx].values[n.oppSide];
                
                if (myValue > oppValue) {
                    this.board[n.idx].owner = card.owner;
                    this.board[n.idx].captured = true;
                    capturedAny = true;
                }
            }
        });

        if (capturedAny) {
            // Re-render after a tiny delay to allow "place" to be seen
            setTimeout(() => {
                this.render();
                // Reset capture flag for next time
                this.board.forEach(c => { if(c) c.captured = false; });
            }, 300);
        }
    }

    opponentMove() {
        if (this.isGameOver) return;
        
        // IA Migliorata: Valuta le mosse migliori
        const emptyCells = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        const availableCards = this.opponentHand.filter(c => !c.onBoard);
        
        if (emptyCells.length > 0 && availableCards.length > 0) {
            let bestMove = { cell: emptyCells[0], card: availableCards[0], score: -1 };
            
            for (let cellIndex of emptyCells) {
                for (let card of availableCards) {
                    let score = this.evaluateMove(cellIndex, card);
                    if (score > bestMove.score) {
                        bestMove = { cell: cellIndex, card: card, score: score };
                    }
                }
            }
            
            this.placeCard(bestMove.cell, bestMove.card);
        }

        if (!this.checkGameOver()) {
            this.turn = 'player';
            this.updateTurnIndicator();
        }
    }

    evaluateMove(index, card) {
        let score = 0;
        const neighbors = [
            { pos: index - 3, side: 0, oppSide: 2 }, // Up
            { pos: index + 1, side: 1, oppSide: 3 }, // Right
            { pos: index + 3, side: 2, oppSide: 0 }, // Down
            { pos: index - 1, side: 3, oppSide: 1 }  // Left
        ];

        const isRightEdge = (index % 3 === 2);
        const isLeftEdge = (index % 3 === 0);

        neighbors.forEach(n => {
            if (n.pos < 0 || n.pos > 8) return;
            if (n.side === 1 && isRightEdge) return;
            if (n.side === 3 && isLeftEdge) return;

            const neighbor = this.board[n.pos];
            if (neighbor) {
                if (neighbor.owner === 'player') {
                    // Possiamo catturarla?
                    if (card.values[n.side] > neighbor.values[n.oppSide]) {
                        score += 10;
                    }
                } else {
                    // Proteggiamo la nostra? (Meno importante)
                    score += 1;
                }
            } else {
                // Spazio vuoto: meglio avere valori alti verso l'esterno
                score += card.values[n.side] * 0.5;
            }
        });

        return score;
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
        pScore += this.playerHand.filter(c => !c.onBoard).length;
        const oScore = 10 - pScore;
        
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 10000;
            backdrop-filter: blur(10px); animation: fadeIn 0.5s;
        `;
        
        let title = "PAREGGIO!";
        let color = "#fff";
        if (pScore > 5) {
            title = "VITTORIA!";
            color = "var(--accent-color)";
            player.zeny += 1000;
        } else if (pScore < 5) {
            title = "SCONFITTA...";
            color = "#ff416c";
        }
        
        resultOverlay.innerHTML = `
            <h1 style="color: ${color}; font-size: 3rem; text-shadow: 0 0 20px ${color};">${title}</h1>
            <p style="font-size: 1.5rem; margin: 20px 0;">Punteggio: ${pScore} - ${oScore}</p>
            <button class="use-btn" style="padding: 15px 40px; font-size: 1.2rem;">CONTINUA</button>
        `;
        
        document.body.appendChild(resultOverlay);
        
        resultOverlay.querySelector('button').onclick = () => {
            resultOverlay.remove();
            updateUI();
            showScreen('exploration');
        };
    }
}

// Singleton instance
window.tripleTriad = new TripleTriad();