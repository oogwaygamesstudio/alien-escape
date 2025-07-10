// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
let GAME_SPEED = 4;
const MIN_OBSTACLE_SPACING = 1500;
const MAX_OBSTACLE_SPACING = 2500;
let OBSTACLE_SPAWN_INTERVAL = 2000;

// Animation constants
const ANIMATION_SPEED = 100; // ms per frame
let lastFrameTime = 0;

// Cloud settings - reduced for mobile performance
const NUM_CLOUDS = window.innerWidth < 768 ? 3 : 6;
const CLOUD_SPEED = 0.5;
const NUM_HILLS = 3;
const WATER_WAVE_SPEED = 0.02;

// Fish settings for water animation
const NUM_FISH = window.innerWidth < 768 ? 2 : 4;
let fish = [];

// Performance settings
const isMobile = window.innerWidth < 768;
const PERFORMANCE_MODE = isMobile;

// Game state
let score = 0;
let isGameOver = false;
let isJumping = false;
let canDoubleJump = false;
let velocityY = 0;
let dinoFrame = 1;
let lastObstacleSpawn = 0;
let lastTapTime = 0;
let clouds = [];
let birds = []; // Flying obstacles
let platforms = []; // Floating Mario-style platforms
let lastPlatformSpawn = 0;
let gameSpeedMultiplier = 1;

// Start screen state
let gameStarted = false;
let previewCanvas = null;
let previewCtx = null;

// Invincibility power-up state
let invincible = false;
let invincibilityTimer = 0;
let invincibilityChargesUsed = 0;
const INVINCIBILITY_DURATION = 3000; // ms
const INVINCIBILITY_SCORE_STEP = 50; // 1 charge per 50 score

function getAvailableInvincibilityCharges() {
    return Math.floor(score / INVINCIBILITY_SCORE_STEP) - invincibilityChargesUsed;
}

function activateInvincibility() {
    if (invincible || getAvailableInvincibilityCharges() <= 0 || isGameOver) return;
    
    invincible = true;
    invincibilityTimer = INVINCIBILITY_DURATION;
    invincibilityChargesUsed++;
    
    console.log('🛡️ Invincibility activated! Duration:', INVINCIBILITY_DURATION/1000, 'seconds');
    console.log('🔢 Charges remaining:', getAvailableInvincibilityCharges());
}

function updateInvincibility(deltaTime) {
    if (invincible) {
        invincibilityTimer -= deltaTime;
        if (invincibilityTimer <= 0) {
            invincible = false;
            invincibilityTimer = 0;
            console.log('🛡️ Invincibility ended');
        }
    }
}

// Boss system variables
let boss = null;
let bossActive = false;
let bossSpawnTime = 0;
let bossJumpTime = 0;
let bossShootTime = 0;
let bossLevel = 1;
let fireballs = [];
let lastBossScore = 0;

// Boss constants
const BOSS_WIDTH = 60;
const BOSS_HEIGHT = 80;
const BOSS_JUMP_FORCE = -8;
const BOSS_GRAVITY = 0.4;
const FIREBALL_SPEED = 3;
const FIREBALL_SIZE = 12;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 400;

// Game objects
const dino = {
    x: 100,
    y: canvas.height - 100,
    width: 40,
    height: 60
};

const obstacles = [];
const ground = {
    y: canvas.height - 40,
    height: 40
};

// 🎵 Simple & Reliable Zen Music System
const zenMusicSources = [
    // Real working free music from Archive.org and other reliable sources
    'https://archive.org/download/kevin-macleod-royalty-free-music/Kevin_MacLeod_-_Floating_Cities.mp3', // Peaceful ambient
    'https://archive.org/download/kevin-macleod-royalty-free-music/Kevin_MacLeod_-_Drifting_at_600_Feet.mp3', // Calm floating music
    'https://archive.org/download/kevin-macleod-royalty-free-music/Kevin_MacLeod_-_Gymnopedie_No_1.mp3', // Classical peaceful
    'https://archive.org/download/FreeMusicArchive/Kai_Engel_-_Irsens_Tale_-_01_Sanguine.mp3', // Ambient zen
    'https://archive.org/download/FreeMusicArchive/Kai_Engel_-_Irsens_Tale_-_06_The_Night_Unfolds.mp3', // Relaxing ambient
    // If external fails, at least this won't be annoying tones
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEA=='
];

let currentZenTrack = 0;
let zenAudio = null;
let musicStarted = false;

function initMusic() {
    try {
        console.log('🎵 Initializing zen music system...');
        
        // Create audio element
        zenAudio = new Audio();
        zenAudio.volume = 0.2; // Gentle volume
        zenAudio.loop = false; // We'll handle track cycling manually
        zenAudio.crossOrigin = "anonymous"; // For better compatibility
        
        // Set up first track
        zenAudio.src = zenMusicSources[currentZenTrack];
        
        // Handle track ending - cycle to next track
        zenAudio.addEventListener('ended', function() {
            console.log('🎵 Track ended, switching to next...');
            currentZenTrack = (currentZenTrack + 1) % (zenMusicSources.length - 1); // Exclude the fallback
            zenAudio.src = zenMusicSources[currentZenTrack];
            zenAudio.play().catch(() => {
                console.log('🎵 Track failed, trying next...');
                tryNextTrack();
            });
        });
        
        // Handle errors and try next track
        zenAudio.addEventListener('error', function() {
            console.log('🎵 Track failed, trying next...');
            tryNextTrack();
        });
        
        zenAudio.addEventListener('canplaythrough', function() {
            console.log('🎵 Music ready!');
        });
        
        console.log('🎵 Music system initialized');
        
    } catch (error) {
        console.log('🔇 Music system failed - will use Web Audio fallback');
        initWebAudioFallback();
    }
}

function tryNextTrack() {
    currentZenTrack = (currentZenTrack + 1) % zenMusicSources.length;
    if (zenAudio && currentZenTrack < zenMusicSources.length - 1) {
        zenAudio.src = zenMusicSources[currentZenTrack];
        zenAudio.play().catch(() => {
            // If this track also fails, try the next one
            if (currentZenTrack < zenMusicSources.length - 2) {
                setTimeout(() => tryNextTrack(), 1000);
            } else {
                // All tracks failed, use Web Audio fallback
                console.log('🔇 All tracks failed, using Web Audio fallback');
                initWebAudioFallback();
                playWebAudioZen();
            }
        });
    } else {
        // Use Web Audio fallback
        initWebAudioFallback();
        playWebAudioZen();
    }
}

function playMusic() {
    if (!musicStarted) {
        musicStarted = true;
        
        if (zenAudio) {
            // Try to play HTML5 audio first
            zenAudio.play().then(() => {
                console.log('🎵 Music playing!');
            }).catch((error) => {
                console.log('🎵 HTML5 audio failed, trying next track');
                tryNextTrack();
            });
        } else {
            // Fallback to Web Audio
            initWebAudioFallback();
            playWebAudioZen();
        }
    }
}

function pauseMusic() {
    if (zenAudio) {
        zenAudio.pause();
    }
    if (zenOscillators) {
        zenOscillators.forEach(osc => {
            try { osc.stop(); } catch(e) {}
        });
    }
    musicStarted = false;
}

