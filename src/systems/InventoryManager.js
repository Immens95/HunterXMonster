
export class InventoryManager {
    constructor(game) {
        this.game = game;
        this.items = [];
    }

    addItem(item) {
        const existing = this.items.find(i => i.id === item.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            this.items.push({ ...item, quantity: 1 });
        }
        this.updateUI();
    }

    removeItem(itemId) {
        const index = this.items.findIndex(i => i.id === itemId);
        if (index > -1) {
            if (this.items[index].quantity > 1) {
                this.items[index].quantity--;
            } else {
                this.items.splice(index, 1);
            }
        }
        this.updateUI();
    }

    updateUI() {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        list.innerHTML = '';
        this.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'inventory-item';
            el.innerHTML = `<span>${item.name} x${item.quantity}</span>`;
            list.appendChild(el);
        });
    }
}
