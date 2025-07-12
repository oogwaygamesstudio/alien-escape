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
let canTripleJump = false;
let velocityY = 0;
let isFalling = false; // Track if player is falling naturally (not actively jumping)
let dinoFrame = 1;
let lastObstacleSpawn = 0;
let lastTapTime = 0;
let clouds = [];
let birds = []; // Flying obstacles
let platforms = []; // Floating Mario-style platforms
let lastPlatformSpawn = 0;
let gameSpeedMultiplier = 1;
let platformJumpRefresh = false; // Track if jumps were refreshed by platform

// Death screen state
let isShowingDeathScreen = false;
let deathScreenStartTime = 0;
let deathCause = null; // Store what killed the player
const DEATH_SCREEN_DURATION = 5000; // 5 seconds

// Critical fix: Add high score screen blocking flag
let highScoreScreenActive = false;

// Start screen state
let gameStarted = false;
let previewCanvas = null;
let previewCtx = null;

// Invincibility power-up state
let invincible = false;
let invincibilityTimer = 0;
let invincibilityChargesUsed = 0;
const INVINCIBILITY_DURATION = 3000; // ms
const INVINCIBILITY_SCORE_STEP = 100; // 1 charge per 100 score

function getAvailableInvincibilityCharges() {
    return Math.floor(score / INVINCIBILITY_SCORE_STEP) - invincibilityChargesUsed;
}

// Dash power-up system
let dashCharges = 0;
let isDashing = false;
let dashTimer = 0;
let dashCooldown = 0;
let rockets = []; // Rocket power-ups to collect
let currentHundredInterval = -1;
let rocketSpawnScores = []; // Predetermined scores when rockets should spawn
const DASH_DURATION = 300; // ms
const DASH_SPEED = 12; // pixels per frame
const DASH_COOLDOWN = 1000; // ms between dashes
const ROCKETS_PER_HUNDRED = { min: 4, max: 6 }; // 4-6 rockets per 100 score

// Secret code system for dev testing
let secretCodeBuffer = '';
const SECRET_CODE = 'cat9999';

function handleSecretCode(key) {
    secretCodeBuffer += key.toLowerCase();
    
    // Keep only the last 7 characters (length of SECRET_CODE)
    if (secretCodeBuffer.length > SECRET_CODE.length) {
        secretCodeBuffer = secretCodeBuffer.slice(-SECRET_CODE.length);
    }
    
    // Check if the secret code was entered
    if (secretCodeBuffer === SECRET_CODE) {
        toggleDevTestInvincibility();
        console.log('🐱 Secret code activated! Invincibility toggled!');
        secretCodeBuffer = ''; // Reset buffer
    }
}

function generateRocketSpawnScores(hundredInterval) {
    // Generate 4-6 random scores spread across the 100-point range
    const startScore = hundredInterval * 100;
    const endScore = startScore + 100;
    const numRockets = Math.floor(Math.random() * (ROCKETS_PER_HUNDRED.max - ROCKETS_PER_HUNDRED.min + 1)) + ROCKETS_PER_HUNDRED.min;
    
    const spawnScores = [];
    for (let i = 0; i < numRockets; i++) {
        // Spread rockets evenly across the range with some randomness
        const basePosition = startScore + (i + 1) * (100 / (numRockets + 1));
        const randomOffset = (Math.random() - 0.5) * 15; // ±7.5 points variation
        const spawnScore = Math.max(startScore + 5, Math.min(endScore - 5, Math.round(basePosition + randomOffset)));
        spawnScores.push(spawnScore);
    }
    
    return spawnScores.sort((a, b) => a - b); // Sort in ascending order
}

function activateInvincibility() {
    if (invincible || getAvailableInvincibilityCharges() <= 0 || isGameOver) return;
    
    invincible = true;
    invincibilityTimer = INVINCIBILITY_DURATION;
    invincibilityChargesUsed++;
    
    console.log('🛡️ Invincibility activated! Duration:', INVINCIBILITY_DURATION/1000, 'seconds');
    console.log('🔢 Charges remaining:', getAvailableInvincibilityCharges());
}

// Auto-shield function - activates shield automatically when player is about to die
function tryAutoShield() {
    // Check if we can auto-activate shield
    if (!invincible && !isDashing && getAvailableInvincibilityCharges() > 0 && !isGameOver) {
        console.log('🛡️ AUTO-SHIELD! Saved from death');
        activateInvincibility();
        return true; // Shield activated successfully
    }
    return false; // No shield available or already active
}

// Smart death function - tries auto-shield first, then calls gameOver if it fails
function attemptDeath(cause) {
    if (tryAutoShield()) {
        // Auto-shield activated, player is saved!
        return;
    }
    // No shield available, player dies
    gameOver(cause);
}

// DEV TEST: Toggle invincibility for testing
function toggleDevTestInvincibility() {
    if (isGameOver) return;
    
    if (invincible) {
        // Turn OFF invincibility
        invincible = false;
        invincibilityTimer = 0;
        console.log('🧪 DEV TEST: Invincibility DISABLED');
        console.log('🔍 You can now test collision detection');
    } else {
        // Turn ON invincibility
        invincible = true;
        invincibilityTimer = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        console.log('🧪 DEV TEST: Invincibility ENABLED for 5 hours');
        console.log('🛡️ You are now invincible');
    }
    
    // Update button visual state
    updateDevTestButtonState();
}

// Dev test button removed - using secret code system instead

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

function updateDash(deltaTime) {
    // Update dash timer
    if (isDashing) {
        dashTimer -= deltaTime;
        if (dashTimer <= 0) {
            isDashing = false;
            dashTimer = 0;
            console.log('🚀 Dash ended');
        }
    }
    
    // Update dash cooldown
    if (dashCooldown > 0) {
        dashCooldown -= deltaTime;
        if (dashCooldown <= 0) {
            dashCooldown = 0;
        }
    }
}

function canDash() {
    return dashCharges > 0 && !isDashing && dashCooldown <= 0 && !isGameOver;
}

function activateDash() {
    if (!canDash()) return;
    
    isDashing = true;
    dashTimer = DASH_DURATION;
    dashCooldown = DASH_COOLDOWN;
    dashCharges--;
    
    console.log(`🚀 Dash activated! Charges left: ${dashCharges}`);
}