// Web Audio fallback for ultimate compatibility
let audioContext = null;
let zenOscillators = [];

function initWebAudioFallback() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        zenOscillators = [];
        console.log('🎵 Web Audio fallback initialized');
    } catch (error) {
        console.log('🔇 No audio support available');
    }
}

function playWebAudioZen() {
    if (!audioContext) return;
    
    // Clean up existing
    zenOscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    zenOscillators = [];
    
    // Create simple zen tones
    const frequencies = [220, 261.63, 329.63, 392]; // A minor chord
    
    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Very gentle volume
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        zenOscillators.push(oscillator);
        
        // Add gentle vibrato
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.frequency.setValueAtTime(0.5, audioContext.currentTime);
        lfo.type = 'sine';
        lfoGain.gain.setValueAtTime(2, audioContext.currentTime);
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        lfo.start();
    });
    
    console.log('🎵 Web Audio zen tones playing');
}

// Music will start automatically when game starts

// Sprite generation code - Improved cute dino
function createDinoSprite(frame) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 44;
    canvas.height = 48;

    function drawCuteDinoBody(bodyOffsetY = 0) {
        // Main body - rounder and cuter (with optional offset for stable running)
        ctx.fillStyle = '#4CAF50'; // Green dino
        ctx.fillRect(8, 16 + bodyOffsetY, 18, 14);
        ctx.fillRect(6, 18 + bodyOffsetY, 22, 10);
        
        // Head - bigger and rounder
        ctx.fillRect(22, 8 + bodyOffsetY, 16, 16);
        ctx.fillRect(20, 10 + bodyOffsetY, 20, 12);
        
        // Cute eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(26, 12 + bodyOffsetY, 4, 4);
        ctx.fillRect(32, 12 + bodyOffsetY, 4, 4);
        
        // Eye pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(27, 13 + bodyOffsetY, 2, 2);
        ctx.fillRect(33, 13 + bodyOffsetY, 2, 2);
        
        // Cute smile
        ctx.fillStyle = '#000000';
        ctx.fillRect(28, 18 + bodyOffsetY, 1, 1);
        ctx.fillRect(29, 19 + bodyOffsetY, 1, 1);
        ctx.fillRect(30, 19 + bodyOffsetY, 1, 1);
        ctx.fillRect(31, 18 + bodyOffsetY, 1, 1);
        
        // Belly
        ctx.fillStyle = '#81C784';
        ctx.fillRect(10, 20 + bodyOffsetY, 14, 8);
        
        // Tail
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(4, 18 + bodyOffsetY, 6, 4);
        ctx.fillRect(2, 16 + bodyOffsetY, 4, 6);
        
        // Cute spikes on back
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(12, 14 + bodyOffsetY, 2, 4);
        ctx.fillRect(16, 12 + bodyOffsetY, 2, 4);
        ctx.fillRect(20, 14 + bodyOffsetY, 2, 4);
    }

    function drawDinoRun1() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Keep body stable, move legs relative to ground
        drawCuteDinoBody(0);
        ctx.fillStyle = '#4CAF50';
        // Back leg - LIFTED UP (running position)
        ctx.fillRect(12, 32, 4, 8); // Short leg (lifted up)
        ctx.fillRect(10, 38, 6, 2); // foot higher up (not touching ground)
        // Front leg - DOWN (touching ground)
        ctx.fillRect(22, 30, 4, 14); // Long leg (extended down)
        ctx.fillRect(20, 42, 6, 2); // foot at ground level
    }

    function drawDinoRun2() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Keep body stable, move legs relative to ground
        drawCuteDinoBody(0);
        ctx.fillStyle = '#4CAF50';
        // Back leg - DOWN (touching ground)
        ctx.fillRect(12, 30, 4, 14); // Long leg (extended down)
        ctx.fillRect(10, 42, 6, 2); // foot at ground level
        // Front leg - LIFTED UP (running position)
        ctx.fillRect(22, 32, 4, 8); // Short leg (lifted up)
        ctx.fillRect(20, 38, 6, 2); // foot higher up (not touching ground)
    }

    function drawDinoJump() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCuteDinoBody(-2); // Slight body adjustment for jump
        // Both legs tucked for jumping
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(12, 28, 4, 10); // Tucked legs
        ctx.fillRect(22, 28, 4, 10);
    }

    switch(frame) {
        case 'run1': drawDinoRun1(); break;
        case 'run2': drawDinoRun2(); break;
        case 'jump': drawDinoJump(); break;
        default: drawCuteDinoBody();
    }
    return canvas;
}

function createCactusSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 20;
    canvas.height = 40;

    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(8, 0, 4, 40);
    ctx.fillRect(4, 10, 12, 4);
    ctx.fillRect(0, 20, 20, 4);

    return canvas;
}

function createGroundSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 32;
    canvas.height = 8;

    const colors = {
        main: '#795548',
        shadow: '#5D4037',
        highlight: '#8D6E63'
    };

    ctx.fillStyle = colors.main;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += 4) {
        for (let y = 0; y < canvas.height; y += 4) {
            if (Math.random() < 0.3) {
                ctx.fillStyle = Math.random() < 0.5 ? colors.shadow : colors.highlight;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    return canvas;
}

function createCloudSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 60;
    canvas.height = 30;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(30, 15, 10, 0, Math.PI * 2);
    ctx.arc(20, 15, 8, 0, Math.PI * 2);
    ctx.arc(40, 15, 8, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
}

function createFishSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 20;
    canvas.height = 12;

    // Fish body
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(4, 4, 10, 4);
    ctx.fillRect(6, 3, 6, 6);
    
    // Fish tail
    ctx.fillStyle = '#FF7043';
    ctx.fillRect(0, 3, 4, 2);
    ctx.fillRect(2, 5, 2, 2);
    
    // Fish head
    ctx.fillStyle = '#FFB74D';
    ctx.fillRect(12, 4, 4, 4);
    
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 5, 1, 1);
    
    // Fins
    ctx.fillStyle = '#FF7043';
    ctx.fillRect(8, 2, 2, 1);
    ctx.fillRect(8, 9, 2, 1);

    return canvas;
}

function createBirdSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 24;
    canvas.height = 16;

    // Bird body - Light red
    ctx.fillStyle = '#FF8A80';
    ctx.fillRect(6, 8, 12, 4);
    ctx.fillRect(8, 6, 8, 8);
    
    // Bird head - Darker light red
    ctx.fillStyle = '#FF5252';
    ctx.fillRect(16, 6, 6, 6);
    
    // Wings - Medium red
    ctx.fillStyle = '#F44336';
    ctx.fillRect(4, 6, 8, 2);
    ctx.fillRect(12, 6, 8, 2);
    
    // Eye - Black (kept same for visibility)
    ctx.fillStyle = '#000000';
    ctx.fillRect(18, 7, 1, 1);
    
    // Beak - Orange (kept same for contrast)
    ctx.fillStyle = '#FFA726';
    ctx.fillRect(22, 8, 2, 2);

    return canvas;
}

function createPlatformSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 60; // Smaller platform
    canvas.height = 12; // Smaller height

    // 🌱 Grassy earth platform
    // Dirt/earth base
    ctx.fillStyle = '#8D6E63'; // Brown earth
    ctx.fillRect(0, 4, canvas.width, canvas.height - 4);
    
    // Darker earth shadows
    ctx.fillStyle = '#5D4037'; // Dark brown
    ctx.fillRect(0, canvas.height - 2, canvas.width, 2); // Bottom shadow
    ctx.fillRect(canvas.width - 1, 4, 1, canvas.height - 4); // Right shadow
    
    // Grass top layer
    ctx.fillStyle = '#4CAF50'; // Green grass
    ctx.fillRect(0, 0, canvas.width, 6);
    
    // Grass texture - small grass blades
    ctx.fillStyle = '#2E7D32'; // Dark green
    for (let x = 0; x < canvas.width; x += 3) {
        const grassHeight = 1 + Math.random() * 2;
        ctx.fillRect(x, 1, 1, grassHeight);
    }
    
    // Light green highlights on grass
    ctx.fillStyle = '#66BB6A'; // Light green
    for (let x = 1; x < canvas.width; x += 4) {
        ctx.fillRect(x, 2, 1, 1);
    }
    
    // Small leaves/flowers scattered
    ctx.fillStyle = '#8BC34A'; // Lime green
    for (let x = 5; x < canvas.width; x += 12) {
        ctx.fillRect(x, 1, 2, 1); // Small leaf
    }

    return canvas;
}

function createBossSprite(level = 1) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = BOSS_WIDTH;
    canvas.height = BOSS_HEIGHT;

    // Boss colors based on level (gets stronger/different each time)
    const colors = [
        '#8B4513', // Brown (level 1)
        '#FF4500', // Red-orange (level 2) 
        '#8B0000', // Dark red (level 3)
        '#4B0082', // Indigo (level 4)
        '#2F4F4F', // Dark slate gray (level 5)
        '#800080', // Purple (level 6)
        '#000000'  // Black (level 7+)
    ];
    
    const bodyColor = colors[Math.min(level - 1, colors.length - 1)];
    const shellColor = level <= 2 ? '#228B22' : '#006400'; // Green shell, darker for higher levels
    
    // Shell/back
    ctx.fillStyle = shellColor;
    ctx.fillRect(10, 20, 40, 35);
    
    // Shell spikes
    ctx.fillStyle = '#FFD700'; // Golden spikes
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(15 + i * 7, 15, 4, 8);
    }
    
    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(15, 35, 30, 25);
    
    // Head
    ctx.fillRect(20, 10, 20, 20);
    
    // Horns
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(18, 5, 3, 8);
    ctx.fillRect(39, 5, 3, 8);
    
    // Eyes (angry)
    ctx.fillStyle = '#FF0000'; // Red eyes
    ctx.fillRect(22, 15, 4, 4);
    ctx.fillRect(34, 15, 4, 4);
    
    // Eye pupils
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(23, 16, 2, 2);
    ctx.fillRect(35, 16, 2, 2);
    
    // Mouth (evil grin)
    ctx.fillStyle = '#000000';
    ctx.fillRect(25, 22, 8, 2);
    
    // Teeth
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(26, 20, 2, 3);
    ctx.fillRect(30, 20, 2, 3);
    ctx.fillRect(34, 20, 2, 3);
    
    // Arms
    ctx.fillStyle = bodyColor;
    ctx.fillRect(5, 30, 10, 20);
    ctx.fillRect(45, 30, 10, 20);
    
    // Claws
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(3, 47, 4, 3);
    ctx.fillRect(53, 47, 4, 3);
    
    // Legs
    ctx.fillStyle = bodyColor;
    ctx.fillRect(18, 60, 8, 15);
    ctx.fillRect(34, 60, 8, 15);
    
    // Feet
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(16, 73, 12, 4);
    ctx.fillRect(32, 73, 12, 4);

    return canvas;
}

function createFireballSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = FIREBALL_SIZE;
    canvas.height = FIREBALL_SIZE;

    // Blue fireball outer glow
    ctx.fillStyle = '#1E88E5'; // Blue
    ctx.fillRect(1, 1, FIREBALL_SIZE - 2, FIREBALL_SIZE - 2);
    
    // Blue fireball core
    ctx.fillStyle = '#42A5F5'; // Light blue
    ctx.fillRect(2, 2, FIREBALL_SIZE - 4, FIREBALL_SIZE - 4);
    
    // Hot blue center
    ctx.fillStyle = '#81D4FA'; // Cyan-blue center
    ctx.fillRect(4, 4, FIREBALL_SIZE - 8, FIREBALL_SIZE - 8);

    return canvas;
}

// Load sprites
let dinoRun1 = createDinoSprite('run1');
let dinoRun2 = createDinoSprite('run2');
let dinoJump = createDinoSprite('jump');
let cactus = createCactusSprite();
let groundTexture = createGroundSprite();
let cloudSprite = createCloudSprite();
let fishSprite = createFishSprite();
let birdSprite = createBirdSprite();
let platformSprite = createPlatformSprite();
let bossSprite = createBossSprite(1); // Initial boss sprite
let fireballSprite = createFireballSprite(); // Now blue fireballs

// Create star array
const stars = [];
const NUM_STARS = 50;

// Initialize stars
function initStars() {
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height / 2),
            size: Math.random() * 2 + 1,
            twinkle: Math.random() * Math.PI
        });
    }
}

// Initialize clouds
function initClouds() {
    for (let i = 0; i < NUM_CLOUDS; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height / 3),
            speed: CLOUD_SPEED * (0.5 + Math.random() * 0.5)
        });
    }
}

// Initialize fish for water animation
function initFish() {
    for (let i = 0; i < NUM_FISH; i++) {
        fish.push({
            x: Math.random() * canvas.width,
            y: canvas.height - Math.random() * 40 - 10,
            speed: GAME_SPEED * 0.3 + Math.random() * 0.5,
            size: 0.5 + Math.random() * 0.5,
            flipX: Math.random() < 0.5,
            animFrame: Math.random() * Math.PI * 2
        });
    }
}

// Add hills array
const hills = [];

// Initialize hills
function initHills() {
    for (let i = 0; i < NUM_HILLS; i++) {
        hills.push({
            x: (canvas.width / NUM_HILLS) * i,
            height: 50 + Math.random() * 30,
            width: canvas.width / 1.5
        });
    }
}

// Game functions
function jump() {
    if (!isGameOver) {
        if (!isJumping) {
            isJumping = true;
            canDoubleJump = true;
            velocityY = JUMP_FORCE;
        } else if (canDoubleJump) {
            velocityY = JUMP_FORCE * 0.9; // Improved double jump force
            canDoubleJump = false;
        }
    }
}

function doubleJump() {
    if (!isGameOver && canDoubleJump) {
        velocityY = JUMP_FORCE * 0.9;
        canDoubleJump = false;
    }
}

