# 🎮 Alien Escape - Endless Runner Game

A beautiful endless runner game featuring a cute alien dinosaur! Jump over obstacles, collect points, and compete on the **global leaderboard**!

## 🌟 Features

### 🎯 Core Gameplay
- **Smooth running animation** with cute dinosaur sprites
- **Progressive difficulty** - speed increases as you score
- **Triple jump mechanics** for advanced players
- **Flying birds** appear after level 20 for extra challenge
- **Animated water background** with swimming fish
- **Mobile-friendly** with touch controls

### 🏆 Global Leaderboard System
- **Real-time global rankings** - compete with players worldwide!
- **Top 1000 leaderboard** with elite top 10 section
- **20-character names** with spaces allowed
- **Instant rank display** - see exactly where you placed
- **Local storage fallback** - works offline
- **Cross-platform** - play on any device

### 🎨 Visual Effects
- **Professional animations** - smooth pop-ups and transitions
- **Night theme** with twinkling stars
- **Retro pixel art** styling
- **Responsive design** for all screen sizes

## 🚀 Quick Start

### Play Locally
1. Clone or download this repository
2. Open `index.html` in your browser
3. Start playing! (Uses local leaderboard)

### Set Up Global Leaderboard
1. **Follow the complete guide**: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. **Create Firebase project** at console.firebase.google.com
3. **Replace config** in `leaderboard.js` with your Firebase settings
4. **Deploy to GitHub Pages** or any web hosting
5. **Share with friends** and compete globally!

## 🎮 How to Play

- **Space Bar** or **Tap**: Jump
- **Multi-Tap**: Triple jump (up to 3 jumps in air!)
- **Goal**: Avoid obstacles and get the highest score!

### 🏃‍♂️ Gameplay Tips
- Use triple jump to clear high obstacles, multiple cacti, and reach high platforms
- Flying birds appear after score 20 - watch the timing!
- Game speed caps at score 40 to keep it beatable
- Every obstacle is jumpable with proper timing

## 🛠️ Technology Stack

- **HTML5 Canvas** for smooth 60fps graphics
- **Vanilla JavaScript** - no frameworks needed
- **Firebase Firestore** for global leaderboard
- **Progressive Web App** features
- **Responsive CSS** for all devices

## 📱 Deployment

### GitHub Pages (Recommended)
1. Push code to your GitHub repository
2. Go to **Settings** → **Pages**
3. Select **main branch** as source
4. Your game will be live at: `https://yourusername.github.io/repo-name`

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🏆 Leaderboard Features

### 🌍 Global Competition
- **Worldwide rankings** - see how you compare globally
- **Real-time updates** - new scores appear instantly
- **Secure validation** - prevents cheating and spam
- **Top 1000 display** - scrollable rankings

### 🎯 Rank Messages
- **#1**: 🏆 #1 WORLD CHAMPION! 🏆
- **#2-3**: 🥉 YOU PLACED #2! 🥉  
- **#4-10**: 👑 YOU PLACED #7! 👑
- **#11-100**: ⭐ YOU PLACED #47! ⭐
- **100+**: 🌟 YOU PLACED #234! 🌟

## 🔧 Configuration

### Firebase Setup (for Global Leaderboard)
```javascript
// Replace in leaderboard.js:
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### Game Settings
Edit `game-config.js` to customize:
- Gravity and jump height
- Obstacle spawn rates
- Speed progression
- Bird appearance level

## 🎨 Assets

All game assets are procedurally generated using HTML5 Canvas:
- **Dinosaur sprites** - 3 animation frames (run1, run2, jump)
- **Obstacle sprites** - Pixelated cactus design
- **Environmental sprites** - Clouds, fish, birds
- **Background effects** - Animated water, stars, hills

## 🔒 Security & Privacy

- **No personal data collected** - only game scores and player names
- **Local storage fallback** - works completely offline
- **Secure Firebase rules** - prevents score tampering
- **No authentication required** - easy for anyone to play

## 📊 Performance

### Optimization Features
- **Mobile performance mode** - reduced particle count
- **Efficient sprite rendering** - cached canvas elements
- **Smart obstacle management** - cleanup off-screen objects
- **60fps target** - smooth gameplay on all devices

### Browser Support
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (iOS/macOS)
- ✅ Mobile browsers
- ✅ Progressive Web App support

## 🤝 Contributing

Want to improve the game? Ideas welcome:
- New obstacle types
- Power-ups and collectibles
- Different environments/themes
- Sound effects and music
- Improved animations

## 📝 License

Open source - feel free to use, modify, and share!

## 🎮 Credits

**Game by**: Oogway Games Studio  
**Leaderboard System**: Firebase + Custom JavaScript  
**Graphics**: HTML5 Canvas procedural generation  
**Inspiration**: Classic Chrome Dino game with modern features

---

## 🚀 Ready to Compete?

1. **Set up Firebase** following [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. **Deploy your game** to GitHub Pages
3. **Share the URL** with friends
4. **Start the global competition!** 🏆

**May the highest score win! 🎯**
