// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const GAME_SPEED = 4;
const MIN_OBSTACLE_SPACING = 1500;
const MAX_OBSTACLE_SPACING = 2500;
let OBSTACLE_SPAWN_INTERVAL = 2000;

// Animation constants
const ANIMATION_SPEED = 100; // ms per frame
let lastFrameTime = 0;

// Cloud settings
const NUM_CLOUDS = 6;
const CLOUD_SPEED = 0.5;
const NUM_HILLS = 3;
const WATER_WAVE_SPEED = 0.02;

// Lily pad settings
const NUM_LILY_PADS = 4;
let lilyPads = [];

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

// Sprite generation code
function createDinoSprite(frame) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 44;
    canvas.height = 48;

    ctx.fillStyle = '#535353';

    function drawDinoBody() {
        // Main body
        ctx.fillRect(8, 14, 20, 16);
        // Neck and head
        ctx.fillRect(22, 10, 12, 12);
        ctx.fillRect(26, 8, 10, 14);
        // Head details
        ctx.fillRect(32, 6, 8, 12);
        // Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(36, 8, 2, 2);
        ctx.fillStyle = '#535353';
        // Tail
        ctx.fillRect(4, 16, 6, 4);  // Tail base
        ctx.fillRect(2, 14, 4, 6);  // Tail tip
    }

    function drawDinoRun1() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDinoBody();
        // Back leg
        ctx.fillRect(12, 30, 4, 16);
        // Front leg
        ctx.fillRect(22, 30, 4, 12);
    }

    function drawDinoRun2() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDinoBody();
        // Back leg
        ctx.fillRect(12, 30, 4, 12);
        // Front leg
        ctx.fillRect(22, 30, 4, 16);
    }

    function drawDinoJump() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDinoBody();
        // Both legs tucked
        ctx.fillRect(12, 30, 4, 10);
        ctx.fillRect(22, 30, 4, 10);
    }

    switch(frame) {
        case 'run1': drawDinoRun1(); break;
        case 'run2': drawDinoRun2(); break;
        case 'jump': drawDinoJump(); break;
        default: drawDinoBody();
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

function createLilyPadSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 32;
    canvas.height = 16;

    const colors = {
        pad: '#2E7D32',
        highlight: '#43A047',
        flower: '#E91E63'
    };

    // Draw main pad
    ctx.fillStyle = colors.pad;
    ctx.beginPath();
    ctx.ellipse(16, 8, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add highlight
    ctx.fillStyle = colors.highlight;
    ctx.beginPath();
    ctx.ellipse(16, 7, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add small flower
    ctx.fillStyle = colors.flower;
    ctx.beginPath();
    ctx.arc(22, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
}

// Load sprites
let dinoRun1 = createDinoSprite('run1');
let dinoRun2 = createDinoSprite('run2');
let dinoJump = createDinoSprite('jump');
let cactus = createCactusSprite();
let groundTexture = createGroundSprite();
let cloudSprite = createCloudSprite();
let lilyPadSprite = createLilyPadSprite();

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

// Initialize lily pads
function initLilyPads() {
    for (let i = 0; i < NUM_LILY_PADS; i++) {
        lilyPads.push({
            x: Math.random() * canvas.width,
            y: canvas.height - Math.random() * 60 - 20,
            speed: GAME_SPEED * 0.8
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
            velocityY = JUMP_FORCE * 0.8;
            canDoubleJump = false;
        }
    }
}

function spawnObstacle() {
    const now = Date.now();
    if (now - lastObstacleSpawn > OBSTACLE_SPAWN_INTERVAL) {
        // Random size between 0.7 and 1.3
        const size = 0.7 + Math.random() * 0.6;
        
        // Random height variation
        const heightVariation = Math.random() * 10 - 5; // ±5 pixels

        // Random horizontal position offset
        const xOffset = Math.random() * 100; // Random offset up to 100 pixels

        obstacles.push({
            x: canvas.width + xOffset,
            y: ground.y - (40 * size) + heightVariation,
            width: 20 * size,
            height: 40 * size,
            size: size,
            speed: GAME_SPEED * (0.8 + Math.random() * 0.4) // Variable speed
        });
        
        lastObstacleSpawn = now;
        
        // More random interval between obstacles
        OBSTACLE_SPAWN_INTERVAL = MIN_OBSTACLE_SPACING + Math.random() * (MAX_OBSTACLE_SPACING - MIN_OBSTACLE_SPACING);
        
        // Spawn multiple obstacles with different patterns
        if (score > 10) {  // After score 10
            const pattern = Math.floor(Math.random() * 3);  // 0, 1, or 2
            
            if (pattern === 1) {  // Two obstacles side by side
                const secondSize = 0.7 + Math.random() * 0.6;
                const offset = 40 + Math.random() * 40;
                
                obstacles.push({
                    x: canvas.width + xOffset + offset,
                    y: ground.y - (40 * secondSize),
                    width: 20 * secondSize,
                    height: 40 * secondSize,
                    size: secondSize,
                    speed: GAME_SPEED * (0.8 + Math.random() * 0.4)
                });
            } else if (pattern === 2) {  // Three obstacles in a row
                for (let i = 1; i <= 2; i++) {
                    const extraSize = 0.7 + Math.random() * 0.6;
                    const spacing = 60 + Math.random() * 40;
                    
                    obstacles.push({
                        x: canvas.width + xOffset + (spacing * i),
                        y: ground.y - (40 * extraSize),
                        width: 20 * extraSize,
                        height: 40 * extraSize,
                        size: extraSize,
                        speed: GAME_SPEED * (0.8 + Math.random() * 0.4)
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

function updateLilyPads() {
    lilyPads.forEach(lily => {
        lily.x -= lily.speed;
        if (lily.x + 32 < 0) {
            lily.x = canvas.width;
            lily.y = canvas.height - Math.random() * 60 - 20;
        }
    });
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
    
    // Show game over UI with animation
    const gameOverText = document.getElementById('gameOver');
    const restartButton = document.getElementById('restartButton');
    gameOverText.classList.add('visible');
    setTimeout(() => restartButton.classList.add('visible'), 500);
}

function startGame() {
    // Reset game state
    score = 0;
    obstacles.length = 0;
    isGameOver = false;
    dino.y = ground.y - dino.height;
    isJumping = false;
    canDoubleJump = false;
    velocityY = 0;
    lastObstacleSpawn = Date.now();
    
    // Initialize game elements if needed
    if (stars.length === 0) initStars();
    if (clouds.length === 0) initClouds();
    if (lilyPads.length === 0) initLilyPads();
    if (hills.length === 0) initHills();
    
    // Hide game over UI
    const gameOverText = document.getElementById('gameOver');
    const restartButton = document.getElementById('restartButton');
    gameOverText.classList.remove('visible');
    restartButton.classList.remove('visible');
    
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

    // Update lily pads
    updateLilyPads();

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

    // Add darker water effect below ground
    const waterGradient = ctx.createLinearGradient(0, ground.y + ground.height, 0, canvas.height);
    waterGradient.addColorStop(0, '#1a2639');   // Darker blue that matches night theme
    waterGradient.addColorStop(1, '#0f1624');   // Even darker at bottom
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, ground.y + ground.height, canvas.width, canvas.height - (ground.y + ground.height));

    // Draw dino
    const currentDinoSprite = isJumping ? dinoJump : (dinoFrame === 1 ? dinoRun1 : dinoRun2);
    ctx.drawImage(currentDinoSprite, dino.x, dino.y, dino.width, dino.height);

    // Draw obstacles
    for (const obstacle of obstacles) {
        ctx.drawImage(cactus, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
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
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (isGameOver) {
            startGame();
        } else {
            jump();
        }
    }
});

// Add touch controls
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;
    
    if (isGameOver) {
        startGame();
    } else if (timeSinceLastTap < 300) { // Double tap threshold
        jump(); // This will trigger double jump if conditions are met
    } else {
        jump();
    }
    
    lastTapTime = now;
});

// Make startGame available globally for the restart button
window.startGame = startGame;

// Start game
initStars();
initClouds();
startGame();
gameLoop();

// Call initMusic at the end of the file
initMusic();