function spawnObstacle() {
    const now = Date.now();
    if (now - lastObstacleSpawn > OBSTACLE_SPAWN_INTERVAL) {
        // Calculate speed multiplier with limit after score 40
        if (score <= 40) {
            gameSpeedMultiplier = 1 + (score * 0.02);
        } else {
            gameSpeedMultiplier = 1.8; // Cap at 1.8x speed
        }
        
        const currentSpeed = GAME_SPEED * gameSpeedMultiplier;
        
        // Random size between 0.7 and 1.3
        const size = 0.7 + Math.random() * 0.6;
        
        // Random height variation
        const heightVariation = Math.random() * 10 - 5; // ±5 pixels

        // Ensure minimum spacing for jumpability
        const minSpacing = 200; // Minimum space between obstacles
        const xOffset = Math.random() * 50; // Reduced random offset

        obstacles.push({
            x: canvas.width + xOffset + minSpacing,
            y: ground.y - (40 * size) + heightVariation,
            width: 20 * size,
            height: 40 * size,
            size: size,
            speed: currentSpeed * (0.9 + Math.random() * 0.2) // Reduced speed variation
        });
        
        // Spawn birds after score 20
        if (score > 20 && Math.random() < 0.3) {
            birds.push({
                x: canvas.width + 100,
                y: ground.y - 80 - Math.random() * 40,
                width: 24,
                height: 16,
                speed: currentSpeed * 0.8
            });
        }
        
        lastObstacleSpawn = now;
        
        // Adjusted interval for better spacing
        OBSTACLE_SPAWN_INTERVAL = MIN_OBSTACLE_SPACING + Math.random() * (MAX_OBSTACLE_SPACING - MIN_OBSTACLE_SPACING);
        
        // Spawn multiple obstacles with better spacing
        if (score > 10) {  // After score 10
            const pattern = Math.floor(Math.random() * 4);  // 0, 1, 2, or 3
            
            if (pattern === 1) {  // Two obstacles with proper spacing
                const secondSize = 0.7 + Math.random() * 0.6;
                const spacing = 80 + Math.random() * 60; // Increased spacing
                
                obstacles.push({
                    x: canvas.width + xOffset + minSpacing + spacing,
                    y: ground.y - (40 * secondSize),
                    width: 20 * secondSize,
                    height: 40 * secondSize,
                    size: secondSize,
                    speed: currentSpeed * (0.9 + Math.random() * 0.2)
                });
            } else if (pattern === 2) {  // Three obstacles with gaps
                for (let i = 1; i <= 2; i++) {
                    const extraSize = 0.7 + Math.random() * 0.6;
                    const spacing = 100 + Math.random() * 50; // Better spacing
                    
                    obstacles.push({
                        x: canvas.width + xOffset + minSpacing + (spacing * i),
                        y: ground.y - (40 * extraSize),
                        width: 20 * extraSize,
                        height: 40 * extraSize,
                        size: extraSize,
                        speed: currentSpeed * (0.9 + Math.random() * 0.2)
                    });
                }
            }
        }
    }
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + 60 < 0) {
            cloud.x = canvas.width;
            cloud.y = Math.random() * (canvas.height / 3);
            cloud.speed = CLOUD_SPEED * (0.5 + Math.random() * 0.5);
        }
    });
}

function updateFish() {
    fish.forEach(f => {
        f.x -= f.speed;
        f.animFrame += 0.1;
        if (f.x + 20 < 0) {
            f.x = canvas.width;
            f.y = canvas.height - Math.random() * 40 - 10;
            f.speed = GAME_SPEED * 0.3 + Math.random() * 0.5;
        }
    });
}

function updateBirds() {
    for (let i = birds.length - 1; i >= 0; i--) {
        birds[i].x -= birds[i].speed;
        if (birds[i].x + birds[i].width < 0) {
            birds.splice(i, 1);
        } else if (checkCollision(dino, birds[i]) && !invincible) {
            gameOver();
            return;
        }
    }
}

function spawnPlatform() {
    const now = Date.now();
    
    // Platforms appear after level 25 for advanced gameplay
    if (score > 25 && now - lastPlatformSpawn > (3000 + Math.random() * 3000)) {
        const currentSpeed = GAME_SPEED * gameSpeedMultiplier;
        
        // More random heights with better variation
        const baseHeights = [
            ground.y - 50,  // Very low
            ground.y - 70,  // Low 
            ground.y - 90,  // Medium low
            ground.y - 110, // Medium
            ground.y - 130, // Medium high
            ground.y - 150, // High (still reachable)
        ];
        
        // Add random variation to each height
        const baseHeight = baseHeights[Math.floor(Math.random() * baseHeights.length)];
        const randomVariation = (Math.random() - 0.5) * 20; // ±10 pixels variation
        const finalHeight = baseHeight + randomVariation;
        
        // Random platform sizes (small, medium, large)
        const platformSizes = [
            { width: 40, name: 'small' },   // Small platforms - challenging
            { width: 60, name: 'medium' },  // Medium platforms - balanced
            { width: 80, name: 'large' },   // Large platforms - easier
            { width: 100, name: 'xlarge' }  // Extra large platforms - rare but helpful
        ];
        
        // Weighted random selection (medium more common, xlarge less common)
        const sizeWeights = [25, 40, 30, 5]; // small: 25%, medium: 40%, large: 30%, xlarge: 5%
        const random = Math.random() * 100;
        let selectedSize;
        
        if (random < sizeWeights[0]) {
            selectedSize = platformSizes[0]; // small
        } else if (random < sizeWeights[0] + sizeWeights[1]) {
            selectedSize = platformSizes[1]; // medium
        } else if (random < sizeWeights[0] + sizeWeights[1] + sizeWeights[2]) {
            selectedSize = platformSizes[2]; // large
        } else {
            selectedSize = platformSizes[3]; // xlarge
        }
        
        platforms.push({
            x: canvas.width + 100,
            y: finalHeight,
            width: selectedSize.width,
            height: 12, // Keep height consistent
            speed: currentSpeed,
            size: selectedSize.name // Store size for debugging/effects
        });
        
        console.log(`🏗️ Spawned ${selectedSize.name} platform (${selectedSize.width}px wide) at height ${Math.round(finalHeight)}`);;
        
        lastPlatformSpawn = now;
    }
}

function updatePlatforms() {
    let onPlatform = false;
    
    for (let i = platforms.length - 1; i >= 0; i--) {
        platforms[i].x -= platforms[i].speed;
        
        // Remove platforms that are off screen
        if (platforms[i].x + platforms[i].width < 0) {
            platforms.splice(i, 1);
            continue;
        }
        
        // Check if dino is landing on platform
        if (checkPlatformLanding(dino, platforms[i])) {
            // Snap dino to platform top
            dino.y = platforms[i].y - dino.height;
            isJumping = false;
            velocityY = 0;
            canDoubleJump = true; // Reset double jump when landing
            onPlatform = true;
        }
    }
    
    // If dino is not on any platform and not jumping, check if should fall
    if (!onPlatform && !isJumping && dino.y < ground.y - dino.height) {
        isJumping = true; // Start falling
        velocityY = 0; // Start falling from rest
    }
}

function checkPlatformLanding(dino, platform) {
    // Check if dino is landing on top of the platform
    return dino.x + 10 < platform.x + platform.width &&     // Dino overlaps platform horizontally
           dino.x + dino.width - 10 > platform.x &&          // (with small margin for better feel)
           dino.y + dino.height >= platform.y &&             // Dino is at or below platform top
           dino.y + dino.height <= platform.y + platform.height + 8 && // Within platform thickness + tolerance
           velocityY >= 0;                                    // Only when falling or at peak of jump
}