function getDashCharges() {
    return dashCharges;
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

// Green Goblin boss system variables
let greenGoblin = null;
let greenGoblinActive = false;
let greenGoblinSpawnTime = 0;
let greenGoblinShootTime = 0;
let greenGoblinLevel = 1;
let greenGoblinFlyDirection = 1; // 1 for up, -1 for down
let lasers = [];
let lastGreenGoblinScore = 0;

// Boss constants
const BOSS_WIDTH = 60;
const BOSS_HEIGHT = 80;
const BOSS_JUMP_FORCE = -8;
const BOSS_GRAVITY = 0.4;
const FIREBALL_SPEED = 3;
const FIREBALL_SIZE = 12;

// Green Goblin constants
const GREEN_GOBLIN_WIDTH = 60;
const GREEN_GOBLIN_HEIGHT = 70;
const GREEN_GOBLIN_FLY_SPEED = 1; // Slow up/down movement
const LASER_SPEED = 4; // Faster than fireballs
const LASER_WIDTH = 30; // Much longer than fireballs
const LASER_HEIGHT = 6;

// Ending sequence constants
const ENDING_SCORE = 500;
const ENDING_WAIT_TIME = 5000; // 5 seconds of running with no obstacles
const SPEECH_BUBBLE_DURATION = 8000; // 8 seconds per speech bubble
const FADE_DURATION = 2000; // 2 seconds for fade out
const FINAL_MESSAGE_DURATION = 5000; // 5 seconds for final message

// Ending sequence state
let endingSequenceStarted = false;
let endingPhase = 'none'; // 'none', 'clearing_screen', 'waiting', 'oogway_appears', 'speech1', 'speech2', 'speech3', 'speech4', 'moving', 'fade_out', 'final_message'
let endingStartTime = 0;
let oogway = null;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size - made taller for more sky space
canvas.width = 800;
canvas.height = 450;

// Game objects
const dino = {
    x: 100,
    y: canvas.height - 100,
    width: 40,
    height: 60
};

const obstacles = [];
const ground = {
    y: canvas.height - 50,
    height: 50
};

// 🎵 Clean Simple Music System - One Working Audio File
let zenAudio = null;
let musicStarted = false;
let musicEnabled = true;

// Jump Counter Display System
let jumpCounterEnabled = true; // Default to enabled

// 🎵 Boss Music System - Separate from main music
let bossAudio = null;
let bossAudioPlaying = false;

// 🎵 Green Goblin Music System - Takes priority over regular boss music
let greenGoblinAudio = null;
let greenGoblinAudioPlaying = false;

function initMusic() {
    try {
        console.log('🎵 Initializing Zen Garden music...');
        
        // Create audio element for the zen garden track
        zenAudio = new Audio();
        zenAudio.volume = 0.2; // Gentle zen volume
        zenAudio.loop = true; // Loop continuously
        
        // Use the local zen garden MP3 file
        zenAudio.src = 'assets/audio/zen-garden.mp3';
        
        // Preload the audio
        zenAudio.preload = 'auto';
        
        // Handle errors gracefully
        zenAudio.addEventListener('error', function(e) {
            console.log('🔇 Zen Garden music file not found. Please ensure "zen-garden.mp3" is in assets/audio/ folder');
            zenAudio = null;
        });
        
        // Log when music is ready
        zenAudio.addEventListener('canplaythrough', function() {
            console.log('🎵 Zen Garden music ready to play');
        });
        
        console.log('🎵 Zen Garden music initialized');

        // Initialize boss music
        console.log('🎵 Initializing Boss music...');
        bossAudio = new Audio();
        bossAudio.volume = 0.3; // Boss music volume
        bossAudio.loop = true; // Loop during boss fights
        
        // Use the suarsong.wav file
        bossAudio.src = 'assets/audio/suarsong.wav';
        bossAudio.preload = 'auto';
        
        // Handle errors gracefully
        bossAudio.addEventListener('error', function(e) {
            console.log('🔇 Boss music file not found. Please ensure "suarsong.wav" is in assets/audio/ folder');
            bossAudio = null;
        });
        
        // Log when boss music is ready
        bossAudio.addEventListener('canplaythrough', function() {
            console.log('🎵 Boss music ready to play');
        });
        
        console.log('🎵 Boss music initialized');

        // Initialize Green Goblin music
        console.log('🎵 Initializing Green Goblin music...');
        greenGoblinAudio = new Audio();
        greenGoblinAudio.volume = 0.4; // Slightly louder for dramatic effect
        greenGoblinAudio.loop = true; // Loop during Green Goblin fights
        
        // Use the green goblin audio file
        greenGoblinAudio.src = 'assets/audio/greengoblin.wav';
        greenGoblinAudio.preload = 'auto';
        
        // Handle errors gracefully
        greenGoblinAudio.addEventListener('error', function(e) {
            console.log('🔇 Green Goblin music file not found. Please ensure "greengoblin.wav" is in assets/audio/ folder');
            greenGoblinAudio = null;
        });
        
        // Log when Green Goblin music is ready
        greenGoblinAudio.addEventListener('canplaythrough', function() {
            console.log('🎵 Green Goblin music ready to play');
        });
        
        console.log('🎵 Green Goblin music initialized');
        
    } catch (error) {
        console.log('🔇 Music system not available:', error);
        zenAudio = null;
        bossAudio = null;
        greenGoblinAudio = null;
    }
}

function playMusic() {
    if (!musicEnabled || !zenAudio) return; // Don't play if music is disabled or unavailable
    
    if (!musicStarted) {
        musicStarted = true;
        
        zenAudio.play().then(() => {
            // Zen Garden music started
        }).catch((error) => {
            console.log('🔇 Zen Garden music playback failed:', error);
            musicStarted = false;
        });
    }
}

function pauseMusic() {
    if (zenAudio) {
        zenAudio.pause();
        zenAudio.currentTime = 0; // Reset to beginning
    }
    musicStarted = false;
}

function playBossMusic() {
    if (!musicEnabled || !bossAudio || bossAudioPlaying) return;
    
    // Pause main music when boss music starts
    if (zenAudio && musicStarted) {
        zenAudio.pause();
    }
    
    bossAudioPlaying = true;
    
    bossAudio.play().then(() => {
        // Boss music started
    }).catch((error) => {
        console.log('🔇 Boss music playback failed:', error);
        bossAudioPlaying = false;
        // Resume main music if boss music fails
        if (musicEnabled && zenAudio && musicStarted) {
            zenAudio.play().catch(e => console.log('Failed to resume zen music:', e));
        }
    });
}

function stopBossMusic() {
    if (bossAudio && bossAudioPlaying) {
        bossAudio.pause();
        bossAudio.currentTime = 0; // Reset to beginning
        bossAudioPlaying = false;
        console.log('🎵 Boss music stopped');
    }
    
    // Resume main music after boss music stops (only if Green Goblin isn't playing)
    if (musicEnabled && zenAudio && musicStarted && gameStarted && !isGameOver && !greenGoblinAudioPlaying) {
        zenAudio.play().catch(error => {
            console.log('🔇 Failed to resume zen music:', error);
        });
    }
}

function playGreenGoblinMusic() {
    if (!musicEnabled || !greenGoblinAudio || greenGoblinAudioPlaying) return;
    
    // Stop all other music when Green Goblin music starts (priority)
    if (zenAudio && musicStarted) {
        zenAudio.pause();
    }
    if (bossAudio && bossAudioPlaying) {
        bossAudio.pause();
        bossAudioPlaying = false;
    }
    
    greenGoblinAudioPlaying = true;
    
    greenGoblinAudio.play().then(() => {
        console.log('🎵 Green Goblin music playing! (Priority music)');
    }).catch((error) => {
        console.log('🔇 Green Goblin music playback failed:', error);
        greenGoblinAudioPlaying = false;
        // Try to resume other music if Green Goblin fails
        if (musicEnabled && bossAudio && !greenGoblinAudioPlaying) {
            playBossMusic();
        } else if (musicEnabled && zenAudio && musicStarted) {
            zenAudio.play().catch(e => console.log('Failed to resume zen music:', e));
        }
    });
}

function stopGreenGoblinMusic() {
    if (greenGoblinAudio && greenGoblinAudioPlaying) {
        greenGoblinAudio.pause();
        greenGoblinAudio.currentTime = 0; // Reset to beginning
        greenGoblinAudioPlaying = false;
        console.log('🎵 Green Goblin music stopped');
    }
    
    // Resume appropriate music after Green Goblin music stops
    if (musicEnabled && gameStarted && !isGameOver) {
        if (bossActive && bossAudio) {
            playBossMusic(); // Resume boss music if boss is still active
        } else if (zenAudio && musicStarted) {
            zenAudio.play().catch(error => {
                console.log('🔇 Failed to resume zen music:', error);
            });
        }
    }
}

// Music toggle functions
function toggleMusic() {
    musicEnabled = !musicEnabled;
    
    if (musicEnabled) {
        console.log('🎵 Music enabled');
        if (gameStarted && !isGameOver) {
            playMusic(); // Start music if game is running
        }
    } else {
        console.log('🔇 Music disabled');
        pauseMusic(); // Stop music immediately
    }
    
    updateMusicButtons();
    
    // FIX: Re-ensure touch listener is active after music toggle
    console.log('🔧 Re-ensuring touch listener after music toggle');
    document.removeEventListener('touchstart', handleTouch);
    document.addEventListener('touchstart', handleTouch);
    
    // Also reset touch timing to prevent any corruption
    lastTapTime = 0;
    
    console.log('✅ Touch listener re-added and touch timing reset');
}

function updateMusicButtons() {
    // Update main menu button only (in-game button removed)
    const menuMusicIcon = document.getElementById('musicIcon');
    const menuMusicText = document.getElementById('musicText');
    
    if (menuMusicIcon && menuMusicText) {
        if (musicEnabled) {
            menuMusicIcon.textContent = '🔊';
            menuMusicText.textContent = 'MUSIC ON';
        } else {
            menuMusicIcon.textContent = '🔇';
            menuMusicText.textContent = 'MUSIC OFF';
        }
    }
}

function toggleJumpCounter() {
    jumpCounterEnabled = !jumpCounterEnabled;
    
    // Store preference in localStorage
    localStorage.setItem('jumpCounterEnabled', jumpCounterEnabled.toString());
    
    console.log('🔢 Jump Counter ' + (jumpCounterEnabled ? 'enabled' : 'disabled'));
    
    // Update button text and icon
    updateJumpCounterButtons();
}

function updateJumpCounterButtons() {
    // Update main menu button
    const menuCounterIcon = document.getElementById('counterIcon');
    const menuCounterText = document.getElementById('counterText');
    
    if (menuCounterIcon && menuCounterText) {
        if (jumpCounterEnabled) {
            menuCounterIcon.textContent = '🔢';
            menuCounterText.textContent = 'COUNTER ON';
        } else {
            menuCounterIcon.textContent = '❌';
            menuCounterText.textContent = 'COUNTER OFF';
        }
    }
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

function createCactusSprite(sizeType = 'normal') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Different canvas sizes for different cactus types
    switch(sizeType) {
        case 'xl':
            canvas.width = 30;
            canvas.height = 60;
            break;
        case 'xxl':
            canvas.width = 40;
            canvas.height = 80;
            break;
        default: // normal
            canvas.width = 20;
            canvas.height = 40;
    }

    const baseColor = '#2E7D32'; // Forest green
    const darkColor = '#1B5E20'; // Dark green for shadows
    const lightColor = '#4CAF50'; // Light green for highlights
    
    if (sizeType === 'xxl') {
        // XXL Cactus - Massive desert cactus with multiple arms
        ctx.fillStyle = baseColor;
        
        // Main thick trunk
        ctx.fillRect(14, 0, 12, 80);
        
        // Multiple arms for intimidating look
        // Lower left arm
        ctx.fillRect(6, 25, 8, 6);
        ctx.fillRect(0, 25, 6, 15);
        
        // Upper left arm
        ctx.fillRect(8, 15, 6, 6);
        ctx.fillRect(2, 10, 6, 12);
        
        // Lower right arm
        ctx.fillRect(26, 30, 8, 6);
        ctx.fillRect(34, 25, 6, 20);
        
        // Upper right arm
        ctx.fillRect(26, 20, 6, 6);
        ctx.fillRect(32, 15, 6, 12);
        
        // Add shadows for depth
        ctx.fillStyle = darkColor;
        ctx.fillRect(14, 0, 3, 80); // Main trunk shadow
        ctx.fillRect(0, 25, 2, 15); // Left arm shadows
        ctx.fillRect(2, 10, 2, 12);
        ctx.fillRect(34, 25, 2, 20); // Right arm shadows
        ctx.fillRect(32, 15, 2, 12);
        
        // Add spikes/thorns for danger
        ctx.fillStyle = '#8D6E63'; // Brown thorns
        for (let y = 5; y < 75; y += 8) {
            ctx.fillRect(12, y, 2, 2);
            ctx.fillRect(26, y + 2, 2, 2);
        }
        
    } else if (sizeType === 'xl') {
        // XL Cactus - Large desert cactus with arms
        ctx.fillStyle = baseColor;
        
        // Main trunk
        ctx.fillRect(10, 0, 10, 60);
        
        // Left arm
        ctx.fillRect(4, 20, 6, 5);
        ctx.fillRect(0, 18, 4, 12);
        
        // Right arm
        ctx.fillRect(20, 25, 6, 5);
        ctx.fillRect(26, 20, 4, 15);
        
        // Upper small arm
        ctx.fillRect(6, 12, 4, 4);
        ctx.fillRect(2, 10, 4, 8);
        
        // Add shadows
        ctx.fillStyle = darkColor;
        ctx.fillRect(10, 0, 3, 60); // Main shadow
        ctx.fillRect(0, 18, 2, 12); // Left shadow
        ctx.fillRect(26, 20, 2, 15); // Right shadow
        ctx.fillRect(2, 10, 2, 8); // Upper shadow
        
        // Add some thorns
        ctx.fillStyle = '#8D6E63';
        for (let y = 5; y < 55; y += 10) {
            ctx.fillRect(8, y, 2, 2);
            ctx.fillRect(20, y + 3, 2, 2);
        }
        
    } else {
        // Normal cactus (existing design)
        ctx.fillStyle = baseColor;
        ctx.fillRect(8, 0, 4, 40);
        ctx.fillRect(4, 10, 12, 4);
        ctx.fillRect(0, 20, 20, 4);
        
        // Add shadows
        ctx.fillStyle = darkColor;
        ctx.fillRect(8, 0, 2, 40);
        ctx.fillRect(4, 10, 2, 4);
        ctx.fillRect(0, 20, 2, 4);
    }

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
    
    // Bird head - Darker light red (facing left towards dino)
    ctx.fillStyle = '#FF5252';
    ctx.fillRect(2, 6, 6, 6);
    
    // Wings - Medium red
    ctx.fillStyle = '#F44336';
    ctx.fillRect(4, 6, 8, 2);
    ctx.fillRect(12, 6, 8, 2);
    
    // Eye - Black (on left side facing dino)
    ctx.fillStyle = '#000000';
    ctx.fillRect(4, 7, 1, 1);
    
    // Beak - Orange (pointing left towards dino)
    ctx.fillStyle = '#FFA726';
    ctx.fillRect(0, 8, 2, 2);

    return canvas;
}

function createPterodactylSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 36;
    canvas.height = 24;

    // Pterodactyl body - Bright green (much more visible!)
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(8, 12, 20, 6);
    ctx.fillRect(12, 8, 12, 12);
    
    // Head - facing left towards dino (darker green)
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(2, 8, 10, 8);
    
    // Long beak - distinctive pterodactyl feature (orange for contrast)
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(0, 10, 4, 4);
    
    // Large wings - spread out (dark green)
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(6, 4, 12, 4); // Top wing
    ctx.fillRect(18, 4, 12, 4); // Top wing
    ctx.fillRect(8, 20, 10, 3); // Bottom wing
    ctx.fillRect(18, 20, 10, 3); // Bottom wing
    
    // Wing membranes - lighter green
    ctx.fillStyle = '#66BB6A';
    ctx.fillRect(8, 6, 8, 2);
    ctx.fillRect(20, 6, 8, 2);
    
    // Eye - Red (still menacing but visible)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(6, 10, 2, 2);
    
    // Crest - distinctive feature (lime green)
    ctx.fillStyle = '#8BC34A';
    ctx.fillRect(8, 6, 6, 2);

    return canvas;
}

function createPlatformSprite(width = 60) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width; // Dynamic platform width
    canvas.height = 12; // Consistent height

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
    
    // Grass texture - small grass blades (scale with width)
    ctx.fillStyle = '#2E7D32'; // Dark green
    for (let x = 0; x < canvas.width; x += 3) {
        const grassHeight = 1 + Math.random() * 2;
        ctx.fillRect(x, 1, 1, grassHeight);
    }
    
    // Light green highlights on grass (scale with width)
    ctx.fillStyle = '#66BB6A'; // Light green
    for (let x = 1; x < canvas.width; x += 4) {
        ctx.fillRect(x, 2, 1, 1);
    }
    
    // Small leaves/flowers scattered (scale with width)
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

function createGreenGoblinSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 60;
    canvas.height = 70;

    // Green Goblin - Scary flying villain
    
    // Glider base (dark metal platform he rides)
    ctx.fillStyle = '#2C2C2C'; // Dark gray metal
    ctx.fillRect(5, 55, 50, 8);
    ctx.fillRect(0, 58, 60, 4); // Wider glider wings
    
    // Glider details (spikes and tech)
    ctx.fillStyle = '#FF4500'; // Orange glow details
    ctx.fillRect(10, 57, 3, 2);
    ctx.fillRect(25, 57, 3, 2);
    ctx.fillRect(40, 57, 3, 2);
    ctx.fillRect(47, 57, 3, 2);
    
    // Main body - Green and purple costume
    ctx.fillStyle = '#228B22'; // Forest green body
    ctx.fillRect(20, 25, 20, 30);
    ctx.fillRect(15, 30, 30, 20);
    
    // Purple costume details
    ctx.fillStyle = '#4B0082'; // Dark purple
    ctx.fillRect(22, 27, 16, 6); // Chest piece
    ctx.fillRect(18, 35, 24, 4); // Belt area
    
    // Arms (extending outward menacingly)
    ctx.fillStyle = '#228B22';
    ctx.fillRect(10, 30, 10, 8); // Left arm
    ctx.fillRect(40, 30, 10, 8); // Right arm
    
    // Hands with claws
    ctx.fillStyle = '#8B4513'; // Brown gloves
    ctx.fillRect(8, 35, 6, 6);   // Left hand
    ctx.fillRect(46, 35, 6, 6);  // Right hand
    
    // Claws
    ctx.fillStyle = '#FFD700'; // Golden claws
    ctx.fillRect(6, 37, 3, 1);   // Left claws
    ctx.fillRect(52, 37, 3, 1);  // Right claws
    
    // Head - Evil goblin face
    ctx.fillStyle = '#228B22'; // Green head
    ctx.fillRect(18, 8, 24, 20);
    ctx.fillRect(20, 5, 20, 25); // Larger head
    
    // Goblin ears (pointed)
    ctx.fillStyle = '#1B5E20'; // Darker green
    ctx.fillRect(15, 12, 4, 8);  // Left ear
    ctx.fillRect(41, 12, 4, 8);  // Right ear
    
    // Evil eyes (glowing red)
    ctx.fillStyle = '#FF0000'; // Bright red eyes
    ctx.fillRect(22, 12, 4, 4);  // Left eye
    ctx.fillRect(34, 12, 4, 4);  // Right eye
    
    // Eye glow effect
    ctx.fillStyle = '#FF6666'; // Light red glow
    ctx.fillRect(21, 11, 6, 6);  // Left eye glow
    ctx.fillRect(33, 11, 6, 6);  // Right eye glow
    
    // Evil grin mouth
    ctx.fillStyle = '#000000'; // Black mouth
    ctx.fillRect(24, 20, 12, 3);
    
    // Sharp teeth
    ctx.fillStyle = '#FFFFFF'; // White teeth
    ctx.fillRect(25, 18, 2, 4);  // Fangs
    ctx.fillRect(29, 18, 2, 4);
    ctx.fillRect(33, 18, 2, 4);
    
    // Evil mask/helmet details
    ctx.fillStyle = '#4B0082'; // Purple mask
    ctx.fillRect(20, 8, 20, 4);  // Mask top
    
    // Horns/spikes on mask
    ctx.fillStyle = '#FFD700'; // Golden horns
    ctx.fillRect(18, 5, 3, 6);   // Left horn
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(39, 5, 3, 6);   // Right horn
    
    // Cape flowing behind (optional detail)
    ctx.fillStyle = '#4B0082'; // Purple cape
    ctx.fillRect(5, 25, 8, 25);  // Left cape
    ctx.fillRect(47, 25, 8, 25); // Right cape

    return canvas;
}

function createLaserSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 30; // Much longer than fireball
    canvas.height = 6;

    // Laser beam - bright green with electric effect
    
    // Core laser beam
    ctx.fillStyle = '#00FF00'; // Bright green core
    ctx.fillRect(0, 2, 30, 2);
    
    // Outer glow
    ctx.fillStyle = '#66FF66'; // Light green glow
    ctx.fillRect(0, 1, 30, 4);
    
    // Electric edges
    ctx.fillStyle = '#FFFF00'; // Yellow electric edges
    ctx.fillRect(0, 0, 30, 1);
    ctx.fillRect(0, 5, 30, 1);
    
    // Bright white core
    ctx.fillStyle = '#FFFFFF'; // White hot center
    ctx.fillRect(2, 2.5, 26, 1);

    return canvas;
}

function createRocketSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 24;
    canvas.height = 32;

    // Rocket power-up with glowing effects
    
    // Outer glow effect
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // Orange glow
    ctx.fillRect(0, 0, 24, 32);
    
    // Rocket body - main cylinder
    ctx.fillStyle = '#C0C0C0'; // Silver body
    ctx.fillRect(6, 8, 12, 20);
    
    // Rocket nose cone
    ctx.fillStyle = '#FF0000'; // Red nose
    ctx.fillRect(8, 4, 8, 6);
    ctx.fillRect(9, 2, 6, 4);
    ctx.fillRect(10, 1, 4, 2);
    
    // Rocket fins
    ctx.fillStyle = '#FF6B35'; // Orange fins
    ctx.fillRect(2, 20, 6, 8); // Left fin
    ctx.fillRect(16, 20, 6, 8); // Right fin
    ctx.fillRect(8, 25, 8, 6); // Bottom fin
    
    // Rocket engine glow
    ctx.fillStyle = '#FFD700'; // Gold engine
    ctx.fillRect(8, 28, 8, 4);
    
    // Engine flames (animated effect base)
    ctx.fillStyle = '#FF4500'; // Orange flame
    ctx.fillRect(9, 30, 6, 2);
    ctx.fillStyle = '#FFFF00'; // Yellow flame center
    ctx.fillRect(10, 30, 4, 2);
    
    // Rocket details/windows
    ctx.fillStyle = '#00BFFF'; // Light blue windows
    ctx.fillRect(8, 10, 2, 2);
    ctx.fillRect(14, 10, 2, 2);
    ctx.fillRect(11, 14, 2, 2);
    
    // Power symbol
    ctx.fillStyle = '#FFFF00'; // Yellow power symbol
    ctx.fillRect(10, 17, 4, 1);
    ctx.fillRect(11, 16, 2, 3);
    
    return canvas;
}

function createOogwaySprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 80; // Bigger than dino (40px)
    canvas.height = 80;

    // Cute turtle sprite with glow
    
    // Magical glow effect
    ctx.save();
    ctx.shadowColor = '#FFD700'; // Golden glow
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Shell (main body) - bigger and rounder
    ctx.fillStyle = '#8B4513'; // Brown shell
    ctx.beginPath();
    ctx.ellipse(40, 40, 30, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple shell pattern - cute spots
    ctx.fillStyle = '#654321'; // Darker brown spots
    ctx.beginPath();
    ctx.arc(35, 35, 4, 0, Math.PI * 2); // Top left spot
    ctx.arc(45, 35, 4, 0, Math.PI * 2); // Top right spot
    ctx.arc(30, 45, 3, 0, Math.PI * 2); // Middle left spot
    ctx.arc(50, 45, 3, 0, Math.PI * 2); // Middle right spot
    ctx.arc(40, 48, 4, 0, Math.PI * 2); // Bottom center spot
    ctx.fill();
    
    // Head - cute and round
    ctx.fillStyle = '#90EE90'; // Light green
    ctx.beginPath();
    ctx.ellipse(40, 20, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute eyes - bigger and friendlier
    ctx.fillStyle = '#000000'; // Black eyes
    ctx.beginPath();
    ctx.arc(34, 18, 3, 0, Math.PI * 2);
    ctx.arc(46, 18, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye whites - sparkly
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(35, 17, 1.5, 0, Math.PI * 2);
    ctx.arc(47, 17, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(40, 22, 4, 0, Math.PI);
    ctx.stroke();
    
    // Legs - cute and stubby
    ctx.fillStyle = '#90EE90'; // Same as head
    // Front legs
    ctx.beginPath();
    ctx.ellipse(20, 50, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(60, 50, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Back legs
    ctx.beginPath();
    ctx.ellipse(22, 60, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(58, 60, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute little tail
    ctx.beginPath();
    ctx.arc(40, 65, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    return canvas;
}

// Load sprites
let dinoRun1 = createDinoSprite('run1');
let dinoRun2 = createDinoSprite('run2');
let dinoJump = createDinoSprite('jump');
// Create different cactus sprites
let cactusSprites = {
    normal: createCactusSprite('normal'),
    xl: createCactusSprite('xl'),
    xxl: createCactusSprite('xxl')
};
let groundTexture = createGroundSprite();
let cloudSprite = createCloudSprite();
let fishSprite = createFishSprite();
let birdSprite = createBirdSprite();
let pterodactylSprite = createPterodactylSprite();
// Create platform sprites for different sizes
let platformSprites = {
    small: createPlatformSprite(40),
    medium: createPlatformSprite(60),
    large: createPlatformSprite(80),
    xlarge: createPlatformSprite(100),
    xxl: createPlatformSprite(120),
    xxxl: createPlatformSprite(140)
};
let bossSprite = createBossSprite(1); // Initial boss sprite
let fireballSprite = createFireballSprite(); // Now blue fireballs
let greenGoblinSprite = createGreenGoblinSprite(); // Green Goblin boss
let laserSprite = createLaserSprite(); // Green laser projectiles
let rocketSprite = createRocketSprite(); // Dash power-up rockets
let oogwaySprite = createOogwaySprite(); // Ending sequence turtle

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
            // First jump from ground or platform
            isJumping = true;
            isFalling = false; // This is an active jump, not falling
            canDoubleJump = true;
            canTripleJump = false;
            velocityY = JUMP_FORCE;
        } else if (canDoubleJump) {
            // Second jump (double jump)
            isFalling = false; // This is an active jump, not falling
            velocityY = JUMP_FORCE * 0.9; // Double jump force
            canDoubleJump = false;
            canTripleJump = true;
        } else if (canTripleJump) {
            // Third jump (triple jump)
            isFalling = false; // This is an active jump, not falling
            velocityY = JUMP_FORCE * 0.8; // Triple jump force (slightly weaker)
            canTripleJump = false;
        }
    }
}

function tripleJump() {
    if (!isGameOver && canTripleJump) {
        velocityY = JUMP_FORCE * 0.8;
        canTripleJump = false;
    }
}

function spawnObstacle() {
    // Stop spawning obstacles when ending sequence starts
    if (score >= ENDING_SCORE) {
        return;
    }
    
    const now = Date.now();
    if (now - lastObstacleSpawn > OBSTACLE_SPAWN_INTERVAL) {
        // Calculate speed multiplier with limit after score 40
        if (score <= 40) {
            gameSpeedMultiplier = 1 + (score * 0.02);
        } else {
            gameSpeedMultiplier = 1.8; // Cap at 1.8x speed
        }
        
        const currentSpeed = GAME_SPEED * gameSpeedMultiplier;
        
        // Determine cactus type based on score and rarity
        let cactusType = 'normal';
        let baseWidth = 20;
        let baseHeight = 40;
        let sizeMultiplier = 0.7 + Math.random() * 0.6; // For normal cacti
        
        // XXL Cactus: After score 120, more common (18%)
        if (score >= 120 && Math.random() < 0.18) {
            cactusType = 'xxl';
            baseWidth = 40;
            baseHeight = 80;
            sizeMultiplier = 1.0; // Fixed size for special cacti
        }
        // XL Cactus: After score 80, common (28%)
        else if (score >= 80 && Math.random() < 0.28) {
            cactusType = 'xl';
            baseWidth = 30;
            baseHeight = 60;
            sizeMultiplier = 1.0; // Fixed size for special cacti
        }
        
        // Random height variation (smaller for large cacti)
        const heightVariation = cactusType === 'normal' ? 
            Math.random() * 10 - 5 : // ±5 pixels for normal
            Math.random() * 6 - 3;   // ±3 pixels for large cacti

        // Ensure minimum spacing for jumpability (larger for big cacti)
        const minSpacing = cactusType === 'xxl' ? 250 : 
                          cactusType === 'xl' ? 225 : 200;
        const xOffset = Math.random() * 50;

        obstacles.push({
            x: canvas.width + xOffset + minSpacing,
            y: ground.y - (baseHeight * sizeMultiplier) + heightVariation,
            width: baseWidth * sizeMultiplier,
            height: baseHeight * sizeMultiplier,
            size: sizeMultiplier,
            speed: currentSpeed * (0.9 + Math.random() * 0.2),
            type: cactusType // Store cactus type for rendering
        });
        
        // Special cactus spawned silently
        
        // Spawn birds after score 20 (reduced frequency for fairness)
        if (score > 20 && Math.random() < 0.10) {
            birds.push({
                x: canvas.width + 100,
                y: 20 + Math.random() * (ground.y - 100), // Spawn anywhere in sky area
                width: 24,
                height: 16,
                speed: currentSpeed * 0.8,
                type: 'bird'
            });
        }
        
        // Spawn pterodactyls after score 50 (reduced frequency and speed for fairness)
        if (score > 50 && Math.random() < 0.05) {
            birds.push({
                x: canvas.width + 120,
                y: 30 + Math.random() * (ground.y - 120), // Spawn in sky area
                width: 36, // Bigger than regular birds
                height: 24,
                speed: currentSpeed * 0.7, // Slower for fairness
                type: 'pterodactyl'
            });
        }
        
        lastObstacleSpawn = now;
        
        // Adjusted interval for better spacing
        OBSTACLE_SPAWN_INTERVAL = MIN_OBSTACLE_SPACING + Math.random() * (MAX_OBSTACLE_SPACING - MIN_OBSTACLE_SPACING);
        
        // Spawn multiple obstacles with better spacing
        if (score > 10) {  // After score 10
            const pattern = Math.floor(Math.random() * 4);  // 0, 1, 2, or 3
            
            if (pattern === 1) {  // Two obstacles with proper spacing
                // For multi-obstacle patterns, use normal cacti only (avoid super-difficult combinations)
                const secondSize = 0.7 + Math.random() * 0.6;
                const spacing = 80 + Math.random() * 60;
                
                obstacles.push({
                    x: canvas.width + xOffset + minSpacing + spacing,
                    y: ground.y - (40 * secondSize),
                    width: 20 * secondSize,
                    height: 40 * secondSize,
                    size: secondSize,
                    speed: currentSpeed * (0.9 + Math.random() * 0.2),
                    type: 'normal' // Multiple obstacles always use normal cacti
                });
            } else if (pattern === 2) {  // Three obstacles with gaps
                for (let i = 1; i <= 2; i++) {
                    const extraSize = 0.7 + Math.random() * 0.6;
                    const spacing = 100 + Math.random() * 50;
                    
                    obstacles.push({
                        x: canvas.width + xOffset + minSpacing + (spacing * i),
                        y: ground.y - (40 * extraSize),
                        width: 20 * extraSize,
                        height: 40 * extraSize,
                        size: extraSize,
                        speed: currentSpeed * (0.9 + Math.random() * 0.2),
                        type: 'normal' // Multiple obstacles always use normal cacti
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
        birds[i].x -= birds[i].speed; // Move right to left (towards dino)
        if (birds[i].x + birds[i].width < 0) { // Remove when off left side
            birds.splice(i, 1);
        } else if (checkBirdCollision(dino, birds[i]) && !invincible && !isDashing) {
            const birdType = birds[i].type === 'pterodactyl' ? 'pterodactyl' : 'bird';
            attemptDeath(birdType);
            return;
        }
    }
}

function checkBirdCollision(dino, bird) {
    // Use much smaller hitboxes for fairer bird collision
    // Make both birds and pterodactyls more forgiving
    const birdHitboxReduction = bird.type === 'pterodactyl' ? 8 : 6; // pixels to reduce from each side
    const dinoHitboxReduction = 8; // smaller dino hitbox for much fairer gameplay
    
    const birdHitbox = {
        x: bird.x + birdHitboxReduction,
        y: bird.y + birdHitboxReduction,
        width: bird.width - (birdHitboxReduction * 2),
        height: bird.height - (birdHitboxReduction * 2)
    };
    
    const dinoHitbox = {
        x: dino.x + dinoHitboxReduction,
        y: dino.y + dinoHitboxReduction,
        width: dino.width - (dinoHitboxReduction * 2),
        height: dino.height - (dinoHitboxReduction * 2)
    };
    
    return dinoHitbox.x < birdHitbox.x + birdHitbox.width &&
           dinoHitbox.x + dinoHitbox.width > birdHitbox.x &&
           dinoHitbox.y < birdHitbox.y + birdHitbox.height &&
           dinoHitbox.y + dinoHitbox.height > birdHitbox.y;
}

function spawnRockets() {
    if (score < 5) return; // Start checking after score 5
    if (score >= ENDING_SCORE) return; // Stop spawning in ending sequence
    
    const hundredInterval = Math.floor(score / 100);
    
    // Check if we've entered a new 100-point interval
    if (hundredInterval !== currentHundredInterval) {
        currentHundredInterval = hundredInterval;
        rocketSpawnScores = generateRocketSpawnScores(hundredInterval);
        // New rocket interval calculated
    }
    
    // Check if current score matches any pending rocket spawn scores
    for (let i = rocketSpawnScores.length - 1; i >= 0; i--) {
        const spawnScore = rocketSpawnScores[i];
        
        if (score >= spawnScore) {
            // Spawn rocket at this score
            const rocketX = canvas.width + Math.random() * 100; // Start off-screen right
            const rocketY = Math.random() * (canvas.height - 100) + 50; // Anywhere from top to near bottom
            
            rockets.push({
                x: rocketX,
                y: rocketY,
                width: 24,
                height: 32,
                speed: GAME_SPEED * gameSpeedMultiplier * 0.5, // Move slower than obstacles
                collected: false,
                glowPhase: 0 // For animated glow effect
            });
            
            // Rocket spawned
            
            // Remove this spawn score from the list
            rocketSpawnScores.splice(i, 1);
        }
    }
}

function updateRockets() {
    for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        
        // Move rocket left
        rocket.x -= rocket.speed;
        
        // Update glow animation
        rocket.glowPhase += 0.1;
        
        // Remove if off screen
        if (rocket.x + rocket.width < 0) {
            rockets.splice(i, 1);
            continue;
        }
        
        // Check collection
        if (!rocket.collected && checkRocketCollision(dino, rocket)) {
            rocket.collected = true;
            dashCharges++;
            
            // Remove collected rocket
            rockets.splice(i, 1);
        }
    }
}

function checkRocketCollision(dino, rocket) {
    // Generous hitbox for rocket collection
    const collisionMargin = 8; // pixels
    
    return dino.x < rocket.x + rocket.width + collisionMargin &&
           dino.x + dino.width + collisionMargin > rocket.x &&
           dino.y < rocket.y + rocket.height + collisionMargin &&
           dino.y + dino.height + collisionMargin > rocket.y;
}

function spawnPlatform() {
    // Stop spawning platforms when ending sequence starts
    if (score >= ENDING_SCORE) {
        return;
    }
    
    const now = Date.now();
    
    // Platforms appear after level 20 for platform jumping gameplay - increased frequency
    if (score > 20 && now - lastPlatformSpawn > (2000 + Math.random() * 2000)) {
        const currentSpeed = GAME_SPEED * gameSpeedMultiplier;
        
        // More random heights with better variation - multiple levels
        const baseHeights = [
            ground.y - 40,  // Very very low
            ground.y - 55,  // Very low
            ground.y - 70,  // Low 
            ground.y - 85,  // Medium low
            ground.y - 100, // Medium
            ground.y - 115, // Medium high
            ground.y - 130, // High
            ground.y - 145, // Higher
            ground.y - 160, // Very high (still reachable with triple jump)
        ];
        
        // Add random variation to each height
        const baseHeight = baseHeights[Math.floor(Math.random() * baseHeights.length)];
        const randomVariation = (Math.random() - 0.5) * 15; // ±7.5 pixels variation
        const finalHeight = baseHeight + randomVariation;
        
        // Extended platform sizes for better platform jumping
        const platformSizes = [
            { width: 40, name: 'small' },    // Small platforms - challenging
            { width: 60, name: 'medium' },   // Medium platforms - balanced
            { width: 80, name: 'large' },    // Large platforms - easier
            { width: 100, name: 'xlarge' },  // Extra large platforms
            { width: 120, name: 'xxl' },     // XXL platforms - great for hopping
            { width: 140, name: 'xxxl' }     // XXXL platforms - super platforms
        ];
        
        // Adjusted weighted random selection - Make larger platforms much more common after score 20
        // Small platforms should be rare, larger platforms should be common
        let sizeWeights;
        if (score >= 20) {
            // After score 20: Favor large platforms heavily
            sizeWeights = [2, 8, 15, 25, 30, 20]; // small: 2%, medium: 8%, large: 15%, xlarge: 25%, xxl: 30%, xxxl: 20%
        } else {
            // Before score 20: Original distribution
            sizeWeights = [5, 20, 25, 25, 15, 10]; // small: 5%, medium: 20%, large: 25%, xlarge: 25%, xxl: 15%, xxxl: 10%
        }
        
        const random = Math.random() * 100;
        let selectedSize;
        
        // Simplified selection logic to ensure it works correctly
        let cumulativeWeight = 0;
        for (let i = 0; i < sizeWeights.length; i++) {
            cumulativeWeight += sizeWeights[i];
            if (random < cumulativeWeight) {
                selectedSize = platformSizes[i];
                break;
            }
        }
        
        // Fallback to medium if something goes wrong
        if (!selectedSize) {
            selectedSize = platformSizes[1]; // medium
        }
        
        platforms.push({
            x: canvas.width + 100,
            y: finalHeight,
            width: selectedSize.width,
            height: 12, // Keep height consistent
            speed: currentSpeed * 0.5, // FIXED: Make platforms move at half speed for easier landing
            size: selectedSize.name // Store size for debugging/effects
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
        
        // SIMPLE: Check if dino is touching platform - reset jumps on any contact
        if (checkPlatformTouch(dino, platforms[i])) {
            // Snap dino to platform top only if falling down
            if (velocityY > 0) {
                dino.y = platforms[i].y - dino.height;
                isJumping = false;
                isFalling = false; // Reset falling state
                velocityY = 0;
            }
            
            // SUPER SIMPLE: Always give back all jumps when touching platform
            // This should work whether you touch during jump 1, 2, or 3
            canDoubleJump = true; // Reset to allow double jump
            canTripleJump = false; // Reset triple jump availability
            onPlatform = true;
            platformJumpRefresh = true;
        }
    }
    
    // If dino is not on any platform and not jumping, check if should fall
    if (!onPlatform && !isJumping && dino.y < ground.y - dino.height) {
        isJumping = true; // Start falling
        isFalling = true; // This is natural falling, not an active jump
        velocityY = 0; // Start falling from rest
        // CRITICAL FIX: When falling off platform, give player full jump count
        // as if they're doing their first jump - this allows double/triple jump in air
        canDoubleJump = true; // Allow double jump
        canTripleJump = false; // Triple jump becomes available after double jump
    }
}

function checkPlatformTouch(dino, platform) {
    // SIMPLE: Just check if dino is touching the platform at all
    // No complex landing detection - just touching = reset jumps
    return dino.x + 10 < platform.x + platform.width &&     // Dino overlaps platform horizontally
           dino.x + dino.width - 10 > platform.x &&          // (with small margin for better feel)
           dino.y + dino.height >= platform.y &&             // Dino is at or below platform top
           dino.y + dino.height <= platform.y + platform.height + 8; // Within platform thickness + tolerance
}

// Boss System Functions
function shouldSpawnBoss() {
    // Boss appears at specific scores only: 50, 200, 350, 450
    const bossScores = [50, 200, 350, 450];
    return bossScores.includes(score) && score > lastBossScore;
}

function shouldSpawnGreenGoblin() {
    // Green Goblin appears at specific scores only: 150, 450
    const goblinScores = [150, 450];
    return goblinScores.includes(score) && score > lastGreenGoblinScore;
}

function spawnBoss() {
    if (score >= ENDING_SCORE) return; // Stop spawning in ending sequence
    if (!bossActive && shouldSpawnBoss()) {
        // Set boss level and duration based on specific score
        let bossDuration;
        let bossLevel;
        
        switch (score) {
            case 50:
                bossLevel = 1;
                bossDuration = 15000; // 15 seconds
                break;
            case 200:
                bossLevel = 2;
                bossDuration = 20000; // 20 seconds
                break;
            case 350:
                bossLevel = 3;
                bossDuration = 22000; // 22 seconds
                break;
            case 450:
                bossLevel = 4;
                bossDuration = 45000; // 45 seconds
                break;
            default:
                bossLevel = 1;
                bossDuration = 15000; // fallback
        }
        
        // Create new boss sprite with current level
        bossSprite = createBossSprite(bossLevel);
        
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
        
        // 🎵 Play boss music when boss spawns (only if Green Goblin isn't active)
        if (!greenGoblinActive) {
            playBossMusic();
        }
        
        console.log(`🧌 Boss spawned at level ${score} for ${bossDuration/1000} seconds`);
    }
}

function spawnGreenGoblin() {
    if (score >= ENDING_SCORE) return; // Stop spawning in ending sequence
    if (!greenGoblinActive && shouldSpawnGreenGoblin()) {
        // Set Green Goblin level and duration based on specific score
        let goblinDuration;
        let goblinLevel;
        
        switch (score) {
            case 150:
                goblinLevel = 1;
                goblinDuration = 15000; // 15 seconds
                break;
            case 450:
                goblinLevel = 2;
                goblinDuration = 45000; // 45 seconds
                break;
            default:
                goblinLevel = 1;
                goblinDuration = 15000; // fallback
        }
        
        greenGoblin = {
            x: canvas.width - GREEN_GOBLIN_WIDTH - 20, // Right edge
            y: 80, // Start in sky
            width: GREEN_GOBLIN_WIDTH,
            height: GREEN_GOBLIN_HEIGHT,
            level: goblinLevel,
            duration: goblinDuration,
            spawnTime: Date.now(),
            baseY: 80, // Base flying height
            flyOffset: 0 // For up/down movement
        };
        
        greenGoblinActive = true;
        greenGoblinSpawnTime = performance.now();
        greenGoblinShootTime = performance.now() + Math.random() * 2000 + 1000; // Shoot in 1-3 seconds
        lastGreenGoblinScore = score;
        greenGoblinFlyDirection = 1; // Start flying up
        
        // 🎵 Play Green Goblin music (takes priority over regular boss music)
        playGreenGoblinMusic();
        
        console.log(`👹 Green Goblin spawned at level ${score} for ${goblinDuration/1000} seconds`);
    }
}

function updateBoss(currentTime) {
    if (!bossActive || !boss) return;
    
    // Check if boss duration has ended
    if (currentTime - bossSpawnTime > boss.duration) {
        bossActive = false;
        boss = null;
        
        // 🎵 Stop boss music when boss is defeated
        stopBossMusic();
        
        showBossDefeated();
        return;
    }
    
    // Boss jumping behavior
    if (currentTime > bossJumpTime && !boss.isJumping) {
        boss.isJumping = true;
        boss.velocityY = BOSS_JUMP_FORCE;
        // Schedule next jump
        bossJumpTime = currentTime + Math.random() * 4000 + 3000; // 3-7 seconds
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
}

function updateGreenGoblin(currentTime) {
    if (!greenGoblinActive || !greenGoblin) return;
    
    // Check if Green Goblin duration has ended
    if (currentTime - greenGoblinSpawnTime > greenGoblin.duration) {
        greenGoblinActive = false;
        greenGoblin = null;
        
        // 🎵 Stop Green Goblin music when Green Goblin is defeated
        stopGreenGoblinMusic();
        
        showGreenGoblinDefeated();
        return;
    }
    
    // Green Goblin flying behavior (up and down movement)
    greenGoblin.flyOffset += greenGoblinFlyDirection * GREEN_GOBLIN_FLY_SPEED;
    
    // Change direction when reaching limits
    if (greenGoblin.flyOffset > 30) {
        greenGoblinFlyDirection = -1; // Start going down
    } else if (greenGoblin.flyOffset < -30) {
        greenGoblinFlyDirection = 1; // Start going up
    }
    
    // Update Green Goblin position
    greenGoblin.y = greenGoblin.baseY + greenGoblin.flyOffset;
    
    // Green Goblin shooting behavior
    if (currentTime > greenGoblinShootTime) {
        shootLaser();
        // Schedule next laser - slower frequency, faster for higher levels
        const baseInterval = 3500; // 3.5 seconds (was 2.5s)
        const levelSpeedup = (greenGoblin.level - 1) * 200; // 0.2s faster per level
        const shootInterval = Math.max(baseInterval - levelSpeedup, 1500); // Minimum 1.5 seconds (was 1s)
        greenGoblinShootTime = currentTime + Math.random() * shootInterval + 750; // +750ms (was +500ms)
    }
}

function shootLaser() {
    if (!greenGoblin) return;
    
    // Calculate trajectory toward player
    const startX = greenGoblin.x - 10;
    const startY = greenGoblin.y + greenGoblin.height / 2;
    const targetX = dino.x + dino.width / 2;
    const targetY = dino.y + dino.height / 2;
    
    // Calculate direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and apply speed
    const velocityX = (dx / distance) * LASER_SPEED;
    const velocityY = (dy / distance) * LASER_SPEED;
    
    lasers.push({
        x: startX,
        y: startY,
        width: LASER_WIDTH,
        height: LASER_HEIGHT,
        velocityX: velocityX,
        velocityY: velocityY,
        rotation: Math.atan2(dy, dx) // Angle for proper laser orientation
    });
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        
        // Move laser
        laser.x += laser.velocityX;
        laser.y += laser.velocityY;
        
        // Remove if off screen
        if (laser.x < -50 || laser.x > canvas.width + 50 || 
            laser.y < -50 || laser.y > canvas.height + 50) {
            lasers.splice(i, 1);
            continue;
        }
        
        // Check collision with player using precise laser collision
        if (checkLaserCollision(dino, laser) && !invincible && !isDashing) {
            attemptDeath('green_goblin_laser');
            return;
        }
    }
}

function checkLaserCollision(dino, laser) {
    // Use smaller hitboxes for laser collision (similar to fireball but for longer projectile)
    const laserHitboxReduction = 4; // pixels to reduce from each side
    const dinoHitboxReduction = 6; // slightly smaller dino hitbox for fairer gameplay
    
    const laserHitbox = {
        x: laser.x + laserHitboxReduction,
        y: laser.y + laserHitboxReduction,
        width: laser.width - (laserHitboxReduction * 2),
        height: laser.height - (laserHitboxReduction * 2)
    };
    
    const dinoHitbox = {
        x: dino.x + dinoHitboxReduction,
        y: dino.y + dinoHitboxReduction,
        width: dino.width - (dinoHitboxReduction * 2),
        height: dino.height - (dinoHitboxReduction * 2)
    };
    
    return dinoHitbox.x < laserHitbox.x + laserHitbox.width &&
           dinoHitbox.x + dinoHitbox.width > laserHitbox.x &&
           dinoHitbox.y < laserHitbox.y + laserHitbox.height &&
           dinoHitbox.y + dinoHitbox.height > laserHitbox.y;
}

function showGreenGoblinDefeated() {
    const greenGoblinDefeatedText = document.getElementById('greenGoblinDefeated');
    
    // Show the Green Goblin defeated message
    greenGoblinDefeatedText.classList.add('visible');
    
    // Hide it after 2 seconds
    setTimeout(() => {
        greenGoblinDefeatedText.classList.remove('visible');
    }, 2000);
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
        
        // Check collision with player using precise fireball collision
        if (checkFireballCollision(dino, fireball) && !invincible && !isDashing) {
            attemptDeath('boss_fireball');
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
}

function gameOver(cause = 'obstacle') {
    isGameOver = true;
    // Don't set gameStarted = false immediately - let death screen show first
    deathCause = cause;
    isShowingDeathScreen = true;
    deathScreenStartTime = performance.now();
    
    pauseMusic(); // Use new music system
    
    // 🎵 Stop boss/Green Goblin music if it's playing when game ends
    stopBossMusic();
    stopGreenGoblinMusic();
    
    console.log(`💀 Player died from: ${cause}`);
    
    // Hide original game over elements
    const gameOverText = document.getElementById('gameOver');
    const restartButton = document.getElementById('restartButton');
    gameOverText.classList.remove('visible');
    restartButton.classList.remove('visible');
    
    // After death screen duration, transition to high score screen
    setTimeout(() => {
        isShowingDeathScreen = false;
        gameStarted = false; // Now we can reset this
        highScoreScreenActive = true;
        
        if (window.leaderboard && window.leaderboard.checkForHighScore) {
            window.leaderboard.checkForHighScore(score);
        } else {
            console.error('Leaderboard not initialized yet! Score:', score);
        }
    }, DEATH_SCREEN_DURATION);
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
    
    console.log('🔍 Checking buttons:');
    console.log('playGameBtn:', playGameBtn);
    console.log('viewHighscoresBtn:', viewHighscoresBtn);
    
    if (playGameBtn) {
        console.log('✅ Adding event listeners to playGameBtn');
        
        playGameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎮 Play Game button clicked!');
            startGameFromMenu();
        });
        
        playGameBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎮 Play Game button touched!');
            startGameFromMenu();
        });
        
        // Also handle touchstart to prevent interference
        playGameBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    } else {
        console.error('❌ playGameBtn not found!');
    }
    
    if (viewHighscoresBtn) {
        console.log('✅ Adding event listeners to viewHighscoresBtn');
        
        // Simple direct click first
        viewHighscoresBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏆 Highscore button direct onclick!');
            showHighscoresFromMenu();
        };
        
        viewHighscoresBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏆 Highscore button clicked!');
            showHighscoresFromMenu();
        });
        
        viewHighscoresBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏆 Highscore button touched!');
            showHighscoresFromMenu();
        });
        
        // Also handle touchstart to prevent interference
        viewHighscoresBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Test if button is actually clickable
        console.log('🔍 Button details:', {
            id: viewHighscoresBtn.id,
            className: viewHighscoresBtn.className,
            style: viewHighscoresBtn.style.cssText,
            disabled: viewHighscoresBtn.disabled,
            offsetWidth: viewHighscoresBtn.offsetWidth,
            offsetHeight: viewHighscoresBtn.offsetHeight
        });
    } else {
        console.error('❌ viewHighscoresBtn not found!');
    }
    
    // Guide button event listeners
    const guideBtn = document.getElementById('guideBtn');
    if (guideBtn) {
        console.log('✅ Adding event listeners to guideBtn');
        
        guideBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📖 Guide button clicked!');
            showGuideFromMenu();
        });
        
        guideBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📖 Guide button touched!');
            showGuideFromMenu();
        });
        
        guideBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    } else {
        console.error('❌ guideBtn not found!');
    }
    
    // Start the preview animation
    if (previewCtx) {
        initPreviewElements();
        animatePreview();
    }
    
    console.log('🎮 Start screen initialized');
}

