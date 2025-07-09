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
    // Real zen music from free sources - these will try to load
    'https://www.bensound.com/bensound-music/bensound-relaxing.mp3',
    'https://archive.org/download/RoyaltyFreeMusic/calm_meditation.mp3',
    'https://freesound.org/data/previews/626/626777_906409-lq.mp3',
    'https://www.orangefreesounds.com/wp-content/uploads/2018/11/zen-meditation-music.mp3',
    // Fallback: Generate simple tones if external sources fail
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcCThR0fPUfS4FIXfJ8OKJNwgZaLvt559NEA=='
];

let currentZenTrack = 0;
let zenAudio = null;
let musicStarted = false;

function initMusic() {
    try {
        console.log('🎵 Initializing simple zen music system...');
        
        // Create audio element
        zenAudio = new Audio();
        zenAudio.volume = 0.3; // Nice gentle volume
        zenAudio.loop = true;
        
        // Set up first track
        zenAudio.src = zenMusicSources[currentZenTrack];
        
        // Handle errors and try next track
        zenAudio.addEventListener('error', function() {
            console.log('🎵 Track failed, trying next...');
            tryNextTrack();
        });
        
        zenAudio.addEventListener('canplaythrough', function() {
            console.log('🎵 Zen music ready - click to start!');
        });
        
        console.log('🎵 Zen audio initialized successfully');
        
    } catch (error) {
        console.log('🔇 Music system failed - creating backup Web Audio zen tones');
        initWebAudioFallback();
    }
}

function tryNextTrack() {
    currentZenTrack = (currentZenTrack + 1) % zenMusicSources.length;
    if (zenAudio) {
        zenAudio.src = zenMusicSources[currentZenTrack];
    }
}

function playMusic() {
    if (!musicStarted) {
        musicStarted = true;
        
        if (zenAudio) {
            // Try to play HTML5 audio first
            zenAudio.play().then(() => {
                console.log('🎵 Zen music playing!');
            }).catch((error) => {
                console.log('🎵 HTML5 audio failed, using Web Audio fallback');
                initWebAudioFallback();
                playWebAudioZen();
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

// Start music on user interaction
function startMusicOnInteraction() {
    if (!musicStarted) {
        playMusic();
        // Remove listeners after first interaction
        document.removeEventListener('click', startMusicOnInteraction);
        document.removeEventListener('keydown', startMusicOnInteraction);
        document.removeEventListener('touchstart', startMusicOnInteraction);
    }
}

// Set up interaction listeners
document.addEventListener('click', startMusicOnInteraction);
document.addEventListener('keydown', startMusicOnInteraction);
document.addEventListener('touchstart', startMusicOnInteraction);

// Sprite generation code - Improved cute dino
function createDinoSprite(frame) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 44;
    canvas.height = 48;

    function drawCuteDinoBody() {
        // Main body - rounder and cuter
        ctx.fillStyle = '#4CAF50'; // Green dino
        ctx.fillRect(8, 16, 18, 14);
        ctx.fillRect(6, 18, 22, 10);
        
        // Head - bigger and rounder
        ctx.fillRect(22, 8, 16, 16);
        ctx.fillRect(20, 10, 20, 12);
        
        // Cute eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(26, 12, 4, 4);
        ctx.fillRect(32, 12, 4, 4);
        
        // Eye pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(27, 13, 2, 2);
        ctx.fillRect(33, 13, 2, 2);
        
        // Cute smile
        ctx.fillStyle = '#000000';
        ctx.fillRect(28, 18, 1, 1);
        ctx.fillRect(29, 19, 1, 1);
        ctx.fillRect(30, 19, 1, 1);
        ctx.fillRect(31, 18, 1, 1);
        
        // Belly
        ctx.fillStyle = '#81C784';
        ctx.fillRect(10, 20, 14, 8);
        
        // Tail
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(4, 18, 6, 4);
        ctx.fillRect(2, 16, 4, 6);
        
        // Cute spikes on back
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(12, 14, 2, 4);
        ctx.fillRect(16, 12, 2, 4);
        ctx.fillRect(20, 14, 2, 4);
    }

    function drawDinoRun1() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCuteDinoBody();
        // Back leg - running position
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(12, 30, 4, 14);
        ctx.fillRect(10, 42, 6, 2); // foot
        // Front leg
        ctx.fillRect(22, 32, 4, 12);
        ctx.fillRect(20, 42, 6, 2); // foot
    }

    function drawDinoRun2() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCuteDinoBody();
        // Back leg
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(12, 32, 4, 12);
        ctx.fillRect(10, 42, 6, 2); // foot
        // Front leg - running position
        ctx.fillRect(22, 30, 4, 14);
        ctx.fillRect(20, 42, 6, 2); // foot
    }

    function drawDinoJump() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCuteDinoBody();
        // Both legs tucked for jumping
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(12, 30, 4, 8);
        ctx.fillRect(22, 30, 4, 8);
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

    // Fireball outer glow
    ctx.fillStyle = '#FF4500'; // Orange-red
    ctx.fillRect(1, 1, FIREBALL_SIZE - 2, FIREBALL_SIZE - 2);
    
    // Fireball core
    ctx.fillStyle = '#FF6347'; // Tomato red
    ctx.fillRect(2, 2, FIREBALL_SIZE - 4, FIREBALL_SIZE - 4);
    
    // Hot center
    ctx.fillStyle = '#FFFF00'; // Yellow center
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
let fireballSprite = createFireballSprite();

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
        } else if (checkCollision(dino, birds[i])) {
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
        
        platforms.push({
            x: canvas.width + 100,
            y: finalHeight,
            width: 60,  // Updated to match new sprite size
            height: 12, // Updated to match new sprite size
            speed: currentSpeed
        });
        
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
        if (checkCollision(dino, fireball)) {
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

function startGame() {
    // Reset game state
    score = 0;
    obstacles.length = 0;
    birds.length = 0;
    platforms.length = 0;
    isGameOver = false;
    dino.y = ground.y - dino.height;
    isJumping = false;
    canDoubleJump = false;
    velocityY = 0;
    lastObstacleSpawn = Date.now();
    lastPlatformSpawn = Date.now();
    gameSpeedMultiplier = 1;
    
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
    
    // Hide high score screen
    if (window.leaderboard) {
        window.leaderboard.hideHighScoreScreen();
    }
    
    // Restart music with new system
    playMusic();
}

function update(currentTime) {
    if (isGameOver) return;

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
        } else if (checkCollision(dino, obstacles[i])) {
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

    // Draw dino
    const currentDinoSprite = isJumping ? dinoJump : (dinoFrame === 1 ? dinoRun1 : dinoRun2);
    ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);

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
    
    // Music indicator
    if (!musicStarted) {
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('🎵 Click to start zen music', canvas.width - 20, 35);
    } else {
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('🎵 Zen music playing', canvas.width - 20, 35);
    }
    
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
        if (isGameOver) {
            startGame();
        } else {
            jump();
        }
    }
}

// Handle touch events
function handleTouch(event) {
    event.preventDefault();  // Prevent default touch behavior
    
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

// Make startGame available globally for the restart button
window.startGame = startGame;

// Start game
initStars();
initClouds();
initFish();
startGame();
gameLoop();

// Initialize music system
initMusic();