// Boss System Functions
function shouldSpawnBoss() {
    // Boss appears at score 75, 150, 225, etc. up to 1000
    if (score < 75 || score > 1000) return false;
    
    // Check if we've reached a boss milestone
    const bossScores = [75, 150, 225, 300, 375, 450, 525, 600, 675, 750, 825, 900, 975, 1000];
    return bossScores.includes(score) && score > lastBossScore;
}

function spawnBoss() {
    if (!bossActive && shouldSpawnBoss()) {
        // Calculate boss level based on score (every 75 points)
        bossLevel = Math.floor(score / 75);
        
        // Create new boss sprite with current level
        bossSprite = createBossSprite(bossLevel);
        
        // Boss duration: 15s + 5s for each level above 1
        const baseDuration = 15000; // 15 seconds
        const extraDuration = (bossLevel - 1) * 5000; // +5s per level
        const bossDuration = baseDuration + extraDuration;
        
        boss = {
            x: canvas.width - BOSS_WIDTH - 20, // Right edge
            y: ground.y - BOSS_HEIGHT,
            width: BOSS_WIDTH,
            height: BOSS_HEIGHT,
            velocityY: 0,
            isJumping: false,
            level: bossLevel,
            duration: bossDuration,
            spawnTime: Date.now()
        };
        
        bossActive = true;
        bossSpawnTime = performance.now();
        bossJumpTime = performance.now() + Math.random() * 3000 + 2000; // Jump in 2-5 seconds
        bossShootTime = performance.now() + Math.random() * 2000 + 1000; // Shoot in 1-3 seconds
        lastBossScore = score;
        
        console.log(`🧌 Boss Level ${bossLevel} spawned! Duration: ${bossDuration/1000}s`);
    }
}

function updateBoss(currentTime) {
    if (!bossActive || !boss) return;
    
    // Check if boss duration has ended
    if (currentTime - bossSpawnTime > boss.duration) {
        bossActive = false;
        boss = null;
        console.log('🧌 Boss disappeared!');
        showBossDefeated();
        return;
    }
    
    // Boss jumping behavior
    if (currentTime > bossJumpTime && !boss.isJumping) {
        boss.isJumping = true;
        boss.velocityY = BOSS_JUMP_FORCE;
        // Schedule next jump
        bossJumpTime = currentTime + Math.random() * 4000 + 3000; // 3-7 seconds
        console.log('🧌 Boss jumped!');
    }
    
    // Update boss physics (jumping)
    if (boss.isJumping) {
        boss.y += boss.velocityY;
        boss.velocityY += BOSS_GRAVITY;
        
        if (boss.y >= ground.y - boss.height) {
            boss.y = ground.y - boss.height;
            boss.isJumping = false;
            boss.velocityY = 0;
        }
    }
    
    // Boss shooting behavior
    if (currentTime > bossShootTime) {
        shootFireball();
        // Schedule next shot - faster for higher levels
        const baseInterval = 3000; // 3 seconds
        const levelSpeedup = (boss.level - 1) * 300; // 0.3s faster per level
        const shootInterval = Math.max(baseInterval - levelSpeedup, 1000); // Minimum 1 second
        bossShootTime = currentTime + Math.random() * shootInterval + 500;
        console.log('🔥 Boss shooting scheduled for:', (bossShootTime - currentTime)/1000, 'seconds');
    }
}

function shootFireball() {
    if (!boss) return;
    
    // Calculate trajectory toward player
    const startX = boss.x - 10;
    const startY = boss.y + boss.height / 2;
    const targetX = dino.x + dino.width / 2;
    const targetY = dino.y + dino.height / 2;
    
    // Calculate direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and apply speed
    const velocityX = (dx / distance) * FIREBALL_SPEED;
    const velocityY = (dy / distance) * FIREBALL_SPEED;
    
    fireballs.push({
        x: startX,
        y: startY,
        width: FIREBALL_SIZE,
        height: FIREBALL_SIZE,
        velocityX: velocityX,
        velocityY: velocityY,
        rotation: 0
    });
    
    console.log('🔥 Boss shot fireball!');
}

function updateFireballs() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
        const fireball = fireballs[i];
        
        // Move fireball
        fireball.x += fireball.velocityX;
        fireball.y += fireball.velocityY;
        fireball.rotation += 0.2; // Spinning effect
        
        // Remove if off screen
        if (fireball.x < -50 || fireball.x > canvas.width + 50 || 
            fireball.y < -50 || fireball.y > canvas.height + 50) {
            fireballs.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (checkCollision(dino, fireball) && !invincible) {
            console.log('💥 Player hit by fireball!');
            gameOver();
            return;
        }
    }
}

function showBossDefeated() {
    const bossDefeatedText = document.getElementById('bossDefeated');
    
    // Show the boss defeated message
    bossDefeatedText.classList.add('visible');
    
    // Hide it after 2 seconds
    setTimeout(() => {
        bossDefeatedText.classList.remove('visible');
    }, 2000);
    
    console.log('✅ Boss defeated message shown!');
}

function gameOver() {
    isGameOver = true;
    gameStarted = false; // Reset this so start screen can be shown again
    pauseMusic(); // Use new music system
    
    // Hide original game over elements
    const gameOverText = document.getElementById('gameOver');
    const restartButton = document.getElementById('restartButton');
    gameOverText.classList.remove('visible');
    restartButton.classList.remove('visible');
    
    // Show the new high score screen after a brief delay
    setTimeout(() => {
        if (window.leaderboard && window.leaderboard.checkForHighScore) {
            window.leaderboard.checkForHighScore(score);
        } else {
            console.error('Leaderboard not initialized yet! Score:', score);
        }
    }, 100); // Quick transition without waiting for sound
}

// Start Screen Functions
function initStartScreen() {
    // Get preview canvas
    previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) {
        previewCanvas.width = 600;
        previewCanvas.height = 200;
        previewCtx = previewCanvas.getContext('2d');
    }
    
    // Add event listeners for menu buttons
    const playGameBtn = document.getElementById('playGameBtn');
    const viewHighscoresBtn = document.getElementById('viewHighscoresBtn');
    
    if (playGameBtn) {
        playGameBtn.addEventListener('click', () => {
            startGameFromMenu();
        });
        
        playGameBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startGameFromMenu();
        });
    }
    
    if (viewHighscoresBtn) {
        viewHighscoresBtn.addEventListener('click', () => {
            showHighscoresFromMenu();
        });
        
        viewHighscoresBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showHighscoresFromMenu();
        });
    }
    
    // Start the preview animation
    if (previewCtx) {
        initPreviewElements();
        animatePreview();
    }
    
    console.log('🎮 Start screen initialized');
}

function initPreviewElements() {
    // Initialize a simplified preview of the game
    // This creates a static scene showing the alien and some obstacles
}

function animatePreview() {
    if (!previewCanvas || !previewCtx || gameStarted) return;
    
    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Draw a simplified game preview
    drawPreviewBackground();
            drawPreviewDino();
    drawPreviewObstacles();
    
    // Continue animation
    requestAnimationFrame(animatePreview);
}

