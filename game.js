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
let gameSpeedMultiplier = 1;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size - Mobile-first responsive dimensions
canvas.width = 414;   // Mobile-optimized width
canvas.height = 300;  // Good aspect ratio for platformer gameplay

// Game objects
const dino = {
    x: 60,                    // Adjusted for new canvas width 
    y: canvas.height - 80,    // Adjusted for new ground position
    width: 40,
    height: 60
};

const obstacles = [];
const ground = {
    y: canvas.height - 40,    // Keep same relative position
    height: 40
};

// Create background music
const music = new Audio();
music.src = 'https://raw.githubusercontent.com/mohsin-code/dinosaur-game/main/assets/audio/background.mp3';  // Using a direct MP3 file
music.loop = true;
music.volume = 0.4;
music.id = 'gameMusic';

// Initialize music with better error handling
function initMusic() {
    try {
        // Make sure the audio element is in the DOM
        if (!document.getElementById('gameMusic')) {
            document.body.appendChild(music);
        }
        
        // Try to play
        const playAttempt = () => {
            music.play()
                .then(() => {
                    console.log("Music started successfully");
                    document.removeEventListener('click', playAttempt);
                    document.removeEventListener('touchstart', playAttempt);
                    document.removeEventListener('keydown', playAttempt);
                })
                .catch(error => {
                    console.warn("Music play failed, will retry on interaction:", error);
                });
        };

        // Try immediate play
        playAttempt();
        
        // Also set up listeners for user interaction
        document.addEventListener('click', playAttempt);
        document.addEventListener('touchstart', playAttempt);
        document.addEventListener('keydown', playAttempt);
        
    } catch (error) {
        console.error("Music initialization error:", error);
    }
}

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

// Load sprites
let dinoRun1 = createDinoSprite('run1');
let dinoRun2 = createDinoSprite('run2');
let dinoJump = createDinoSprite('jump');
let cactus = createCactusSprite();
let groundTexture = createGroundSprite();
let cloudSprite = createCloudSprite();
let fishSprite = createFishSprite();
let birdSprite = createBirdSprite();

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

function gameOver() {
    isGameOver = true;
    music.pause();
    
    try {
        // Play game over sound
        const gameOverSound = new Audio('https://raw.githubusercontent.com/mohsin-code/dinosaur-game/main/assets/audio/game-over.mp3');
        gameOverSound.volume = 0.3;
        gameOverSound.play().catch(e => console.warn('Game over sound failed:', e));
    } catch (error) {
        console.error("Game over sound error:", error);
    }
    
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
    }, 800); // Give time for the game over sound to play
}

function startGame() {
    // Reset game state
    score = 0;
    obstacles.length = 0;
    birds.length = 0;
    isGameOver = false;
    dino.y = ground.y - dino.height;
    isJumping = false;
    canDoubleJump = false;
    velocityY = 0;
    lastObstacleSpawn = Date.now();
    gameSpeedMultiplier = 1;
    
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
    
    // Restart music
    try {
        music.currentTime = 0;
        music.play().catch(error => {
            console.warn("Music restart failed:", error);
            initMusic();
        });
    } catch (error) {
        console.error("Music restart error:", error);
    }
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

    // Spawn new obstacles
    spawnObstacle();

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

    // Draw score
    ctx.fillStyle = '#FFF';  // White text for night theme
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const scoreText = `Score: ${score.toString().padStart(3, '0')}`;
    ctx.fillText(scoreText, canvas.width - 20, 15);
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
    if (event.code === 'Space') {
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

// Call initMusic at the end of the file
initMusic();
