let monsters = [];
let currentMonster = null;

async function loadMonsters() {
    try {
        const response = await fetch('data/monsters.json');
        monsters = await response.json();
    } catch (e) {
        monsters = [
            { id: 1, name: "Jagras", hp: 100, maxHp: 100, attack: 10, reward: 100, exp: 50 },
            { id: 2, name: "Rathalos", hp: 500, maxHp: 500, attack: 45, reward: 1000, exp: 500 }
        ];
    }
}

function getRandomMonster() {
    const randomIndex = Math.floor(Math.random() * monsters.length);
    return { ...monsters[randomIndex] };
}