function drawPreviewBackground() {
    // Draw space background
    const gradient = previewCtx.createLinearGradient(0, 0, 0, previewCanvas.height);
    gradient.addColorStop(0, '#0B1026');    // Dark blue at top
    gradient.addColorStop(0.5, '#1B2735');  // Midnight blue
    gradient.addColorStop(1, '#2C3E50');    // Lighter blue at bottom
    
    previewCtx.fillStyle = gradient;
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Draw lots of twinkling stars
    previewCtx.fillStyle = 'white';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37 + 20) % previewCanvas.width;
        const y = (i * 23 + 15) % (previewCanvas.height - 40);
        const twinkle = Math.sin(Date.now() / 1000 + i) * 0.5 + 0.5;
        const opacity = twinkle * 0.8 + 0.2;
        const size = Math.random() > 0.8 ? 2 : 1;
        
        previewCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        previewCtx.fillRect(x, y, size, size);
    }
    
    // Draw a beautiful moon
    const moonX = previewCanvas.width - 80;
    const moonY = 30;
    const moonRadius = 25;
    
    // Moon glow
    const moonGradient = previewCtx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius + 15);
    moonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    moonGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    moonGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    previewCtx.fillStyle = moonGradient;
    previewCtx.beginPath();
    previewCtx.arc(moonX, moonY, moonRadius + 15, 0, Math.PI * 2);
    previewCtx.fill();
    
    // Moon surface
    previewCtx.fillStyle = '#F5F5DC';
    previewCtx.beginPath();
    previewCtx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    previewCtx.fill();
    
    // Moon craters
    previewCtx.fillStyle = 'rgba(200, 200, 180, 0.6)';
    previewCtx.beginPath();
    previewCtx.arc(moonX - 8, moonY - 5, 4, 0, Math.PI * 2);
    previewCtx.fill();
    
    previewCtx.beginPath();
    previewCtx.arc(moonX + 5, moonY + 3, 3, 0, Math.PI * 2);
    previewCtx.fill();
    
    previewCtx.beginPath();
    previewCtx.arc(moonX - 3, moonY + 8, 2, 0, Math.PI * 2);
    previewCtx.fill();
    
    // Draw distant hills/mountains
    previewCtx.fillStyle = 'rgba(25, 35, 55, 0.8)';
    previewCtx.beginPath();
    previewCtx.moveTo(0, previewCanvas.height - 20);
    previewCtx.quadraticCurveTo(150, previewCanvas.height - 60, 300, previewCanvas.height - 20);
    previewCtx.quadraticCurveTo(450, previewCanvas.height - 80, 600, previewCanvas.height - 20);
    previewCtx.lineTo(600, previewCanvas.height);
    previewCtx.lineTo(0, previewCanvas.height);
    previewCtx.fill();
    
    // Draw ground
    previewCtx.fillStyle = '#5D4037';
    previewCtx.fillRect(0, previewCanvas.height - 20, previewCanvas.width, 20);
    
    // Add ground texture
    previewCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let x = 0; x < previewCanvas.width; x += 15) {
        const height = 2 + Math.random() * 3;
        previewCtx.fillRect(x, previewCanvas.height - 20, 2, height);
    }
}

function drawPreviewDino() {
    // Draw the dino using the same pixel art style as the game
    const x = 40; // Bottom left position
    const y = previewCanvas.height - 85; // Position so dino is fully visible above ground
    const scale = 1.2; // Slightly smaller scale to ensure full visibility
    
    previewCtx.save();
    previewCtx.translate(x, y);
    previewCtx.scale(scale, scale);
    
    // Use the same pixel art style as the game dino
    // Main body - rounder and cuter
    previewCtx.fillStyle = '#4CAF50'; // Green dino
    previewCtx.fillRect(8, 16, 18, 14);
    previewCtx.fillRect(6, 18, 22, 10);
    
    // Head - bigger and rounder
    previewCtx.fillRect(22, 8, 16, 16);
    previewCtx.fillRect(20, 10, 20, 12);
    
    // Cute eyes
    previewCtx.fillStyle = '#FFFFFF';
    previewCtx.fillRect(26, 12, 4, 4);
    previewCtx.fillRect(32, 12, 4, 4);
    
    // Eye pupils
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(27, 13, 2, 2);
    previewCtx.fillRect(33, 13, 2, 2);
    
    // Cute smile
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(28, 18, 1, 1);
    previewCtx.fillRect(29, 19, 1, 1);
    previewCtx.fillRect(30, 19, 1, 1);
    previewCtx.fillRect(31, 18, 1, 1);
    
    // Belly
    previewCtx.fillStyle = '#81C784';
    previewCtx.fillRect(10, 20, 14, 8);
    
    // Tail
    previewCtx.fillStyle = '#4CAF50';
    previewCtx.fillRect(4, 18, 6, 4);
    previewCtx.fillRect(2, 16, 4, 6);
    
    // Cute spikes on back
    previewCtx.fillStyle = '#2E7D32';
    previewCtx.fillRect(12, 14, 2, 4);
    previewCtx.fillRect(16, 12, 2, 4);
    previewCtx.fillRect(20, 14, 2, 4);
    
    // Legs - standing position
    previewCtx.fillStyle = '#4CAF50';
    previewCtx.fillRect(12, 30, 4, 14);
    previewCtx.fillRect(22, 30, 4, 14);
    
    // Feet
    previewCtx.fillRect(10, 42, 6, 2);
    previewCtx.fillRect(20, 42, 6, 2);
    
    previewCtx.restore();
}

function drawPreviewObstacles() {
    // Don't draw obstacles in the preview - keep it clean and simple
    // The alien is peacefully looking at the moon
}

function showStartScreen() {
    console.log('📱 Showing start screen...');
    const startScreen = document.getElementById('startScreen');
    const gameContainer = document.getElementById('gameContainer');
    
    // Stop music when returning to menu
    pauseMusic();
    
    // Hide game canvas/container completely
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    
    // Show start screen
    startScreen.style.display = 'flex';
    startScreen.classList.remove('hidden'); // Remove any hidden class
    setTimeout(() => {
        startScreen.classList.add('show');
    }, 50);
    gameStarted = false; // Reset game state
}

function hideStartScreen() {
    const startScreen = document.getElementById('startScreen');
    const gameContainer = document.getElementById('gameContainer');
    
    if (startScreen) {
        startScreen.classList.remove('show');
        startScreen.classList.add('hidden');
        setTimeout(() => {
            startScreen.style.display = 'none';
        }, 500);
    }
    
    // Show game container when actually starting game
    if (gameContainer) {
        gameContainer.style.display = 'block';
    }
    
    gameStarted = true;
}

function hideStartScreenTemporarily() {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.classList.remove('show');
        startScreen.classList.add('hidden');
        setTimeout(() => {
            startScreen.style.display = 'none';
        }, 500);
    }
    // DON'T set gameStarted = true, just hide the visual
}

function startGameFromMenu() {
    console.log('🚀 Starting game from menu...');
    hideStartScreen();
    
    // Wait for start screen to fade out before starting game
    setTimeout(() => {
        startGame();
        playMusic(); // Start music when game begins
    }, 300);
}

