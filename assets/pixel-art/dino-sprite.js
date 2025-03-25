// Pixel art generation for Kyle the Dino
function createDinoSprite(frame) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size for our pixel art
    canvas.width = 32;
    canvas.height = 32;

    // Colors for our dinosaur
    const colors = {
        body: '#4CAF50',    // Main body color
        eye: '#FFFFFF',     // Eye white
        pupil: '#000000',   // Pupil
        leg: '#388E3C',     // Leg color
        belly: '#81C784'    // Belly color
    };

    // Draw the dinosaur body
    function drawDinoBody() {
        // Main body
        ctx.fillStyle = colors.body;
        ctx.fillRect(8, 8, 16, 16);
        
        // Belly
        ctx.fillStyle = colors.belly;
        ctx.fillRect(12, 12, 12, 12);
        
        // Neck
        ctx.fillStyle = colors.body;
        ctx.fillRect(20, 4, 8, 8);
        
        // Head
        ctx.fillStyle = colors.body;
        ctx.fillRect(24, 4, 8, 8);
        
        // Eye
        ctx.fillStyle = colors.eye;
        ctx.fillRect(28, 6, 4, 4);
        
        // Pupil
        ctx.fillStyle = colors.pupil;
        ctx.fillRect(30, 7, 2, 2);
        
        // Legs
        ctx.fillStyle = colors.leg;
        ctx.fillRect(12, 24, 4, 8);
        ctx.fillRect(20, 24, 4, 8);
    }

    // Draw the running animation frame 1
    function drawDinoRun1() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDinoBody();
        
        // Animate legs
        ctx.fillStyle = colors.leg;
        ctx.fillRect(12, 24, 4, 4);
        ctx.fillRect(20, 24, 4, 8);
    }

    // Draw the running animation frame 2
    function drawDinoRun2() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDinoBody();
        
        // Animate legs
        ctx.fillStyle = colors.leg;
        ctx.fillRect(12, 24, 4, 8);
        ctx.fillRect(20, 24, 4, 4);
    }

    // Draw the jumping frame
    function drawDinoJump() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDinoBody();
        
        // Animate legs for jump
        ctx.fillStyle = colors.leg;
        ctx.fillRect(12, 24, 4, 4);
        ctx.fillRect(20, 24, 4, 4);
    }

    // Draw the appropriate frame
    switch(frame) {
        case 'run1':
            drawDinoRun1();
            break;
        case 'run2':
            drawDinoRun2();
            break;
        case 'jump':
            drawDinoJump();
            break;
        default:
            drawDinoBody();
    }

    return canvas;
}

// Export the functions
export async function getDinoSprite(frame) {
    const canvas = createDinoSprite(frame);
    const image = new Image();
    return new Promise((resolve) => {
        image.onload = () => resolve(image);
        image.src = canvas.toDataURL('image/png');
    });
} 