// Pixel art generation for cactus obstacle
function createCactusSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size for our pixel art
    canvas.width = 24;
    canvas.height = 32;

    // Colors for the cactus
    const colors = {
        body: '#2E7D32',      // Main cactus color
        shadow: '#1B5E20',    // Shadow color
        highlight: '#43A047'   // Highlight color
    };

    // Draw the cactus
    function drawCactus() {
        // Main body
        ctx.fillStyle = colors.body;
        ctx.fillRect(8, 4, 8, 28);

        // Left arm
        ctx.fillRect(4, 12, 4, 8);
        ctx.fillRect(0, 12, 4, 4);

        // Right arm
        ctx.fillRect(16, 16, 4, 8);
        ctx.fillRect(20, 16, 4, 4);

        // Shadows
        ctx.fillStyle = colors.shadow;
        ctx.fillRect(8, 4, 2, 28);
        ctx.fillRect(4, 12, 2, 8);
        ctx.fillRect(16, 16, 2, 8);

        // Highlights
        ctx.fillStyle = colors.highlight;
        ctx.fillRect(14, 4, 2, 28);
        ctx.fillRect(6, 12, 2, 8);
        ctx.fillRect(18, 16, 2, 8);
    }

    drawCactus();
    return canvas;
}

// Export the functions
export async function getCactusSprite() {
    const canvas = createCactusSprite();
    const image = new Image();
    return new Promise((resolve) => {
        image.onload = () => resolve(image);
        image.src = canvas.toDataURL('image/png');
    });
} 