function showHighscoresFromMenu() {
    console.log('🏆 Showing highscores from menu...');
    if (window.leaderboard && window.leaderboard.showLeaderboard) {
        // Temporarily hide start screen WITHOUT starting the game
        hideStartScreenTemporarily();
        
        // Show leaderboard modal
        setTimeout(() => {
            window.leaderboard.showLeaderboard();
            
            // Add event listener to show start screen again when leaderboard closes
            const leaderboardModal = document.getElementById('leaderboardModal');
            const closeHandler = () => {
                showStartScreen();
                leaderboardModal.removeEventListener('click', closeHandler);
                document.getElementById('closeLeaderboard').removeEventListener('click', closeHandler);
                document.querySelector('.close-btn').removeEventListener('click', closeHandler);
            };
            
            leaderboardModal.addEventListener('click', (e) => {
                if (e.target.id === 'leaderboardModal') {
                    closeHandler();
                }
            });
            
            document.getElementById('closeLeaderboard').addEventListener('click', closeHandler);
            document.querySelector('.close-btn').addEventListener('click', closeHandler);
        }, 300);
    } else {
        console.error('Leaderboard not available yet');
    }
}

function startGame() {
    // Reset game state
    score = 0;
    obstacles.length = 0;
    birds.length = 0;
    platforms.length = 0;
    isGameOver = false;
    gameStarted = true; // Set this to true to enable the game loop
    dino.y = ground.y - dino.height;
    isJumping = false;
    canDoubleJump = false;
    velocityY = 0;
    lastObstacleSpawn = Date.now();
    lastPlatformSpawn = Date.now();
    gameSpeedMultiplier = 1;
    
    // Show game container
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.style.display = 'block';
    }
    
    // Reset boss system
    boss = null;
    bossActive = false;
    bossLevel = 1;
    fireballs.length = 0;
    lastBossScore = 0;
    
    // Initialize game elements if needed
    if (stars.length === 0) initStars();
    if (clouds.length === 0) initClouds();
    if (fish.length === 0) initFish();
    if (hills.length === 0) initHills();
    
    // Hide game over UI
    const gameOverText = document.getElementById('gameOver');
    const restartButton = document.getElementById('restartButton');
    gameOverText.classList.remove('visible');
    restartButton.classList.remove('visible');
    
    // Hide start screen if it's visible
    hideStartScreen();
    
    // Hide high score screen
    if (window.leaderboard) {
        window.leaderboard.hideHighScoreScreen();
    }
    
    // Restart music with new system (but don't auto-start here, let startGameFromMenu handle it)
    // playMusic();
    invincible = false;
    invincibilityTimer = 0;
    invincibilityChargesUsed = 0;
    
    console.log('🎮 Game started!');
}

// Add a proper lastUpdateTime variable for delta time calculation
let lastUpdateTime = 0;

