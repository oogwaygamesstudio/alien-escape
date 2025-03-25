// Game setup
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector(".score");
const gameOverElement = document.querySelector(".game-over");

// Dino sprite (base64 encoded PNG - no external file needed!)
const dinoImg = new Image();
dinoImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw1AUhU9TpaIVBzuIOGSoThZERRy1CkWoEGqFVh1MbvqhNGlIUlwcBdeCgx+LVQcXZ10dXAVB8AfE0clJ0UVK/F9SaBHjwXE/3t173L0DhGaVqWbPOKBqlpFOxMVcflUMvCKIEYQwY0hmljEnSSn4jq97BPh6F+dZ/uf+HL1qzmJAQCSeZYZpE28QT2/aBud94ggryirxOfGYSRckfuS64vEb54LLAs+MmOnUPHGEWCy0sdLGrGhqxFPEUVXTKV/Ieaxy3uKslquseU/+wnBOX1nmOq1hJLCIJUgQoaCKEsqwEaNdJ8VCis7jPv5h1y+RSyFXCYwcC6hAg+z4wf/gd7dWfnLCThJoQrgt9t4xAYR7BZtN2/bXc2g/zBwJlfdlXc5hU7DyOM3Clk3AkQC9MsRMBdKIGD3z7mP8xukX0t7kZ9H5jP0CujRW6dXAB6LgCDbA2Tf5e3d7eP3bq3d7zf+7KjDzC5qF3qAAAAAElFTkSuQmCC";

// Game variables
let dino = { x: 50, y: 150, width: 40, height: 60, isJumping: false, velocity: 0 };
let cacti = [];
let score = 0;
let gameSpeed = 5;
let gameOver = false;
let frameCount = 0;

// Keyboard controls
document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !dino.isJumping && !gameOver) {
        dino.isJumping = true;
        dino.velocity = -12;
    }
    if (e.code === "Space" && gameOver) {
        resetGame();
    }
});

// Main game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw dino
    ctx.drawImage(dinoImg, dino.x, dino.y, dino.width, dino.height);
    
    // Dino physics
    if (dino.isJumping) {
        dino.y += dino.velocity;
        dino.velocity += 0.8;
        if (dino.y >= 150) {
            dino.y = 150;
            dino.isJumping = false;
        }
    }
    
    // Spawn cacti
    if (frameCount % 100 === 0) {
        cacti.push({ x: 800, width: 20, height: 40 });
    }
    
    // Draw and move cacti
    ctx.fillStyle = "#555";
    for (let i = 0; i < cacti.length; i++) {
        const cactus = cacti[i];
        ctx.fillRect(cactus.x, 170, cactus.width, cactus.height);
        cactus.x -= gameSpeed;
        
        // Collision detection
        if (
            dino.x < cactus.x + cactus.width &&
            dino.x + dino.width > cactus.x &&
            dino.y < 170 + cactus.height &&
            dino.y + dino.height > 170
        ) {
            gameOver = true;
            gameOverElement.style.display = "block";
        }
        
        // Remove off-screen cacti
        if (cactus.x < -cactus.width) {
            cacti.splice(i, 1);
            score++;
            scoreElement.textContent = `Score: ${score}`;
        }
    }
    
    frameCount++;
    if (!gameOver) requestAnimationFrame(gameLoop);
}

function resetGame() {
    dino = { x: 50, y: 150, width: 40, height: 60, isJumping: false, velocity: 0 };
    cacti = [];
    score = 0;
    gameSpeed = 5;
    gameOver = false;
    frameCount = 0;
    scoreElement.textContent = "Score: 0";
    gameOverElement.style.display = "none";
    requestAnimationFrame(gameLoop);
}

// Start game
resetGame();