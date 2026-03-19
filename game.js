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
const transitionScreen = document.getElementById('era-transition');

const gameOverScreen = document.getElementById('game-over');
const nextEraNameDisplay = document.getElementById('next-era-name');
const pHealthBar = document.getElementById('p-hp');
const skillSlots = [document.getElementById('slot-1'), document.getElementById('slot-2')];

// --- Eras Definition ---
const ERAS = [
    {
        id: 'prehistoric',
        name: 'IDADE PRÉ-HISTÓRICA',
        bgColor: '#e2d1b0',
        enemyColor: '#8b4513',
        playerColor: '#3d2b1f',
        boss: 'ALPHA REX'
    },
    {
        id: 'medieval',
        name: 'IDADE MÉDIA',
        bgColor: '#f2faff',
        enemyColor: '#7a7a7a',
        playerColor: '#ff0000',
        boss: 'THE DARK KNIGHT'
    },
    {
        id: 'future',
        name: 'MODERNO / FUTURO',
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

    // Remove fundos brancos automaticamente das imagens dos Lutadores
    processTransparentBrawlers();

    // Iniciar Abertura Automaticamente (A pedido do usuario)
    runSplashSequence();
}

function processTransparentBrawlers() {
    function transparentizeImage(imgUrl, callback) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imgUrl;
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, c.width, c.height);
            const data = imgData.data;

            const isWhite = (r, g, b) => r > 240 && g > 240 && b > 240;

            let queue = [];
            const checked = new Uint8Array(c.width * c.height);

            const addIfValid = (x, y) => {
                if(x >= 0 && x < c.width && y >= 0 && y < c.height) {
                    const idx = (y * c.width + x);
                    if(!checked[idx]) {
                        const ptr = idx * 4;
                        if(isWhite(data[ptr], data[ptr+1], data[ptr+2])) {
                            queue.push({x, y});
                            checked[idx] = 1;
                        }
                    }
                }
            };

            // Seed as 4 bordas para o Flood Fill
            for(let x=0; x<c.width; x++) { addIfValid(x, 0); addIfValid(x, c.height-1); }
            for(let y=0; y<c.height; y++) { addIfValid(0, y); addIfValid(c.width-1, y); }

            while(queue.length > 0) {
                const {x, y} = queue.pop();
                const ptr = (y * c.width + x) * 4;
                data[ptr+3] = 0; // Torna transparente!

                addIfValid(x+1, y); addIfValid(x-1, y);
                addIfValid(x, y+1); addIfValid(x, y-1);
            }

            ctx.putImageData(imgData, 0, 0);
            callback(c.toDataURL('image/png'));
        };
    }

    document.querySelectorAll('.char-brawler').forEach(el => {
        const bg = el.style.backgroundImage;
        if(bg && bg.includes('url(')) {
            const url = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
            transparentizeImage(url, (cleanDataUrl) => {
                el.style.backgroundImage = `url('${cleanDataUrl}')`;
            });
        }
    });
}