// Guide screen functions
function showGuideFromMenu() {
    console.log('📖 Showing guide from menu...');
    
    // Hide start screen
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
    
    // Show guide screen
    const guideScreen = document.getElementById('guideScreen');
    if (guideScreen) {
        guideScreen.style.display = 'block';
        setTimeout(() => {
            guideScreen.classList.add('show');
        }, 50);
    }
    
    // Add back to menu button event
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    
    if (backToMenuBtn) {
        backToMenuBtn.onclick = hideGuideScreen;
    }
}

function hideGuideScreen() {
    console.log('📖 Hiding guide screen...');
    
    const guideScreen = document.getElementById('guideScreen');
    if (guideScreen) {
        guideScreen.classList.remove('show');
        setTimeout(() => {
            guideScreen.style.display = 'none';
            // Show start screen again
            showStartScreen();
        }, 300);
    }
}

function initPreviewElements() {
    // Initialize a simplified preview of the game
    // This creates a static scene showing the alien and some obstacles
}

let previewAnimationId = null;
let lastPreviewUpdate = 0;
const PREVIEW_FPS = 30; // Limit preview to 30 FPS to reduce CPU usage

function animatePreview() {
    if (!previewCanvas || !previewCtx || gameStarted) {
        if (previewAnimationId) {
            cancelAnimationFrame(previewAnimationId);
            previewAnimationId = null;
        }
        return;
    }
    
    const now = performance.now();
    if (now - lastPreviewUpdate >= 1000 / PREVIEW_FPS) {
        // Clear the preview canvas
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Draw a simplified game preview
        drawPreviewBackground();
        drawPreviewDino();
        drawPreviewObstacles();
        
        lastPreviewUpdate = now;
    }
    
    // Continue animation with throttling
    previewAnimationId = requestAnimationFrame(animatePreview);
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
    
    // CRITICAL FIX: Clear high score screen protection when returning to menu
    highScoreScreenActive = false;
    console.log('🛡️ High score screen protection cleared - returning to menu');
    
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
    
    // Restart preview animation
    if (previewCanvas && previewCtx && !previewAnimationId) {
        animatePreview();
    }
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
    
    // Stop preview animation to improve performance
    if (previewAnimationId) {
        cancelAnimationFrame(previewAnimationId);
        previewAnimationId = null;
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
        if (musicEnabled) {
            playMusic(); // Start music when game begins (only if enabled)
        }
    }, 300);
}

function showHighscoresFromMenu() {
    console.log('🏆 Showing highscores from menu...');
    console.log('🔍 Debug info:');
    console.log('- window.leaderboard:', window.leaderboard);
    console.log('- typeof window.leaderboard.showLeaderboard:', typeof window.leaderboard?.showLeaderboard);
    
    // First check if modal exists
    const leaderboardModal = document.getElementById('leaderboardModal');
    if (!leaderboardModal) {
        console.error('❌ Leaderboard modal not found in DOM!');
        alert('Error: Leaderboard interface not found!');
        return;
    }
    
    console.log('✅ Leaderboard modal found');
    
    // SIMPLE DIRECT MODAL SHOW - bypass all complex logic
    console.log('🔧 Showing modal directly...');
    leaderboardModal.style.display = 'block';
    leaderboardModal.style.zIndex = '9999';
    leaderboardModal.style.position = 'fixed';
    leaderboardModal.style.top = '0';
    leaderboardModal.style.left = '0';
    leaderboardModal.style.width = '100%';
    leaderboardModal.style.height = '100%';
    
    // Try to load leaderboards if available
    if (window.leaderboard) {
        try {
            if (window.leaderboard.loadModalEliteLeaderboard) {
                window.leaderboard.loadModalEliteLeaderboard();
            }
            if (window.leaderboard.loadModalGlobalLeaderboard) {
                window.leaderboard.loadModalGlobalLeaderboard();
            }
        } catch (error) {
            console.error('Error loading leaderboards:', error);
        }
    } else {
        console.log('⚠️ No leaderboard system available');
    }
    
    // Add close listeners
    const closeBtn = document.getElementById('closeLeaderboard');
    const xBtn = document.querySelector('.close-btn');
    
    const closeHandler = () => {
        console.log('🔧 Closing leaderboard modal');
        leaderboardModal.style.display = 'none';
        if (!gameStarted) {
            showStartScreen();
        }
    };
    
    if (closeBtn) {
        closeBtn.onclick = closeHandler;
    }
    if (xBtn) {
        xBtn.onclick = closeHandler;
    }
    
    // Click outside to close
    leaderboardModal.onclick = (e) => {
        if (e.target === leaderboardModal) {
            closeHandler();
        }
    };
    
    console.log('✅ Leaderboard modal should now be visible');
}

