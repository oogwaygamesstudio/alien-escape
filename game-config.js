// Game Configuration and Asset Management

const GAME_CONFIG = {
    // Canvas settings
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 300,
    
    // Game settings
    GRAVITY: 0.4,
    JUMP_FORCE: -10,
    DOUBLE_JUMP_FORCE: -8,
    TRIPLE_JUMP_FORCE: -6,
    GAME_SPEED: 2,
    
    // Sprite dimensions
    DINO_WIDTH: 40,
    DINO_HEIGHT: 40,
    OBSTACLE_WIDTH: 20,
    OBSTACLE_HEIGHT: 30,
    
    // Animation settings
    ANIMATION_FRAME_RATE: 100, // milliseconds per frame
    CLOUD_SPEED: 0.5,
    GROUND_SPEED: 2,
    
    // Asset paths
    ASSETS: {
        DINO: {
            RUN: [
                'assets/sprites/dino/dino-run-1.png',
                'assets/sprites/dino/dino-run-2.png'
            ],
            JUMP: 'assets/sprites/dino/dino-jump.png',
            DEAD: 'assets/sprites/dino/dino-dead.png'
        },
        OBSTACLES: {
            CACTUS_SMALL: 'assets/sprites/obstacles/cactus-small.png',
            CACTUS_LARGE: 'assets/sprites/obstacles/cactus-large.png',
            PTERODACTYL: 'assets/sprites/obstacles/pterodactyl.png'
        },
        GROUND: {
            TILE: 'assets/sprites/ground/ground-tile.png'
        },
        CLOUDS: [
            'assets/sprites/clouds/cloud-1.png',
            'assets/sprites/clouds/cloud-2.png',
            'assets/sprites/clouds/cloud-3.png'
        ]
    }
};

// Sprite animation manager
class SpriteAnimation {
    constructor(frames, frameRate) {
        this.frames = frames;
        this.frameRate = frameRate;
        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.isPlaying = true;
    }

    update(currentTime) {
        if (!this.isPlaying) return;
        
        if (currentTime - this.lastFrameTime > this.frameRate) {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            this.lastFrameTime = currentTime;
        }
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame];
    }

    play() {
        this.isPlaying = true;
    }

    pause() {
        this.isPlaying = false;
    }
}

// Asset loader
class AssetLoader {
    constructor() {
        this.assets = {};
    }

    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async loadAll() {
        // Load dino sprites
        this.assets.dino = {
            run: await Promise.all(GAME_CONFIG.ASSETS.DINO.RUN.map(src => this.loadImage(src))),
            jump: await this.loadImage(GAME_CONFIG.ASSETS.DINO.JUMP),
            dead: await this.loadImage(GAME_CONFIG.ASSETS.DINO.DEAD)
        };

        // Load obstacle sprites
        this.assets.obstacles = {
            cactusSmall: await this.loadImage(GAME_CONFIG.ASSETS.OBSTACLES.CACTUS_SMALL),
            cactusLarge: await this.loadImage(GAME_CONFIG.ASSETS.OBSTACLES.CACTUS_LARGE),
            pterodactyl: await this.loadImage(GAME_CONFIG.ASSETS.OBSTACLES.PTERODACTYL)
        };

        // Load ground sprite
        this.assets.ground = {
            tile: await this.loadImage(GAME_CONFIG.ASSETS.GROUND.TILE)
        };

        // Load cloud sprites
        this.assets.clouds = await Promise.all(
            GAME_CONFIG.ASSETS.CLOUDS.map(src => this.loadImage(src))
        );

        return this.assets;
    }
} 