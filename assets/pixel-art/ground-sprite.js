// Pixel art generation for ground texture
function createGroundSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size for our pixel art
    canvas.width = 32;
    canvas.height = 8;

    // Colors for the ground
    const colors = {
        main: '#795548',      // Main ground color
        shadow: '#5D4037',    // Shadow color
        highlight: '#8D6E63'  // Highlight color
    };

    // Draw the ground texture
    function drawGround() {
        // Fill with main color
        ctx.fillStyle = colors.main;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add texture
        for (let x = 0; x < canvas.width; x += 4) {
            for (let y = 0; y < canvas.height; y += 4) {
                if (Math.random() < 0.3) {
                    ctx.fillStyle = Math.random() < 0.5 ? colors.shadow : colors.highlight;
                    ctx.fillRect(x, y, 2, 2);
                }
            }
        }
    }

    drawGround();
    return canvas;
}

// Export the functions
export async function getGroundSprite() {
    const canvas = createGroundSprite();
    const image = new Image();
    return new Promise((resolve) => {
        image.onload = () => resolve(image);
        image.src = canvas.toDataURL('image/png');
    });
} 