// ========== GAME SETUP ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.querySelector('.game-over');

// Game Constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const DINO_WIDTH = 40;
const DINO_HEIGHT = 60;
const CACTUS_WIDTH = 20;
const CACTUS_HEIGHT = 40;
const GROUND_Y = 210;
const CLOUD_SPEED = 1;

// Game Variables
let dino = {
    x: 50,
    y: GROUND_Y - DINO_HEIGHT,
    width: DINO_WIDTH,
    height: DINO_HEIGHT,
    velocityY: 0,
    isJumping: false
};

let cacti = [];
let clouds = [
    { x: 100, y: 50, width: 40, height: 20 },
    { x: 300, y: 80, width: 60, height: 25 },
    { x: 600, y: 60, width: 50, height: 20 }
];
let score = 0;
let gameSpeed = 5;
let isGameOver = false;
let animationId;
let lastCactusTime = 0;

// ========== EVENT LISTENERS ==========
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (!isGameOver && !dino.isJumping) {
            dino.velocityY = JUMP_FORCE;
            dino.isJumping = true;
        } else if (isGameOver) {
            resetGame();
        }
    }
});

// ========== MAIN GAME LOOP ==========
function gameLoop(timestamp) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background elements
    drawClouds();
    drawGround();

    // Update and draw game objects
    updateDino();
    drawDino();
    updateCacti();
    drawCacti();
    updateScore(timestamp);
    checkCollisions();

    if (!isGameOver) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ========== GAME FUNCTIONS ==========
function drawClouds() {
    ctx.fillStyle = '#EEE';
    clouds.forEach(cloud => {
        ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
        cloud.x -= CLOUD_SPEED;
        if (cloud.x + cloud.width < 0) {
            cloud.x = canvas.width;
        }
    });
}

function drawGround() {
    ctx.fillStyle = '#555';
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);
}

function updateDino() {
    if (dino.isJumping) {
        dino.y += dino.velocityY;
        dino.velocityY += GRAVITY;

        // Land on ground
        if (dino.y >= GROUND_Y - dino.height) {
            dino.y = GROUND_Y - dino.height;
            dino.isJumping = false;
            dino.velocityY = 0;
        }
    }
}

function drawDino() {
    // Pixel-art dino (5x7)
    const sprite = [
        '  ███  ',
        ' █████ ',
        ' ██ ██ ',
        ' █████ ',
        '  ██   '
    ];
    
    ctx.fillStyle = '#555';
    sprite.forEach((row, y) => {
        row.split('').forEach((pixel, x) => {
            if (pixel === '█') {
                ctx.fillRect(
                    dino.x + x * 6, 
                    dino.y + y * 6, 
                    5, 5
                );
            }
        });
    });
}

function updateCacti() {
    // Spawn new cacti
    if (timestamp - lastCactusTime > 2000 && Math.random() < 0.02) {
        cacti.push({
            x: canvas.width,
            y: GROUND_Y - CACTUS_HEIGHT,
            width: CACTUS_WIDTH,
            height: CACTUS_HEIGHT
        });
        lastCactusTime = timestamp;
    }

    // Update existing cacti
    for (let i = cacti.length - 1; i >= 0; i--) {
        cacti[i].x -= gameSpeed;
        
        // Remove off-screen cacti
        if (cacti[i].x + cacti[i].width < 0) {
            cacti.splice(i, 1);
        }
    }
}

function drawCacti() {
    ctx.fillStyle = '#555';
    cacti.forEach(cactus => {
        // Cactus body
        ctx.fillRect(cactus.x, cactus.y, cactus.width, cactus.height);
        
        // Cactus spikes
        ctx.fillRect(cactus.x - 3, cactus.y + 10, 6, 5);
        ctx.fillRect(cactus.x + cactus.width - 3, cactus.y + 15, 6, 5);
    });
}

function updateScore(timestamp) {
    score = Math.floor(timestamp / 100);
    scoreElement.textContent = score;
    gameSpeed = 5 + Math.floor(score / 100);
}

function checkCollisions() {
    for (const cactus of cacti) {
        if (
            dino.x < cactus.x + cactus.width &&
            dino.x + dino.width > cactus.x &&
            dino.y < cactus.y + cactus.height &&
            dino.y + dino.height > cactus.y
        ) {
            endGame();
            return;
        }
    }
}

function endGame() {
    isGameOver = true;
    gameOverElement.style.display = 'block';
    cancelAnimationFrame(animationId);
}

function resetGame() {
    dino.y = GROUND_Y - DINO_HEIGHT;
    dino.isJumping = false;
    dino.velocityY = 0;
    cacti = [];
    score = 0;
    gameSpeed = 5;
    isGameOver = false;
    gameOverElement.style.display = 'none';
    scoreElement.textContent = '0';
    animationId = requestAnimationFrame(gameLoop);
}

// ========== START GAME ==========
resetGame();