function update(currentTime) {
    if (isGameOver || !gameStarted) return;

    // Calculate proper delta time
    const deltaTime = currentTime - lastUpdateTime;
    lastUpdateTime = currentTime;

    // Update invincibility first (with proper delta time)
    updateInvincibility(deltaTime);

    // Update animation frame based on time
    if (currentTime - lastFrameTime > ANIMATION_SPEED) {
        dinoFrame = dinoFrame === 1 ? 2 : 1;
        lastFrameTime = currentTime;
    }

    // Update dino
    if (isJumping) {
        dino.y += velocityY;
        velocityY += GRAVITY;
        
        if (dino.y >= ground.y - dino.height) {
            dino.y = ground.y - dino.height;
            isJumping = false;
        }
    }

    // Update clouds
    updateClouds();

    // Update fish
    updateFish();

    // Update birds
    updateBirds();

    // Update platforms
    updatePlatforms();

    // Spawn new obstacles
    spawnObstacle();
    
    // Spawn platforms (after score 25)
    spawnPlatform();
    
    // Boss system
    spawnBoss();
    updateBoss(currentTime);
    updateFireballs();

    // Update obstacles with individual speeds
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacles[i].speed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
        } else if (checkCollision(dino, obstacles[i]) && !invincible) {
            gameOver();
            return;
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function draw() {
    // If game hasn't started, just clear and return
    if (!gameStarted) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Night sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0B1026');    // Dark blue at top
    gradient.addColorStop(0.5, '#1B2735');  // Midnight blue
    gradient.addColorStop(1, '#2C3E50');    // Lighter blue at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    stars.forEach(star => {
        star.twinkle += 0.05;
        const opacity = (Math.sin(star.twinkle) + 1) / 2 * 0.7 + 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw distant hills with increased height
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(25, 35, 55, ${0.4 + i * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(-50 + i * 200, ground.y);
        ctx.quadraticCurveTo(
            200 + i * 200, 
            ground.y - 120 - i * 40,  // Increased height significantly
            450 + i * 200, 
            ground.y
        );
        ctx.lineTo(450 + i * 200, ground.y);
        ctx.fill();
    }

    // Draw clouds with slight transparency for night effect
    clouds.forEach(cloud => {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(cloudSprite, cloud.x, cloud.y, 60, 30);  // Updated size from 48,24 to 60,30
        ctx.globalAlpha = 1.0;
    });

    // Draw ground
    ctx.fillStyle = '#5D4037';  // Darker brown for night theme
    ctx.fillRect(0, ground.y, canvas.width, ground.height);
    
    // Add ground texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let x = 0; x < canvas.width; x += 15) {
        const height = 2 + Math.random() * 3;
        ctx.fillRect(x, ground.y, 2, height);
    }

    // Add animated water effect below ground
    const waterGradient = ctx.createLinearGradient(0, ground.y + ground.height, 0, canvas.height);
    waterGradient.addColorStop(0, '#1a2639');   // Darker blue that matches night theme
    waterGradient.addColorStop(0.5, '#0f1827');
    waterGradient.addColorStop(1, '#0f1624');   // Even darker at bottom
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, ground.y + ground.height, canvas.width, canvas.height - (ground.y + ground.height));

    // Draw water waves
    ctx.fillStyle = 'rgba(42, 78, 123, 0.3)';
    for (let x = 0; x < canvas.width; x += 20) {
        const waveHeight = Math.sin((x + score) * 0.02) * 2;
        ctx.fillRect(x, ground.y + ground.height + waveHeight, 20, 4);
    }

    // Draw fish
    fish.forEach(f => {
        ctx.save();
        if (f.flipX) {
            ctx.scale(-1, 1);
            ctx.drawImage(fishSprite, -f.x - 20, f.y + Math.sin(f.animFrame) * 2, 20, 12);
        } else {
            ctx.drawImage(fishSprite, f.x, f.y + Math.sin(f.animFrame) * 2, 20, 12);
        }
        ctx.restore();
    });

    // Draw dino with enhanced invincibility effect
    const currentDinoSprite = isJumping ? dinoJump : (dinoFrame === 1 ? dinoRun1 : dinoRun2);
    if (invincible) {
        // Multiple layers of effects for dramatic visibility
        ctx.save();
        
        // Bright glow effect
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Pulsing brightness and color
        const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.filter = 'brightness(2) saturate(3) hue-rotate(45deg)';
        
        // Draw dino with golden tint
        ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);
        ctx.restore();
        
        // Add sparkle effects around dino
        for (let i = 0; i < 8; i++) {
            const angle = (Date.now() / 200 + i * Math.PI / 4) % (Math.PI * 2);
            const sparkleX = dino.x + dino.width/2 + Math.cos(angle) * 35;
            const sparkleY = dino.y + dino.height/2 + Math.sin(angle) * 25;
            const sparkleAlpha = Math.sin(Date.now() / 150 + i) * 0.5 + 0.5;
            
            ctx.save();
            ctx.fillStyle = `rgba(255, 215, 0, ${sparkleAlpha})`;
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Normal dino on top for visibility
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);
        ctx.restore();
        
    } else {
        ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);
    }

    // Draw obstacles
    for (const obstacle of obstacles) {
        ctx.drawImage(cactus, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }

    // Draw birds
    for (const bird of birds) {
        ctx.drawImage(birdSprite, bird.x, bird.y, bird.width, bird.height);
    }

    // Draw platforms
    for (const platform of platforms) {
        ctx.drawImage(platformSprite, platform.x, platform.y, platform.width, platform.height);
    }

    // Draw boss
    if (bossActive && boss) {
        // Flip boss horizontally to face the player
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(bossSprite, -(boss.x + boss.width), boss.y, boss.width, boss.height);
        ctx.restore();
        
        // Boss health/timer indicator
        const timeLeft = Math.max(0, boss.duration - (performance.now() - bossSpawnTime));
        const healthBarWidth = 60;
        const healthBarHeight = 4;
        const healthX = boss.x;
        const healthY = boss.y - 10;
        
        // Health bar background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(healthX, healthY, healthBarWidth, healthBarHeight);
        
        // Health bar fill
        const healthPercent = timeLeft / boss.duration;
        ctx.fillStyle = healthPercent > 0.5 ? '#FF4500' : '#FF0000';
        ctx.fillRect(healthX, healthY, healthBarWidth * healthPercent, healthBarHeight);
        
        // Boss level indicator
        ctx.fillStyle = '#FFD700';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`LV${boss.level}`, boss.x + boss.width/2, boss.y - 15);
        ctx.textAlign = 'left';
    }

    // Draw fireballs
    for (const fireball of fireballs) {
        ctx.save();
        ctx.translate(fireball.x + fireball.width/2, fireball.y + fireball.height/2);
        ctx.rotate(fireball.rotation);
        ctx.drawImage(fireballSprite, -fireball.width/2, -fireball.height/2, fireball.width, fireball.height);
        ctx.restore();
    }

    // Draw score
    ctx.fillStyle = '#FFF';  // White text for night theme
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const scoreText = `Score: ${score.toString().padStart(3, '0')}`;
    ctx.fillText(scoreText, canvas.width - 20, 15);
    
    // Boss warning/indicator
    if (bossActive && boss) {
        ctx.font = '10px "Press Start 2P"';
        ctx.fillStyle = '#FF4500';
        ctx.textAlign = 'center';
        const bossText = `🧌 BOSS BATTLE! Level ${boss.level}`;
        ctx.fillText(bossText, canvas.width / 2, 30);
        
        // Boss timer
        const timeLeft = Math.max(0, boss.duration - (performance.now() - bossSpawnTime));
        const secondsLeft = Math.ceil(timeLeft / 1000);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Time: ${secondsLeft}s`, canvas.width / 2, 45);
        ctx.textAlign = 'left';
    } else {
        // Show warning when approaching boss score (every 75 points)
        const nextBossScore = Math.ceil(score / 75) * 75;
        if (nextBossScore >= 75 && nextBossScore <= 1000 && (nextBossScore - score) <= 10 && (nextBossScore - score) > 0) {
            ctx.font = '8px "Press Start 2P"';
            ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
            ctx.textAlign = 'center';
            ctx.fillText(`⚠️ Boss incoming in ${nextBossScore - score}!`, canvas.width / 2, 30);
            ctx.textAlign = 'left';
        }
    }
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

function gameLoop(currentTime) {
    update(currentTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('touchstart', handleTouch);
document.addEventListener('keydown', handleKeyDown);

// Handle keyboard events
function handleKeyDown(event) {
    // Check if any input field is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
    );
    
    // Don't handle game controls if user is typing
    if (isInputFocused) {
        return;
    }
    
    if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scroll
        
        // If game hasn't started, start it from the start screen
        if (!gameStarted) {
            startGameFromMenu();
        } else if (isGameOver) {
            // Spacebar does NOTHING when game is over - use buttons instead
            return;
        } else {
            jump();
        }
    }
}

// Handle touch events
function handleTouch(event) {
    event.preventDefault();  // Prevent default touch behavior
    
    // Check if any modal/form is currently visible (prevent touch-to-restart)
    const highScoreForm = document.getElementById('highScoreForm');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const nameInputModal = document.getElementById('nameInputModal');
    
    if (highScoreForm && !highScoreForm.classList.contains('hidden')) {
        return; // Don't handle touch if highscore form is visible
    }
    
    if (leaderboardModal && leaderboardModal.style.display === 'block') {
        return; // Don't handle touch if leaderboard modal is visible
    }
    
    if (nameInputModal && nameInputModal.style.display === 'block') {
        return; // Don't handle touch if name input modal is visible
    }
    
    // If game hasn't started, start it from menu
    if (!gameStarted) {
        startGameFromMenu();
        return;
    }
    
    if (isGameOver) {
        return;  // Don't handle jumps if game is over
    }

    const now = Date.now();
    
    if (!lastTapTime) {
        lastTapTime = now;
        jump();
    } else {
        const tapLength = now - lastTapTime;
        if (tapLength < 300 && canDoubleJump) {  // 300ms window for double tap
            doubleJump();
        } else {
            jump();
        }
        lastTapTime = now;
    }
}

// Make startGame and start screen functions available globally
window.startGame = startGame;
window.showStartScreen = showStartScreen;
window.hideStartScreen = hideStartScreen;
window.playMusic = playMusic;

// Initialize game elements but don't start the game yet
initStars();
initClouds();
initFish();
gameLoop(); // Start the game loop (but game won't update until gameStarted = true)

// Initialize music system
initMusic();

// Initialize and show start screen
document.addEventListener('DOMContentLoaded', () => {
    initStartScreen();
    showStartScreen();
});

// Fix the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', () => {
    const invBtn = document.getElementById('invincibilityButton');
    
    function updateInvBtn() {
        const charges = getAvailableInvincibilityCharges();
        invBtn.setAttribute('data-charges', charges > 0 ? `x${charges}` : '');
        invBtn.disabled = (charges <= 0 || invincible || isGameOver);
        invBtn.style.opacity = invincible ? 0.6 : 0.95;
    }
    
    // Prevent button from triggering jump
    invBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    invBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!invBtn.disabled) {
            activateInvincibility();
            updateInvBtn();
        }
    });
    
    invBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!invBtn.disabled) {
            activateInvincibility();
            updateInvBtn();
        }
    });
    
    setInterval(updateInvBtn, 100); // Keep UI in sync more frequently
    updateInvBtn();
});

// Fix the keyboard shortcut
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !isGameOver && !invincible && getAvailableInvincibilityCharges() > 0) {
        e.preventDefault();
        activateInvincibility();
    }
});


