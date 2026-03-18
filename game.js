/**
 * Mythic Mayhem: Prototype Logic
 * A 2.5D Beat 'em up based on Godframe's Game Design.
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const appContainer = document.getElementById('app-container');
const eraBackground = document.getElementById('era-background');
const currentEraLabel = document.getElementById('current-era');
const gameScreens = document.getElementById('game-screens');
const startMenu = document.getElementById('start-menu');
const splashScreen = document.getElementById('splash-screen');
const devIntro = document.getElementById('dev-intro');
const titleIntro = document.getElementById('title-intro');
const pixelMinisContainer = document.getElementById('pixel-minis-container');
const whiteFlash = document.getElementById('white-flash');
const transitionScreen = document.getElementById('era-transition');

const gameOverScreen = document.getElementById('game-over');
const nextEraNameDisplay = document.getElementById('next-era-name');
const pHealthBar = document.getElementById('p-hp');
const skillSlots = [document.getElementById('slot-1'), document.getElementById('slot-2')];

// --- Eras Definition ---
const ERAS = [
    {
        id: 'prehistoric',
        name: 'PREHISTORIC AGE',
        bgColor: '#e2d1b0',
        enemyColor: '#8b4513',
        playerColor: '#3d2b1f',
        boss: 'ALPHA REX'
    },
    {
        id: 'mythic',
        name: 'GREEK MYTHOLOGY',
        bgColor: '#f2faff',
        enemyColor: '#ffd700',
        playerColor: '#ffffff',
        boss: 'ZEUS'
    },
    {
        id: 'future',
        name: 'YEAR 2100',
        bgColor: '#03001c',
        enemyColor: '#ff00ff',
        playerColor: '#00f7ff',
        boss: 'NEO-GOD CORE'
    }
];

// --- Game State ---
let currentEraIndex = 0;
let gameState = 'MENU'; // MENU, PLAYING, TRANSITION, GAMEOVER
let player = {
    x: 0, y: 0, w: 60, h: 90,
    speed: 6,
    health: 100,
    maxHealth: 100,
    skills: [],
    facing: 1, // 1: right, -1: left
    isAttacking: false,
    attackTimer: 0
};
let enemies = [];
let particles = [];
let keys = {};
let score = 0;
let enemiesDefeated = 0;
let lastUpdate = 0;

// --- Initialization ---
function setup() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = 100;
    player.y = canvas.height - 200;
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    document.getElementById('play-btn').onclick = startGame;
    document.getElementById('retry-btn').onclick = startGame;

    // Iniciar Abertura
    runSplashSequence();
}

function runSplashSequence() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTone(freq, type, duration, vol=0.1) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    // 1. Mostrar Godframe + Minis
    setTimeout(() => {
        devIntro.classList.remove('hidden');
        devIntro.classList.add('active');
        playTone(440, 'square', 0.1, 0.05);
        setTimeout(() => playTone(554, 'square', 0.1, 0.05), 150);
        setTimeout(() => playTone(659, 'square', 0.4, 0.05), 300);
        createMiniPixies();
    }, 800);

    // 2. Flash and Title
    setTimeout(() => {
        whiteFlash.classList.add('flash-transition');
        playTone(200, 'sawtooth', 0.5, 0.2);
        playTone(100, 'square', 0.5, 0.3);
        
        setTimeout(() => {
            devIntro.classList.remove('active');
            devIntro.classList.add('hidden');
            
            titleIntro.classList.remove('hidden');
            titleIntro.classList.add('active');
            
            whiteFlash.classList.remove('flash-transition'); // Fades out
            
            // Impact sound
            playTone(880, 'sine', 1.0, 0.1);
            playTone(440, 'triangle', 1.5, 0.2);
        }, 100);
    }, 4500);

    // 3. Fim da splash e Menu Iniciar
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            startMenu.classList.remove('hidden');
            startMenu.classList.add('active');
            playTone(600, 'sine', 0.2);
            playTone(800, 'sine', 0.4);
        }, 1500);
    }, 8500);
}

function createMiniPixies() {
    pixelMinisContainer.innerHTML = '';
    const colors = ['#00f7ff', '#ff00ff', '#ffd700', '#00ff00', '#ff3c00'];
    
    // Matrizes 5x5: 1=cor principal, 2=olho(branco)
    const bodyShapes = [
        [ // Cavaleiro
            0,1,1,1,0,
            1,2,1,2,1,
            1,1,1,1,1,
            0,1,0,1,0,
            1,0,0,0,1
        ],
        [ // Mago
            0,0,1,0,0,
            0,1,1,1,0,
            1,2,1,2,1,
            0,1,1,1,0,
            0,1,0,1,0
        ]
    ];

    for(let i=0; i<6; i++) {
        const mini = document.createElement('div');
        mini.className = 'mini-character';
        const color = colors[i % colors.length];
        const shape = bodyShapes[i % 2];
        
        let boxShadowStr = [];
        const scale = 4; // px size
        for(let py=0; py<5; py++){
            for(let px=0; px<5; px++){
                const val = shape[py*5 + px];
                if(val === 1) boxShadowStr.push(`${px*scale}px ${py*scale}px 0 ${color}`);
                if(val === 2) boxShadowStr.push(`${px*scale}px ${py*scale}px 0 white`);
            }
        }
        
        mini.style.boxShadow = boxShadowStr.join(', ');
        mini.style.width = scale + 'px';
        mini.style.height = scale + 'px';
        mini.style.background = 'transparent';

        mini.style.animationDelay = (i * 0.15) + 's';
        pixelMinisContainer.appendChild(mini);
    }
}

function startGame() {
    currentEraIndex = 0;
    enemiesDefeated = 0;
    player.health = 100;
    player.skills = [];
    updateEraVisuals();
    updateSkillSlots();
    
    startMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameState = 'PLAYING';
    enemies = [];
    requestAnimationFrame(gameLoop);
}

// --- Logic functions ---
function updateEraVisuals() {
    const era = ERAS[currentEraIndex];
    currentEraLabel.textContent = era.name;
    eraBackground.className = 'bg-' + era.id;
    appContainer.style.backgroundColor = era.bgColor;
}

function spawnEnemy() {
    if (enemies.length < 5 && Math.random() < 0.02) {
        const era = ERAS[currentEraIndex];
        enemies.push({
            x: canvas.width + 50,
            y: Math.random() * (canvas.height - 300) + 150,
            w: 50, h: 80,
            health: 30 + (currentEraIndex * 20),
            speed: 2 + currentEraIndex,
            color: era.enemyColor,
            hasSkill: Math.random() < 0.3
        });
    }
}

function checkCollisions() {
    // Attack collision (Player vs Enemy)
    if (player.isAttacking && player.attackTimer === 5) {
        enemies.forEach((en, i) => {
            const dist = Math.hypot((player.x + (player.facing * 40)) - en.x, player.y - en.y);
            if (dist < 80) {
                en.health -= 15;
                createPopup(en.x, en.y, 'POW!');
                if (en.health <= 0) {
                    enemies.splice(i, 1);
                    enemiesDefeated++;
                    if (en.hasSkill) grantSkill();
                    checkEraShift();
                }
            }
        });
    }

    // Enemy vs Player
    enemies.forEach(en => {
        const dist = Math.hypot(player.x - en.x, player.y - en.y);
        if (dist < 40) {
            player.health -= 0.5;
            if (player.health <= 0) endGame();
        }
    });
}

function grantSkill() {
    if (player.skills.length < 2) {
        const newSkill = ["FIRE", "THUNDER", "DASH", "LASER"][Math.floor(Math.random() * 4)];
        player.skills.push(newSkill);
        updateSkillSlots();
        createPopup(player.x, player.y - 50, 'SKILL ABSORBED!', '#ffcc00');
    }
}

function updateSkillSlots() {
    skillSlots.forEach((slot, i) => {
        if (player.skills[i]) {
            slot.textContent = player.skills[i][0];
            slot.classList.remove('empty');
            slot.classList.add('active');
        } else {
            slot.textContent = '';
            slot.classList.add('empty');
            slot.classList.remove('active');
        }
    });
}

function checkEraShift() {
    if (enemiesDefeated >= (currentEraIndex + 1) * 10) {
        if (currentEraIndex < ERAS.length - 1) {
            startTransition();
        } else {
            // Victory flow could go here
            endGame();
        }
    }
}

function startTransition() {
    gameState = 'TRANSITION';
    currentEraIndex++;
    nextEraNameDisplay.textContent = ERAS[currentEraIndex].name;
    transitionScreen.classList.remove('hidden');
    transitionScreen.classList.add('active');
    
    setTimeout(() => {
        transitionScreen.classList.remove('active');
        transitionScreen.classList.add('hidden');
        updateEraVisuals();
        gameState = 'PLAYING';
    }, 3000);
}

function endGame() {
    gameState = 'GAMEOVER';
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');
}

// --- Drawing functions ---
function drawPlayer() {
    const era = ERAS[currentEraIndex];
    ctx.shadowBlur = 10;
    ctx.shadowColor = era.playerColor;

    // Body (simple blocky but cartoonish)
    ctx.fillStyle = era.playerColor;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(player.x - player.w/2, player.y - player.h/2, player.w, player.h, 10);
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x + (player.facing * 15), player.y - 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Attack Motion
    if (player.isAttacking) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        const ax = player.x + (player.facing * 50);
        ctx.arc(ax, player.y, 40, -Math.PI/2, Math.PI/2, player.facing < 0);
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
}

function drawEnemies() {
    enemies.forEach(en => {
        ctx.fillStyle = en.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(en.x - en.w/2, en.y - en.h/2, en.w, en.h, 5);
        ctx.fill();
        ctx.stroke();

        // Skill indicator
        if (en.hasSkill) {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(en.x, en.y - en.h/2 - 10, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function createPopup(x, y, text, color = '#ff3c00') {
    const p = document.createElement('div');
    p.className = 'damage-num';
    p.textContent = text;
    p.style.left = x + 'px';
    p.style.top = (y - 50) + 'px';
    p.style.color = color;
    document.getElementById('popups').appendChild(p);
    setTimeout(() => p.remove(), 800);
}

// --- Main Loop ---
function gameLoop(timestamp) {
    if (gameState !== 'PLAYING' && gameState !== 'TRANSITION') return;

    if (gameState === 'PLAYING') {
        const dt = timestamp - lastUpdate;
        lastUpdate = timestamp;

        // Player Movement
        if (keys['ArrowLeft'] || keys['KeyA']) { player.x -= player.speed; player.facing = -1; }
        if (keys['ArrowRight'] || keys['KeyD']) { player.x += player.speed; player.facing = 1; }
        if (keys['ArrowUp'] || keys['KeyW']) { player.y -= player.speed; }
        if (keys['ArrowDown'] || keys['KeyS']) { player.y += player.speed; }

        // Bounds
        player.x = Math.max(50, Math.min(canvas.width - 50, player.x));
        player.y = Math.max(150, Math.min(canvas.height - 50, player.y));

        // Combat
        if (keys['Space'] && !player.isAttacking) {
            player.isAttacking = true;
            player.attackTimer = 10;
        }
        if (player.attackTimer > 0) {
            player.attackTimer--;
        } else {
            player.isAttacking = false;
        }

        // Enemies update
        spawnEnemy();
        enemies.forEach(en => {
            en.x -= en.speed;
            // Float toward player y
            en.y += (player.y - en.y) * 0.02;
        });
        enemies = enemies.filter(en => en.x > -100);

        checkCollisions();
        
        // HUD Update
        pHealthBar.style.width = player.health + '%';
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw "Road" perspective
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 50);
    ctx.lineTo(canvas.width, canvas.height - 50);
    ctx.lineTo(canvas.width, 150);
    ctx.lineTo(0, 150);
    ctx.fill();

    drawEnemies();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

// Start
setup();
updateEraVisuals();
console.log("Mythic Mayhem Prototype Loaded");