function runSplashSequence() {
    // Atraso inicial curto por seguranca ao carregar
    setTimeout(() => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Magia para liberar o audio no primeiro clique solto pela tela sem travar a interface
        document.addEventListener('click', () => {
            if(audioCtx.state === 'suspended') audioCtx.resume();
        }, {once: true});
        
        // --- MÚSICA DE SUSPENSE MEDIEVAL (Estilo Castle Crashers) --- //
        const masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.value = 0.5;

        // Bassline pesada (Pulse wave escuro)
        function playBassRiff(timeOffsets) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(65.41, audioCtx.currentTime + timeOffsets); // C2
            osc.frequency.setValueAtTime(65.41, audioCtx.currentTime + timeOffsets + 0.4);
            osc.frequency.setValueAtTime(77.78, audioCtx.currentTime + timeOffsets + 0.45); // Eb2
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, audioCtx.currentTime + timeOffsets);
            filter.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + timeOffsets + 1.5);
            
            gain.gain.setValueAtTime(0, audioCtx.currentTime + timeOffsets);
            gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + timeOffsets + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeOffsets + 1.5);

            osc.connect(filter).connect(gain).connect(masterGain);
            osc.start(audioCtx.currentTime + timeOffsets);
            osc.stop(audioCtx.currentTime + timeOffsets + 1.5);
        }

        // Arpejador rápido estilo masmorra de suspense
        function playArp(noteIndex, time) {
            const freqs = [261.63, 311.13, 392.00, 523.25]; // C4, Eb4, G4, C5 (C minor arpeggio)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle'; // Tom de fantasia
            osc.frequency.value = freqs[noteIndex % freqs.length];
            gain.gain.setValueAtTime(0, audioCtx.currentTime + time);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time + 0.15);
            
            osc.connect(gain).connect(masterGain);
            osc.start(audioCtx.currentTime + time);
            osc.stop(audioCtx.currentTime + time + 0.15);
        }

        // Loop da música de abertura (dura ~12 segundos)
        for(let i = 0; i < 9; i++) {
            // Bass toca a cada 1.5 segundos
            playBassRiff(i * 1.5);
            
            // Arpejo toca notas 8 vezes por compasso (rápido!)
            for(let j = 0; j < 8; j++) {
                playArp(j, (i * 1.5) + (j * 0.1875)); 
            }
        }
    }, 100);

    // 1. Mostrar Godframe (Fade In lento no fundo escuro)
    setTimeout(() => {
        devIntro.classList.remove('hidden');
        devIntro.classList.add('active');
    }, 1000);

    // 2. Transição para o Título (Fade Out Godframe, Fade In Título)
    setTimeout(() => {
        devIntro.classList.remove('active'); // Start crossfade
        
        setTimeout(() => {
            devIntro.classList.add('hidden');
            titleIntro.classList.remove('hidden');
            
            // Trigger Fade In Título
            setTimeout(() => {
                titleIntro.classList.add('active');
            }, 100); 
        }, 3500); // Tempo para o texto Godframe evaporar
    }, 6000); // Tempo segurando The Godframe

    // 3. Fim da splash e Menu Iniciar
    setTimeout(() => {
        titleIntro.classList.remove('active'); // Fade out title
        
        setTimeout(() => {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.classList.add('hidden');
                startMenu.classList.remove('hidden');
                startMenu.classList.add('active');
            }, 2000);
        }, 3500);
    }, 15000); // Title stays for a majestic duration
}

function startGame() {
    currentEraIndex = 0;
    enemiesDefeated = 0;
    player.health = 100;
    player.skills = [];
    
    startMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    showOverworld();
}

function showOverworld() {
    gameState = 'OVERWORLD';
    document.getElementById('hud').classList.add('hidden');
    const overworldMap = document.getElementById('overworld-map');
    overworldMap.classList.remove('hidden');
    overworldMap.classList.add('active');
    
    // Posicionar avatar inicialmente no primeiro node
    updateMapAvatar('node-prehistoric');
    
    // Configurar cliques nos nodes
    document.querySelectorAll('.world-node').forEach(node => {
        node.onclick = () => {
            if (!node.classList.contains('locked')) {
                const worldId = node.getAttribute('data-world');
                selectWorld(worldId, node.id);
            }
        };
    });
}

function updateMapAvatar(nodeId) {
    const node = document.getElementById(nodeId);
    if (!node) return;
    const avatar = document.getElementById('map-player');
    const container = document.querySelector('.map-container');
    
    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const x = nodeRect.left - containerRect.left + (nodeRect.width / 2) - 30;
    const y = nodeRect.top - containerRect.top + (nodeRect.height / 2) - 40;
    
    avatar.style.left = x + 'px';
    avatar.style.top = y + 'px';
}

function selectWorld(worldId, nodeId) {
    updateMapAvatar(nodeId);
    playSelectSound();
    
    setTimeout(() => {
        const eraIdx = ERAS.findIndex(e => e.id === worldId);
        if (eraIdx !== -1) {
            currentEraIndex = eraIdx;
            startActualLevel();
        }
    }, 600);
}

function playSelectSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function startActualLevel() {
    const overworldMap = document.getElementById('overworld-map');
    overworldMap.classList.add('hidden');
    
    updateEraVisuals();
    updateSkillSlots();
    
    document.getElementById('hud').classList.remove('hidden');
    
    gameState = 'PLAYING';
    enemies = [];
    lastUpdate = performance.now();
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
    if (gameState !== 'PLAYING' && gameState !== 'TRANSITION' && gameState !== 'OVERWORLD') return;

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