function startGame() {
    // CRITICAL: Ensure touch system is working before starting game
    console.log('🔧 Ensuring touch system is working before game start');
    document.removeEventListener('touchstart', handleTouch);
    document.addEventListener('touchstart', handleTouch);
    lastTapTime = 0; // Reset touch timing
    console.log('✅ Touch system refreshed for new game');
    
    // CRITICAL FIX: Clear high score screen protection when starting new game
    highScoreScreenActive = false;
    console.log('🛡️ High score screen protection deactivated - new game starting');
    
    // Reset game state
    score = 0;
    obstacles.length = 0;
    birds.length = 0;
    platforms.length = 0;
    isGameOver = false;
    gameStarted = true; // Set this to true to enable the game loop
    dino.y = ground.y - dino.height;
    isJumping = false;
    isFalling = false;
    canDoubleJump = false;
    canTripleJump = false;
    velocityY = 0;
    lastObstacleSpawn = Date.now();
    lastPlatformSpawn = Date.now();
    gameSpeedMultiplier = 1;
    
    // Reset death screen state
    isShowingDeathScreen = false;
    deathScreenStartTime = 0;
    deathCause = null;
    
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
    
    // Reset Green Goblin system
    greenGoblin = null;
    greenGoblinActive = false;
    greenGoblinLevel = 1;
    greenGoblinFlyDirection = 1;
    lasers.length = 0;
    lastGreenGoblinScore = 0;
    
    // Reset dash system
    dashCharges = 0;
    isDashing = false;
    dashTimer = 0;
    dashCooldown = 0;
    rockets.length = 0;
    currentHundredInterval = -1;
    rocketSpawnScores = [];
    
    // Reset secret code buffer
    secretCodeBuffer = '';
    
    // Reset platform jump refresh flag
    platformJumpRefresh = false;
    
    // Reset jump counter state (respects user's enabled/disabled preference)
    // jumpCounterEnabled keeps its value from user preference
    
    // Reset ending sequence
    endingSequenceStarted = false;
    endingPhase = 'none';
    endingStartTime = 0;
    oogway = null;
    
    // 🎵 Stop any boss/Green Goblin music when starting new game
    stopBossMusic();
    stopGreenGoblinMusic();
    
    // Initialize game elements if needed
    if (stars.length === 0) initStars();
    if (clouds.length === 0) initClouds();
    if (hills.length === 0) initHills();
    
    // Hide game over UI
    const gameOverText = document.getElementById('gameOver');
    const restartButton = document.getElementById('restartButton');
    gameOverText.classList.remove('visible');
    restartButton.classList.remove('visible');
    
    // Hide start screen if it's visible
    hideStartScreen();
    
    // Make sure no modal or highscore screen is visible when starting game
    const leaderboardModal = document.getElementById('leaderboardModal');
    const highScoreScreen = document.getElementById('highScoreScreen');
    const highScoreForm = document.getElementById('highScoreForm');
    
    if (leaderboardModal && leaderboardModal.style.display === 'block') {
        leaderboardModal.style.display = 'none';
        console.log('🔧 Closed leaderboard modal when starting game');
    }
    
    if (highScoreScreen && !highScoreScreen.classList.contains('hidden')) {
        highScoreScreen.classList.add('hidden');
        console.log('🔧 Closed highscore screen when starting game');
    }
    
    // CRITICAL FIX: Hide the highscore form properly
    if (highScoreForm && !highScoreForm.classList.contains('hidden')) {
        highScoreForm.classList.add('hidden');
        console.log('🔧 Hidden highscore form when starting game');
    }
    
    // Restart music with new system (but don't auto-start here, let startGameFromMenu handle it)
    // playMusic();
    invincible = false;
    invincibilityTimer = 0;
    invincibilityChargesUsed = 0;
    
    console.log('🎮 Game started!');
    
    // TEST: Add a simple touch test that can be called manually
    window.testTouch = function() {
        console.log('🧪 Testing touch system manually...');
        const testEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [{ clientX: 100, clientY: 100 }]
        });
        document.dispatchEvent(testEvent);
        console.log('🧪 Test touch event dispatched');
    };
    
    console.log('🧪 Touch test function available: window.testTouch()');
}

// Add a proper lastUpdateTime variable for delta time calculation
let lastUpdateTime = 0;

function update(currentTime) {
    if (isGameOver || !gameStarted || highScoreScreenActive) return;

    // Calculate proper delta time
    const deltaTime = currentTime - lastUpdateTime;
    lastUpdateTime = currentTime;

    // Update invincibility first (with proper delta time)
    updateInvincibility(deltaTime);
    
    // Update dash system
    updateDash(deltaTime);

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
            isFalling = false; // Reset falling state
            // FIXED: Properly reset ALL jump abilities when landing on ground (same as platforms)
            canDoubleJump = true; // Reset to allow double jump
            canTripleJump = false; // Reset triple jump availability
        }
    }
    
    // Apply dash movement
    if (isDashing) {
        dino.x += DASH_SPEED;
        // Keep dino within screen bounds during dash
        if (dino.x > canvas.width - dino.width - 50) {
            dino.x = canvas.width - dino.width - 50;
        }
    } else {
        // Return dino to normal position gradually when not dashing
        if (dino.x > 100) {
            dino.x = Math.max(100, dino.x - 2); // Gradually return to start position
        }
    }

    // Update clouds
    updateClouds();

    // Fish removed - no longer needed

    // Update birds
    updateBirds();

    // Update platforms
    updatePlatforms();
    
    // Update rockets
    updateRockets();

    // Spawn new obstacles
    spawnObstacle();
    
    // Spawn platforms (after score 20)
    spawnPlatform();
    
    // Spawn rocket power-ups
    spawnRockets();
    
    // Boss system
    spawnBoss();
    updateBoss(currentTime);
    updateFireballs();
    
    // Green Goblin system
    spawnGreenGoblin();
    updateGreenGoblin(currentTime);
    updateLasers();

    // Handle ending sequence
    updateEndingSequence(currentTime);
    
    // Update jump counter UI
    updateJumpCounter();

    // Update obstacles with individual speeds
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacles[i].speed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            // Cap score at ending score
            if (score < ENDING_SCORE) {
                score++;
            }
        } else if (checkCollision(dino, obstacles[i]) && !invincible && !isDashing) {
            const cactusType = obstacles[i].type || 'cactus';
            attemptDeath(cactusType);
            return;
        }
    }
}

function updateEndingSequence(currentTime) {
    // Start ending sequence when score reaches 500
    if (score >= ENDING_SCORE && !endingSequenceStarted) {
        endingSequenceStarted = true;
        endingPhase = 'clearing_screen';
        endingStartTime = currentTime;
        console.log('🎬 Ending sequence started! Score reached 500 - waiting for screen to clear');
    }
    
    if (!endingSequenceStarted) return;
    
    const elapsedTime = currentTime - endingStartTime;
    
    switch (endingPhase) {
        case 'clearing_screen':
            // Wait for all enemies/obstacles/bosses to leave screen
            if (isScreenClearOfEnemies()) {
                endingPhase = 'waiting';
                endingStartTime = currentTime;
                console.log('🧹 Screen cleared! Starting 5-second peace period');
            }
            break;
            
        case 'waiting':
            // Wait 5 seconds with no obstacles
            if (elapsedTime >= ENDING_WAIT_TIME) {
                endingPhase = 'oogway_appears';
                endingStartTime = currentTime;
                spawnOogway();
                console.log('🐢 Oogway appears!');
            }
            break;
            
        case 'oogway_appears':
            // Oogway slides in from right for 2 seconds
            if (elapsedTime >= 2000) {
                endingPhase = 'speech1';
                endingStartTime = currentTime;
                console.log('💬 Oogway starts speaking');
            }
            break;
            
        case 'speech1':
            // First speech bubble
            if (elapsedTime >= SPEECH_BUBBLE_DURATION) {
                endingPhase = 'speech2';
                endingStartTime = currentTime;
            }
            break;
            
        case 'speech2':
            // Second speech bubble
            if (elapsedTime >= SPEECH_BUBBLE_DURATION) {
                endingPhase = 'speech3';
                endingStartTime = currentTime;
            }
            break;
            
        case 'speech3':
            // Third speech bubble
            if (elapsedTime >= SPEECH_BUBBLE_DURATION) {
                endingPhase = 'speech4';
                endingStartTime = currentTime;
            }
            break;
            
        case 'speech4':
            // Fourth speech bubble
            if (elapsedTime >= SPEECH_BUBBLE_DURATION) {
                endingPhase = 'moving';
                endingStartTime = currentTime;
                console.log('🚀 Dino and Oogway start moving together');
            }
            break;
            
        case 'moving':
            // Both characters move off-screen
            if (oogway) {
                oogway.x += 2; // Move right
                dino.x += 2; // Move dino right too
            }
            
            if (elapsedTime >= 3000) { // 3 seconds of moving
                endingPhase = 'fade_out';
                endingStartTime = currentTime;
                console.log('🌅 Starting fade out');
            }
            break;
            
        case 'fade_out':
            // Fade out effect
            if (elapsedTime >= FADE_DURATION) {
                endingPhase = 'final_message';
                endingStartTime = currentTime;
                console.log('💫 Showing final message');
            }
            break;
            
        case 'final_message':
            // Show final message
            if (elapsedTime >= FINAL_MESSAGE_DURATION) {
                // End the game normally so player can enter their name
                console.log('🎉 Game completed!');
                gameOver('ending_complete');
            }
            break;
    }
}

function getCurrentJumpCount() {
    // Calculate how many jumps the player currently has available
    if (!isJumping) {
        // On ground or platform - full 3 jumps available
        return 3;
    } else if (isFalling) {
        // Falling naturally off platform - full 3 jumps available
        return 3;
    } else if (canTripleJump) {
        // Has used first and second jump - 1 jump left
        return 1;
    } else if (canDoubleJump) {
        // Has used first jump only - 2 jumps left  
        return 2;
    } else {
        // Has used all jumps - 0 jumps left
        return 0;
    }
}

function updateJumpCounter() {
    const jumpCounterElement = document.getElementById('jumpCounter');
    if (!jumpCounterElement) return;
    
    // Hide counter if disabled or game not started/over
    if (!jumpCounterEnabled || !gameStarted || isGameOver) {
        jumpCounterElement.style.display = 'none';
        return;
    }
    
    jumpCounterElement.style.display = 'block';
    const jumps = getCurrentJumpCount();
            jumpCounterElement.textContent = `${jumps}`;
    
    // Color based on remaining jumps - using duller, darker colors
    if (jumps === 3) {
        jumpCounterElement.style.color = '#1a5d1a'; // Muted dark green - full jumps
    } else if (jumps === 2) {
        jumpCounterElement.style.color = '#8b7d00'; // Muted dark gold - good
    } else if (jumps === 1) {
        jumpCounterElement.style.color = '#a0540a'; // Muted dark orange - warning
    } else {
        jumpCounterElement.style.color = '#7a3a3a'; // Muted dark red - no jumps
    }
}

function isScreenClearOfEnemies() {
    // Check if screen is completely clear of all enemies, obstacles, and bosses
    return obstacles.length === 0 && 
           birds.length === 0 && 
           platforms.length === 0 && 
           fireballs.length === 0 && 
           lasers.length === 0 && 
           rockets.length === 0 && 
           !bossActive && 
           !greenGoblinActive;
}

function spawnOogway() {
    oogway = {
        x: canvas.width + 100, // Start off-screen right
        y: ground.y - 80, // On ground (sprite height is 80)
        width: 80,
        height: 80,
        targetX: canvas.width - 200 // Target position
    };
}

function checkCollision(dino, obstacle) {
    // Cactus-type specific collision detection for accurate hitboxes
    const dinoHitboxReduction = 6; // slightly smaller dino hitbox for fairer gameplay
    
    const dinoHitbox = {
        x: dino.x + dinoHitboxReduction,
        y: dino.y + dinoHitboxReduction,
        width: dino.width - (dinoHitboxReduction * 2),
        height: dino.height - (dinoHitboxReduction * 2)
    };
    
    // Different hitbox logic based on cactus type
    if (obstacle.type === 'xxl') {
        // XXL Cactus: Check collision with main trunk + arms separately for accuracy
        // Main trunk area (center thick part)
        const trunkHitbox = {
            x: obstacle.x + (obstacle.width * 0.35), // 35% from left (main trunk area)
            y: obstacle.y + 2,
            width: obstacle.width * 0.3, // 30% of width (thick trunk)
            height: obstacle.height - 4
        };
        
        // Left arm area (extends to left edge)
        const leftArmHitbox = {
            x: obstacle.x + 2, // Small margin from absolute edge
            y: obstacle.y + (obstacle.height * 0.25), // Arms are in middle area
            width: obstacle.width * 0.2, // 20% of width
            height: obstacle.height * 0.5 // Arms cover middle 50% of height
        };
        
        // Right arm area (extends to right edge)
        const rightArmHitbox = {
            x: obstacle.x + (obstacle.width * 0.8), // 80% from left
            y: obstacle.y + (obstacle.height * 0.25),
            width: obstacle.width * 0.18, // 18% of width (small margin from edge)
            height: obstacle.height * 0.5
        };
        
        // Check collision with any of the three areas
        return checkBoxCollision(dinoHitbox, trunkHitbox) ||
               checkBoxCollision(dinoHitbox, leftArmHitbox) ||
               checkBoxCollision(dinoHitbox, rightArmHitbox);
               
    } else if (obstacle.type === 'xl') {
        // XL Cactus: Check main trunk + arms
        // Main trunk
        const trunkHitbox = {
            x: obstacle.x + (obstacle.width * 0.33), // 33% from left
            y: obstacle.y + 2,
            width: obstacle.width * 0.34, // 34% of width (trunk)
            height: obstacle.height - 4
        };
        
        // Left arm
        const leftArmHitbox = {
            x: obstacle.x + 3, // Small margin
            y: obstacle.y + (obstacle.height * 0.3), // Arms in lower area
            width: obstacle.width * 0.15, // 15% of width
            height: obstacle.height * 0.4 // Arms cover 40% of height
        };
        
        // Right arm
        const rightArmHitbox = {
            x: obstacle.x + (obstacle.width * 0.82), // 82% from left
            y: obstacle.y + (obstacle.height * 0.35),
            width: obstacle.width * 0.15, // 15% of width
            height: obstacle.height * 0.35
        };
        
        return checkBoxCollision(dinoHitbox, trunkHitbox) ||
               checkBoxCollision(dinoHitbox, leftArmHitbox) ||
               checkBoxCollision(dinoHitbox, rightArmHitbox);
               
    } else {
        // Normal cactus: Use traditional method with appropriate reduction
        const obstacleHitboxReduction = 4; // pixels to reduce from each side
        
        const obstacleHitbox = {
            x: obstacle.x + obstacleHitboxReduction,
            y: obstacle.y + obstacleHitboxReduction,
            width: obstacle.width - (obstacleHitboxReduction * 2),
            height: obstacle.height - (obstacleHitboxReduction * 2)
        };
        
        return checkBoxCollision(dinoHitbox, obstacleHitbox);
    }
}

