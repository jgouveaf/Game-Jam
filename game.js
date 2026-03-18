/**
 * Astra Void - Core Game Logic
 * A high-performance, neon-infused space shooter.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const hiScoreVal = document.getElementById('hi-score-val');
const healthBarFill = document.getElementById('health-bar-fill');
const menu = document.getElementById('menu');
const gameOverScreen = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let score = 0;
let hiScore = localStorage.getItem('astra-hi-score') || 0;
let health = 100;
let gameRunning = false;
let animationId;

// Game Settings
const PLAYER_SIZE = 40;
const BULLET_SIZE = 5;
const ENEMY_BASE_SPEED = 2.5;
const SPAWN_INTERVAL = 1500; // ms

// State
let player = { x: 0, y: 0, speed: 7, dx: 0, dy: 0 };
let bullets = [];
let enemies = [];
let particles = [];
let keys = {};
let lastSpawn = 0;

// Configuration
hiScoreVal.textContent = String(hiScore).padStart(6, '0');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
}

window.addEventListener('resize', resize);
resize();

// Input listeners
window.addEventListener('keydown', (e) => (keys[e.code] = true));
window.addEventListener('keyup', (e) => (keys[e.code] = false));

// Particle system
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw() {
        ctx.fillStyle = `hsla(${this.color}, 100%, 70%, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Player laser beam
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 15;
    }

    update() {
        this.y -= this.speed;
    }

    draw() {
        ctx.fillStyle = '#00f7ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f7ff';
        ctx.fillRect(this.x - 2, this.y, 4, 15);
        ctx.shadowBlur = 0;
    }
}

// Enemies
class Enemy {
    constructor() {
        this.x = Math.random() * (canvas.width - 50) + 25;
        this.y = -50;
        this.size = 30 + Math.random() * 20;
        this.speed = ENEMY_BASE_SPEED + (score / 5000) + Math.random();
        this.color = Math.random() * 60 + 260; // Hues around purple/blue
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.strokeStyle = `hsl(${this.color}, 100%, 60%)`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${this.color}, 100%, 60%)`;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.size);
        ctx.lineTo(this.x - this.size/2, this.y);
        ctx.lineTo(this.x + this.size/2, this.y);
        ctx.closePath();
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function spawnEnemy() {
    const now = Date.now();
    if (now - lastSpawn > Math.max(500, SPAWN_INTERVAL - (score / 10))) {
        enemies.push(new Enemy());
        lastSpawn = now;
    }
}

function update() {
    if (!gameRunning) return;

    // Player move
    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 20) player.x -= player.speed;
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - 20) player.x += player.speed;
    if ((keys['ArrowUp'] || keys['KeyW']) && player.y > 20) player.y -= player.speed;
    if ((keys['ArrowDown'] || keys['KeyS']) && player.y < canvas.height - 20) player.y += player.speed;

    // Shoot
    if (keys['Space']) {
        const now = Date.now();
        if (!player.lastShoot || now - player.lastShoot > 180) {
            bullets.push(new Bullet(player.x, player.y - 20));
            player.lastShoot = now;
        }
    }

    // Update bullets
    bullets = bullets.filter(b => b.y > -20);
    bullets.forEach(b => b.update());

    // Update enemies
    spawnEnemy();
    enemies = enemies.filter(e => e.y < canvas.height + 50);
    enemies.forEach(e => e.update());

    // Update particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.update());

    // Collisions: Bullet vs Enemy
    bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
            const dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < e.size) {
                createExplosion(e.x, e.y, e.color);
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
                score += 100;
                scoreVal.textContent = String(score).padStart(6, '0');
            }
        });
    });

    // Collisions: Player vs Enemy
    enemies.forEach((e, ei) => {
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < e.size + 15) {
            health -= 20;
            healthBarFill.style.width = health + '%';
            createExplosion(player.x, player.y, 0); // Red pulse
            enemies.splice(ei, 1);
            
            if (health <= 0) {
                endGame();
            }
        }
    });

    draw();
    animationId = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic grid/stars background would go here, let's just do stars
    ctx.fillStyle = 'white';
    for(let i = 0; i < 50; i++) {
        const x = (Date.now() / 10 + i * 100) % canvas.width;
        const y = (i * 200) % canvas.height;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1.0;

    // Draw Player
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#bd00ff';
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 25);
    ctx.lineTo(player.x - 20, player.y + 15);
    ctx.lineTo(player.x + 20, player.y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw elements
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    particles.forEach(p => p.draw());
}

function startGame() {
    score = 0;
    health = 100;
    bullets = [];
    enemies = [];
    particles = [];
    scoreVal.textContent = '000000';
    healthBarFill.style.width = '100%';
    
    menu.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameRunning = true;
    update();
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    if (score > hiScore) {
        hiScore = score;
        localStorage.setItem('astra-hi-score', hiScore);
        hiScoreVal.textContent = String(hiScore).padStart(6, '0');
    }

    finalScore.textContent = score;
    gameOverScreen.classList.add('active');
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