// Helper function for box collision detection
function checkBoxCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y;
}

function checkFireballCollision(dino, fireball) {
    // Use smaller hitbox for more precise fireball collision
    // Reduce fireball hitbox by 30% on all sides to match visual size better
    const fireballHitboxReduction = 3; // pixels to reduce from each side
    const dinoHitboxReduction = 5; // slightly smaller dino hitbox for fairer gameplay
    
    const fireballHitbox = {
        x: fireball.x + fireballHitboxReduction,
        y: fireball.y + fireballHitboxReduction,
        width: fireball.width - (fireballHitboxReduction * 2),
        height: fireball.height - (fireballHitboxReduction * 2)
    };
    
    const dinoHitbox = {
        x: dino.x + dinoHitboxReduction,
        y: dino.y + dinoHitboxReduction,
        width: dino.width - (dinoHitboxReduction * 2),
        height: dino.height - (dinoHitboxReduction * 2)
    };
    
    return dinoHitbox.x < fireballHitbox.x + fireballHitbox.width &&
           dinoHitbox.x + dinoHitbox.width > fireballHitbox.x &&
           dinoHitbox.y < fireballHitbox.y + fireballHitbox.height &&
           dinoHitbox.y + dinoHitbox.height > fireballHitbox.y;
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

    // Draw simple ground with two layers
    // Bottom layer - brown earth
    ctx.fillStyle = '#5D4037';  // Brown ground
    ctx.fillRect(0, ground.y, canvas.width, ground.height);
    
    // Top layer - green grass (straight line across top)
    ctx.fillStyle = '#1B5E20';  // Darker green grass
    ctx.fillRect(0, ground.y, canvas.width, 8);

    // Underground environment - brown earth
    const undergroundGradient = ctx.createLinearGradient(0, ground.y + ground.height, 0, canvas.height);
    undergroundGradient.addColorStop(0, 'rgba(101, 67, 33, 0.9)');      // Brown transition
    undergroundGradient.addColorStop(0.3, 'rgba(62, 39, 35, 0.95)');    // Deeper brown
    undergroundGradient.addColorStop(0.7, 'rgba(33, 30, 16, 0.98)');    // Deep earth
    undergroundGradient.addColorStop(1, 'rgba(20, 18, 10, 1)');         // Underground depths
    ctx.fillStyle = undergroundGradient;
    ctx.fillRect(0, ground.y + ground.height, canvas.width, canvas.height - (ground.y + ground.height));

    // Enhanced underwater bubbles and sparkles - much more visible
    for (let i = 0; i < 25; i++) {
        const bubbleX = (i * 45 + score * 0.2) % canvas.width;
        const bubbleY = ground.y + ground.height + 15 + (i * 18) % (canvas.height - ground.y - ground.height - 30);
        const twinkle = Math.sin(Date.now() / 1500 + i * 0.3) * 0.5 + 0.5;
        const opacity = twinkle * 0.4 + 0.2; // Much more visible
        
        // Larger, more visible bubbles
        ctx.fillStyle = `rgba(120, 180, 220, ${opacity})`;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 2 + Math.sin(Date.now() / 1000 + i) * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Add bubble highlights
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(bubbleX - 0.5, bubbleY - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Enhanced water currents with visible wave patterns
    ctx.fillStyle = 'rgba(50, 100, 150, 0.3)'; // More visible
    for (let x = 0; x < canvas.width; x += 30) {
        const currentHeight = Math.sin((x + score * 0.5) * 0.015) * 3;
        ctx.fillRect(x, ground.y + ground.height + currentHeight + 12, 30, 3);
    }
    
    // Add secondary wave layer
    ctx.fillStyle = 'rgba(80, 140, 200, 0.2)';
    for (let x = 0; x < canvas.width; x += 25) {
        const waveHeight = Math.sin((x + score * 0.3) * 0.02 + Math.PI / 4) * 2;
        ctx.fillRect(x, ground.y + ground.height + waveHeight + 25, 25, 2);
    }

    // Fish removed - they looked like leaves on ground

    // Draw dino with special effects
    const currentDinoSprite = isJumping ? dinoJump : (dinoFrame === 1 ? dinoRun1 : dinoRun2);
    
    if (isDashing) {
        // Dash effects - speed lines and rocket trail
        ctx.save();
        
        // Speed lines behind dino
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const lineX = dino.x - (i * 15) - 10;
            const lineY = dino.y + dino.height/2 + (Math.random() - 0.5) * dino.height;
            ctx.beginPath();
            ctx.moveTo(lineX, lineY);
            ctx.lineTo(lineX - 20, lineY);
            ctx.stroke();
        }
        
        // Rocket trail effect
        ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
        for (let i = 0; i < 8; i++) {
            const trailX = dino.x - i * 3;
            const trailY = dino.y + dino.height + (Math.random() - 0.5) * 8;
            ctx.beginPath();
            ctx.arc(trailX, trailY, 3 - i * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Dino with dash glow
        ctx.save();
        ctx.filter = 'brightness(1.5) saturate(1.5)';
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 10;
        ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);
        ctx.restore();
        
    } else if (invincible) {
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
        // Normal dino
        ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);
    }

    // Draw obstacles with correct cactus sprites
    for (const obstacle of obstacles) {
        const cactusSprite = cactusSprites[obstacle.type] || cactusSprites.normal;
        ctx.drawImage(cactusSprite, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }

    // Draw birds and pterodactyls
    for (const bird of birds) {
        if (bird.type === 'pterodactyl') {
            ctx.drawImage(pterodactylSprite, bird.x, bird.y, bird.width, bird.height);
        } else {
            ctx.drawImage(birdSprite, bird.x, bird.y, bird.width, bird.height);
        }
    }

    // Draw platforms with correct sprites
    for (const platform of platforms) {
        const sprite = platformSprites[platform.size] || platformSprites.medium;
        ctx.drawImage(sprite, platform.x, platform.y, platform.width, platform.height);
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

    // Draw Green Goblin
    if (greenGoblinActive && greenGoblin) {
        // Flip Green Goblin horizontally to face the player
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(greenGoblinSprite, -(greenGoblin.x + greenGoblin.width), greenGoblin.y, greenGoblin.width, greenGoblin.height);
        ctx.restore();
        
        // Green Goblin health/timer indicator
        const timeLeft = Math.max(0, greenGoblin.duration - (performance.now() - greenGoblinSpawnTime));
        const healthBarWidth = 60;
        const healthBarHeight = 4;
        const healthX = greenGoblin.x;
        const healthY = greenGoblin.y - 10;
        
        // Health bar background
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(healthX, healthY, healthBarWidth, healthBarHeight);
        
        // Health bar fill
        const healthPercent = timeLeft / greenGoblin.duration;
        ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : '#FFFF00';
        ctx.fillRect(healthX, healthY, healthBarWidth * healthPercent, healthBarHeight);
        
        // Green Goblin level indicator
        ctx.fillStyle = '#00FF00';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`GOBLIN LV${greenGoblin.level}`, greenGoblin.x + greenGoblin.width/2, greenGoblin.y - 15);
        ctx.textAlign = 'left';
    }

    // Draw lasers
    for (const laser of lasers) {
        ctx.save();
        ctx.translate(laser.x + laser.width/2, laser.y + laser.height/2);
        ctx.rotate(laser.rotation);
        ctx.drawImage(laserSprite, -laser.width/2, -laser.height/2, laser.width, laser.height);
        ctx.restore();
    }

    // Draw rocket power-ups
    for (const rocket of rockets) {
        if (!rocket.collected) {
            ctx.save();
            
            // Animated glow effect
            const glowIntensity = Math.sin(rocket.glowPhase) * 0.3 + 0.7;
            ctx.globalAlpha = glowIntensity;
            
            // Add slight floating animation
            const floatOffset = Math.sin(rocket.glowPhase * 2) * 2;
            
            ctx.drawImage(rocketSprite, rocket.x, rocket.y + floatOffset, rocket.width, rocket.height);
            ctx.restore();
        }
    }

    // Draw score
    ctx.fillStyle = '#FFF';  // White text for night theme
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const scoreText = `Score: ${score.toString().padStart(3, '0')}`;
    ctx.fillText(scoreText, canvas.width - 20, 15);
    
    // Rocket counter removed - user doesn't want it
    
    // Boss and Green Goblin warning/indicator
    if (greenGoblinActive && greenGoblin) {
        // Green Goblin takes priority in display
        ctx.font = '10px "Press Start 2P"';
        ctx.fillStyle = '#00FF00';
        ctx.textAlign = 'center';
        const goblinText = `👹 GREEN GOBLIN BATTLE! Level ${greenGoblin.level}`;
        ctx.fillText(goblinText, canvas.width / 2, 30);
        
        // Green Goblin timer
        const timeLeft = Math.max(0, greenGoblin.duration - (performance.now() - greenGoblinSpawnTime));
        const secondsLeft = Math.ceil(timeLeft / 1000);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#66FF66';
        ctx.fillText(`Time: ${secondsLeft}s`, canvas.width / 2, 45);
        
        // Show regular boss info below if both are active
        if (bossActive && boss) {
            ctx.fillStyle = '#FF4500';
            ctx.fillText(`+ Boss LV${boss.level}`, canvas.width / 2, 60);
        }
        ctx.textAlign = 'left';
    } else if (bossActive && boss) {
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
        // Show warnings for upcoming bosses at specific scores
        const bossScores = [50, 200, 350, 450];
        const goblinScores = [150, 450];
        
        let warningY = 30;
        
        // Find next boss score
        const nextBossScore = bossScores.find(bossScore => bossScore > score);
        if (nextBossScore && (nextBossScore - score) <= 10 && (nextBossScore - score) > 0) {
            ctx.font = '8px "Press Start 2P"';
            ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
            ctx.textAlign = 'center';
            ctx.fillText(`⚠️ Boss incoming in ${nextBossScore - score}!`, canvas.width / 2, warningY);
            warningY += 15;
        }
        
        // Find next Green Goblin score
        const nextGoblinScore = goblinScores.find(goblinScore => goblinScore > score);
        if (nextGoblinScore && (nextGoblinScore - score) <= 10 && (nextGoblinScore - score) > 0) {
            ctx.font = '8px "Press Start 2P"';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.textAlign = 'center';
            ctx.fillText(`👹 Green Goblin incoming in ${nextGoblinScore - score}!`, canvas.width / 2, warningY);
        }
        
        ctx.textAlign = 'left';
    }
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    
    // Draw ending sequence elements
    drawEndingSequence();
    
    // Draw death screen overlay if showing
    drawDeathScreen();
}

function drawDeathScreen() {
    if (!isShowingDeathScreen) return;
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get death cause message
    let deathMessage = 'GAME OVER';
    let causeMessage = '';
    
    switch(deathCause) {
        case 'cactus':
        case 'normal':
            causeMessage = 'Hit a Cactus!';
            break;
        case 'xl':
            causeMessage = 'Hit an XL Cactus!';
            break;
        case 'xxl':
            causeMessage = 'Hit an XXL Cactus!';
            break;
        case 'bird':
            causeMessage = 'Hit a Bird!';
            break;
        case 'pterodactyl':
            causeMessage = 'Hit a Pterodactyl!';
            break;
        case 'boss_fireball':
            causeMessage = 'Hit by Boss Fireball!';
            break;
        case 'green_goblin_laser':
            causeMessage = 'Hit by Green Goblin Laser!';
            break;
        case 'ending_complete':
            deathMessage = 'MISSION COMPLETE!';
            causeMessage = 'You helped the alien escape!';
            break;
        default:
            causeMessage = 'Collision Detected!';
    }
    
    // Set text properties for retro game font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main "GAME OVER" text with retro styling
    ctx.save();
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 36px "Press Start 2P", monospace';
    // Add text shadow for depth
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(deathMessage, canvas.width / 2, canvas.height / 2 - 40);
    ctx.restore();
    
    // Death cause text with gold color
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(causeMessage, canvas.width / 2, canvas.height / 2);
    ctx.restore();
    
    // Score text with white color
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
    
    // Calculate remaining time
    const elapsed = performance.now() - deathScreenStartTime;
    const remaining = Math.max(0, Math.ceil((DEATH_SCREEN_DURATION - elapsed) / 1000));
    
    if (remaining > 0) {
        ctx.save();
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`Continuing to high scores in ${remaining}s...`, canvas.width / 2, canvas.height / 2 + 80);
        ctx.restore();
    }
    
    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

function drawEndingSequence() {
    if (!endingSequenceStarted) return;
    
    // Draw Oogway if he's spawned
    if (oogway && (endingPhase === 'oogway_appears' || endingPhase === 'speech1' || endingPhase === 'speech2' || endingPhase === 'speech3' || endingPhase === 'speech4' || endingPhase === 'moving')) {
        // Move Oogway to target position during appearance
        if (endingPhase === 'oogway_appears') {
            oogway.x = Math.max(oogway.targetX, oogway.x - 3);
        }
        
        // Draw Oogway with a slight glow effect
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.drawImage(oogwaySprite, oogway.x, oogway.y, oogway.width, oogway.height);
        ctx.restore();
    }
    
    // Draw speech bubbles
    if (endingPhase === 'speech1' || endingPhase === 'speech2' || endingPhase === 'speech3' || endingPhase === 'speech4') {
        drawSpeechBubble();
    }
    
    // Draw fade out effect
    if (endingPhase === 'fade_out') {
        const currentTime = performance.now();
        const elapsedTime = currentTime - endingStartTime;
        const fadeProgress = Math.min(elapsedTime / FADE_DURATION, 1);
        
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    
    // Draw final message
    if (endingPhase === 'final_message') {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Final message text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px "Press Start 2P", monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText('CONGRATULATIONS!', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.fillText('You helped the alien escape.', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Thank you for this adventure!', canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.fillStyle = '#90EE90';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillText('The alien is very grateful.', canvas.width / 2, canvas.height / 2 + 60);
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}

function drawSpeechBubble() {
    if (!oogway) return;
    
    // Position bubble in center of screen for better visibility - BIGGER SIZE
    const bubbleWidth = 450;
    const bubbleHeight = 120;
    const bubbleX = (canvas.width - bubbleWidth) / 2;
    const bubbleY = 80; // Fixed position from top
    
    // Draw bubble background
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    // Main bubble
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 15);
    ctx.fill();
    ctx.stroke();
    
    // Speech bubble tail pointing to Oogway
    const tailX = Math.min(Math.max(oogway.x + 40, bubbleX + 40), bubbleX + bubbleWidth - 40);
    ctx.beginPath();
    ctx.moveTo(tailX - 10, bubbleY + bubbleHeight);
    ctx.lineTo(tailX, bubbleY + bubbleHeight + 20);
    ctx.lineTo(tailX + 10, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Speech text - smaller font and better spacing
    ctx.fillStyle = '#000000';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = bubbleX + bubbleWidth / 2;
    const centerY = bubbleY + bubbleHeight / 2;
    
    if (endingPhase === 'speech1') {
        ctx.fillText("You have done well, my son...", centerX, centerY - 25);
        ctx.fillText("You faced the Suars... and the Green", centerX, centerY - 5);
        ctx.fillText("Goblins... with great courage.", centerX, centerY + 15);
    } else if (endingPhase === 'speech2') {
        ctx.fillText("But I sense a storm beyond the stars...", centerX, centerY - 15);
        ctx.fillText("Far greater enemies await us.", centerX, centerY + 5);
    } else if (endingPhase === 'speech3') {
        ctx.fillText("Yes... even Thanos is coming.", centerX, centerY);
    } else if (endingPhase === 'speech4') {
        ctx.fillText("For now, we must leave this planet.", centerX, centerY - 10);
        ctx.fillText("Come... our journey is not yet over.", centerX, centerY + 10);
    }
    
    ctx.restore();
}

let gameLoopId = null;

function gameLoop(currentTime) {
    // CRITICAL FIX: Don't run game loop when high score screen is active
    if (gameStarted && !highScoreScreenActive) {
        // Update game only if not showing death screen
        if (!isShowingDeathScreen) {
            update(currentTime);
        }
        // Always draw (to show death screen)
        draw();
    }
    gameLoopId = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
}

function startGameLoop() {
    if (!gameLoopId) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
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
    
    // Don't handle game controls if user is typing in input fields
    if (isInputFocused) {
        return;
    }
    
    // Handle secret code for any letter/number key during gameplay
    if (gameStarted && !isGameOver && event.key.match(/^[a-zA-Z0-9]$/)) {
        handleSecretCode(event.key);
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
    } else if (event.code === 'KeyD') {
        event.preventDefault(); // Prevent any default behavior
        activateDash();
    } else if (event.code === 'KeyS') {
        // Shield/invincibility activation
        if (getAvailableInvincibilityCharges() > 0) {
            activateInvincibility();
        }
    }
}

// Handle touch events
function handleTouch(event) {
    // CRITICAL FIX: Block ALL touches when high score screen is active
    if (highScoreScreenActive) {
        console.log('🛡️ Touch blocked - high score screen is active!');
        const target = event.target;
        const targetId = target ? target.id : '';
        
        // Only allow touches on high score screen buttons
        if (targetId === 'submitHighScore' || targetId === 'skipHighScore' || 
            targetId === 'playAgainBtn' || targetId === 'mainMenuBtn' || 
            targetId === 'shareScoreBtn' || targetId === 'closeLeaderboard' ||
            target?.closest('#highScoreScreen')) {
            console.log('✅ Allowing touch on high score screen button:', targetId);
            return; // Allow the button to handle it
        }
        
        event.preventDefault();
        event.stopPropagation();
        return; // Block everything else
    }
    
    // Check if touch is on UI buttons or interactive elements FIRST
    const target = event.target;
    const targetId = target ? target.id : '';
    const targetClass = target ? target.className : '';
    
    // Touch event detected
    
    // If touch is on any button, modal, or interactive element, don't handle it here
    // BUT allow game area touches (gameContainer, gameCanvas) even if they're inside other elements
    if (target && 
        targetId !== 'gameContainer' && 
        targetId !== 'gameCanvas' && 
        (
            target.tagName === 'BUTTON' ||
            target.tagName === 'INPUT' ||
            target.tagName === 'A' ||
            targetId === 'invincibilityButton' ||
            targetId === 'devTestButton' ||
            targetId === 'playGameBtn' ||
            targetId === 'viewHighscoresBtn' ||
            targetId === 'musicToggleBtn' ||
            targetClass.includes('btn') ||
            targetClass.includes('button') ||
            target.closest('.modal') ||
            target.closest('#leaderboardModal') ||
            target.closest('#highScoreScreen')
        )) {
        return; // Let the specific button handlers deal with it
    }
    
    event.preventDefault();  // Prevent default touch behavior
    
    // Checking blocking conditions
    
    // CRITICAL: Check if highscore screen is visible (prevent touch-anywhere-restart)
    const highScoreScreen = document.getElementById('highScoreScreen');
    if (highScoreScreen && (highScoreScreen.style.display !== 'none' && !highScoreScreen.classList.contains('hidden'))) {
        console.log('🚫 Blocked by highscore screen check');
        return; // Don't handle touch if highscore screen is visible - only buttons should work
    }
    
    // Check if any modal/form is currently visible (prevent touch-to-restart)
    const highScoreForm = document.getElementById('highScoreForm');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const nameInputModal = document.getElementById('nameInputModal');
    const startScreen = document.getElementById('startScreen');
    

    
    if (highScoreForm && !highScoreForm.classList.contains('hidden') && highScoreForm.style.display !== 'none') {
        console.log('🚫 Blocked by highscore form check - form is actually visible');
        return; // Don't handle touch if highscore form is visible
    }
    
    if (leaderboardModal && leaderboardModal.style.display === 'block') {
        console.log('🚫 Blocked by leaderboard modal check');
        return; // Don't handle touch if leaderboard modal is visible
    }
    
    if (nameInputModal && nameInputModal.style.display === 'block') {
        console.log('🚫 Blocked by name input modal check');
        return; // Don't handle touch if name input modal is visible
    }
    
    if (startScreen && startScreen.style.display === 'block' && !gameStarted) {
        console.log('🚫 Blocked by start screen check (game not started)');
        return; // Don't handle touch if start screen is visible and game hasn't started
    }
    
    // If game hasn't started, start it from menu
    if (!gameStarted) {
        startGameFromMenu();
        return;
    }
    
    if (isGameOver) {
        return;  // Don't handle jumps if game is over
    }

    // Handle jumping in game
    const now = Date.now();
    
    if (!lastTapTime) {
        lastTapTime = now;
        jump();
    } else {
        const tapLength = now - lastTapTime;
        if (tapLength < 300) {  // 300ms window for multi-tap
            jump(); // Just use the main jump function, it handles all jump logic
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

// CRITICAL FIX: Expose function to clear high score screen protection
window.clearHighScoreProtection = function() {
    highScoreScreenActive = false;
    console.log('🛡️ High score screen protection cleared by external call');
};

// Secret dev testing: Type "cat9999" during gameplay to toggle 5-hour invincibility
window.activateTestMode = function() {
    toggleDevTestInvincibility();
    console.log('🐱 Test mode toggled via console!');
};

// Initialize game elements but don't start the game yet
initStars();
initClouds();
initFish();
startGameLoop(); // Start the game loop (optimized to only run when needed)

// Initialize music system
initMusic();

// Initialize and show start screen
document.addEventListener('DOMContentLoaded', () => {
    // Load preferences from localStorage
    const savedMusicEnabled = localStorage.getItem('musicEnabled');
    if (savedMusicEnabled !== null) {
        musicEnabled = savedMusicEnabled === 'true';
    }
    
    const savedJumpCounterEnabled = localStorage.getItem('jumpCounterEnabled');
    if (savedJumpCounterEnabled !== null) {
        jumpCounterEnabled = savedJumpCounterEnabled === 'true';
    }
    
    initStartScreen();
    showStartScreen();
    
    // Initialize music button states
    updateMusicButtons();
    
    // Initialize jump counter button states 
    updateJumpCounterButtons();
    
    // Add event listener for main menu music toggle button only
    const menuMusicBtn = document.getElementById('musicToggleBtn');
    
    // Main menu music button
    if (menuMusicBtn) {
        console.log('🔧 Setting up music button events');
        
        menuMusicBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎵 Music button clicked');
            toggleMusic();
        });
        
        // Isolated touch handling - prevent any interference with global touch system
        menuMusicBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Stop ALL propagation
            console.log('🎵 Music button touched');
            toggleMusic();
        });
        
        // Prevent any touch events from bubbling up from music button
        menuMusicBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        menuMusicBtn.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
    }
    
    // Add event listener for jump counter toggle button
    const menuCounterBtn = document.getElementById('jumpCounterToggleBtn');
    
    if (menuCounterBtn) {
        console.log('🔧 Setting up jump counter button events');
        
        menuCounterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔢 Jump counter button clicked');
            toggleJumpCounter();
        });
        
        // Isolated touch handling - prevent any interference with global touch system
        menuCounterBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Stop ALL propagation
            console.log('🔢 Jump counter button touched');
            toggleJumpCounter();
        });
        
        // Prevent any touch events from bubbling up from counter button
        menuCounterBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        menuCounterBtn.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
    }
    
    // Initialize invincibility button
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
    
    // Initialize dash button
    const dashBtn = document.getElementById('dashButton');
    
    function updateDashBtn() {
        const charges = getDashCharges();
        dashBtn.setAttribute('data-charges', charges > 0 ? `x${charges}` : '');
        dashBtn.disabled = (!canDash() || isGameOver);
        dashBtn.style.opacity = isDashing ? 0.6 : 0.95;
    }
    
    // Prevent button from triggering jump
    dashBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    dashBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dashBtn.disabled) {
            activateDash();
            updateDashBtn();
        }
    });
    
    dashBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dashBtn.disabled) {
            activateDash();
            updateDashBtn();
        }
    });
    
    setInterval(updateDashBtn, 100); // Keep UI in sync
    updateDashBtn();
});

// Additional keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyS' && !isGameOver && !invincible && getAvailableInvincibilityCharges() > 0) {
        e.preventDefault();
        activateInvincibility();
    }
    
    if (e.code === 'KeyD' && !isGameOver && canDash()) {
        e.preventDefault();
        activateDash();
    }
});


