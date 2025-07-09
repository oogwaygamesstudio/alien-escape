// 🔥 FIREBASE CONFIGURATION
// ⚠️  IMPORTANT: Replace this with your actual Firebase project config!
// 
// 📋 SETUP STEPS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project: "alien-escape-leaderboard"
// 3. Add a web app and copy the config object below
// 4. Replace ALL the values below with your real config
// 5. Follow FIREBASE_SETUP.md for complete instructions

const firebaseConfig = {
    // 🔥 YOUR REAL FIREBASE CONFIG - CONNECTED TO OOGWAY PROJECT!
    apiKey: "AIzaSyDknfZxpVAm676hvQJiNdw-bLaQxekIiyM",
    authDomain: "oogway-7542a.firebaseapp.com",
    projectId: "oogway-7542a",
    storageBucket: "oogway-7542a.firebasestorage.app",
    messagingSenderId: "994313691058",
    appId: "1:994313691058:web:1f81a047d0cceb07520eab"
    // Note: measurementId not needed for Firestore
};

// 🔌 Initialize Firebase
let db;
try {
    // Initialize with YOUR config (not demo anymore!)
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('🔥 Firebase connected! Global leaderboard is LIVE! 🌍');
    
    // Update connection status
    setTimeout(() => {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.innerHTML = '🌍 Global leaderboard connected!';
            statusElement.style.color = '#4CAF50';
        }
    }, 1000);
    
} catch (error) {
    console.warn('⚠️  Firebase not configured - using local storage fallback:', error);
    console.log('📖 See FIREBASE_SETUP.md for setup instructions');
    // Graceful fallback to local storage only
    db = null;
    
    // Update connection status
    setTimeout(() => {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.innerHTML = '📱 Playing offline - local scores only';
            statusElement.style.color = '#FFA726';
        }
    }, 1000);
}

// Leaderboard functionality
let currentHighScore = 0;
let localHighScore = localStorage.getItem('localHighScore') || 0;

class Leaderboard {
    constructor() {
        this.initializeEventListeners();
        this.loadLocalHighScore();
    }

    initializeEventListeners() {
        // Leaderboard button (commented out - button removed from UI)
        // document.getElementById('leaderboardBtn').addEventListener('click', () => {
        //     this.showLeaderboard();
        // });

        // Close leaderboard
        document.getElementById('closeLeaderboard').addEventListener('click', () => {
            this.hideLeaderboard();
        });

        document.querySelector('.close-btn').addEventListener('click', () => {
            this.hideLeaderboard();
        });

        // High Score Screen buttons
        document.getElementById('submitHighScore').addEventListener('click', () => {
            this.submitScoreFromGameOver();
        });

        document.getElementById('skipHighScore').addEventListener('click', () => {
            const skipBtn = document.getElementById('skipHighScore');
            const submitBtn = document.getElementById('submitHighScore');
            
            // Show skip feedback
            skipBtn.textContent = 'SKIPPING...';
            skipBtn.classList.add('button-loading');
            submitBtn.classList.add('button-loading');
            
            setTimeout(() => {
                this.hideHighScoreForm();
            }, 300);
        });

        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.hideHighScoreScreen();
            // Small delay to let animation finish before starting game
            setTimeout(() => {
                window.startGame();
            }, 200);
        });

        document.getElementById('shareScoreBtn').addEventListener('click', () => {
            this.shareScore();
        });

        // Legacy submit/skip (backup)
        document.getElementById('submitScoreBtn').addEventListener('click', () => {
            this.submitScore();
        });

        document.getElementById('skipScoreBtn').addEventListener('click', () => {
            this.hideNameInput();
        });

        // Name input validation for game over screen
        const gameOverNameInput = document.getElementById('gameOverNameInput');
        gameOverNameInput.addEventListener('input', (e) => {
            // Only allow alphanumeric characters and spaces, limit to 20
            e.target.value = e.target.value.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase().slice(0, 20);
        });

        gameOverNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitScoreFromGameOver();
            }
        });

        // Legacy name input validation
        const nameInput = document.getElementById('nameInput');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase().slice(0, 20);
            });

            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitScore();
                }
            });
        }

        // Close modals when clicking outside
        document.getElementById('leaderboardModal').addEventListener('click', (e) => {
            if (e.target.id === 'leaderboardModal') {
                this.hideLeaderboard();
            }
        });

        document.getElementById('nameInputModal').addEventListener('click', (e) => {
            if (e.target.id === 'nameInputModal') {
                this.hideNameInput();
            }
        });

        document.getElementById('highScoreScreen').addEventListener('click', (e) => {
            if (e.target.id === 'highScoreScreen') {
                // Don't close when clicking on the screen (user might be entering name)
            }
        });
    }

    loadLocalHighScore() {
        localHighScore = parseInt(localStorage.getItem('localHighScore')) || 0;
    }

    checkForHighScore(score) {
        currentHighScore = score;
        
        // Always show the high score screen
        this.showHighScoreScreen(score);
        
        // Update local high score
        if (score > localHighScore) {
            localHighScore = score;
            localStorage.setItem('localHighScore', score);
        }
        
        // Check if it's a global high score (determines if name input shows)
        this.checkGlobalHighScore(score);
        return true;
    }

    async checkGlobalHighScore(score) {
        if (!db) {
            console.log('Firebase not available, showing name input for local storage');
            this.showHighScoreForm();
            return;
        }

        try {
            const snapshot = await db.collection('scores')
                .orderBy('score', 'desc')
                .limit(10)
                .get();

            const scores = snapshot.docs.map(doc => doc.data());
            
            // If less than 10 scores or score beats the 10th place
            if (scores.length < 10 || score > (scores[9]?.score || 0)) {
                this.showHighScoreForm();
            }
        } catch (error) {
            console.log('Could not check global scores, showing name input anyway:', error);
            this.showHighScoreForm(); // Show anyway if offline
        }
    }

    showHighScoreScreen(score) {
        // Update final score display
        document.getElementById('finalScore').textContent = `SCORE: ${score.toLocaleString()}`;
        
        const highScoreScreen = document.getElementById('highScoreScreen');
        
        // Show the screen first (invisible)
        highScoreScreen.style.display = 'block';
        
        // Trigger smooth animation after a brief delay
        setTimeout(() => {
            highScoreScreen.classList.add('show');
        }, 50);
        
        // Load both leaderboards
        this.loadEliteLeaderboard();
        this.loadGlobalLeaderboard();
        
        // Calculate and show player rank
        this.calculatePlayerRank(score);
        
        // Hide the name form initially (will be shown if it's a high score)
        this.hideHighScoreForm();
    }

    hideHighScoreScreen() {
        const highScoreScreen = document.getElementById('highScoreScreen');
        
        // Trigger smooth exit animation
        highScoreScreen.classList.remove('show');
        
        // Hide completely after animation finishes
        setTimeout(() => {
            highScoreScreen.style.display = 'none';
        }, 400);
    }

    showHighScoreForm() {
        const form = document.getElementById('highScoreForm');
        form.classList.remove('hidden');
        
        // Clear and focus the input
        const nameInput = document.getElementById('gameOverNameInput');
        nameInput.value = '';
        nameInput.focus();
    }

    hideHighScoreForm() {
        const form = document.getElementById('highScoreForm');
        const submitBtn = document.getElementById('submitHighScore');
        const skipBtn = document.getElementById('skipHighScore');
        const nameInput = document.getElementById('gameOverNameInput');
        
        // Hide the form
        form.classList.add('hidden');
        
        // Reset form state
        setTimeout(() => {
            // Reset buttons
            submitBtn.textContent = 'SUBMIT';
            submitBtn.classList.remove('button-loading', 'button-success');
            skipBtn.textContent = 'SKIP'; // Reset skip button text
            skipBtn.classList.remove('button-loading', 'button-success');
            submitBtn.disabled = false;
            skipBtn.disabled = false;
            
            // Reset input
            nameInput.disabled = false;
            nameInput.value = '';
            nameInput.style.animation = '';
            
            // Reset form styling
            form.classList.remove('form-success');
            
            // Hide player rank and reset animation
            const rankElement = document.getElementById('playerRank');
            rankElement.classList.add('hidden');
            rankElement.classList.remove('show');
            
            // Remove any success messages
            const successMsgs = form.querySelectorAll('.success-message');
            successMsgs.forEach(msg => msg.remove());
        }, 300);
    }

    showNameInput() {
        document.getElementById('nameInputModal').style.display = 'block';
        document.getElementById('nameInput').value = '';
        document.getElementById('nameInput').focus();
    }

    hideNameInput() {
        document.getElementById('nameInputModal').style.display = 'none';
    }

    async submitScore() {
        const nameInput = document.getElementById('nameInput');
        const playerName = nameInput.value.trim();

        if (!playerName) {
            alert('Please enter a name!');
            return;
        }

        if (playerName.length > 20) {
            alert('Name must be 20 characters or less!');
            return;
        }

        if (!db) {
            // Save to local storage only
            console.log('Saving score locally (Firebase not available)');
            this.saveScoreLocally(playerName, currentHighScore);
            this.hideNameInput();
            this.showLeaderboard();
            return;
        }

        try {
            // Submit to Firebase
            await db.collection('scores').add({
                name: playerName,
                score: currentHighScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: new Date().toISOString()
            });

            this.hideNameInput();
            this.showLeaderboard();
        } catch (error) {
            console.error('Error submitting score:', error);
            // Fallback to local storage
            this.saveScoreLocally(playerName, currentHighScore);
            alert('Saved locally! Check your internet connection for global leaderboard.');
            this.hideNameInput();
        }
    }

    async showLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'block';
        
        // Update title based on connection status
        const title = document.getElementById('leaderboardTitle');
        if (db) {
            title.textContent = '🏆 GLOBAL TOP 10 🏆';
        } else {
            title.textContent = '📱 LOCAL SCORES 📱';
        }
        
        await this.loadLeaderboard();
    }

    hideLeaderboard() {
        document.getElementById('leaderboardModal').style.display = 'none';
    }

    saveScoreLocally(name, score) {
        try {
            let localScores = JSON.parse(localStorage.getItem('localScores')) || [];
            localScores.push({
                name: name,
                score: score,
                date: new Date().toISOString()
            });
            // Keep only top 10 local scores
            localScores.sort((a, b) => b.score - a.score);
            localScores = localScores.slice(0, 10);
            localStorage.setItem('localScores', JSON.stringify(localScores));
        } catch (error) {
            console.error('Error saving local score:', error);
        }
    }

    async loadLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '<li>Loading...</li>';

        if (!db) {
            // Load from local storage
            this.loadLocalLeaderboard();
            return;
        }

        try {
            const snapshot = await db.collection('scores')
                .orderBy('score', 'desc')
                .limit(10)
                .get();

            const scores = snapshot.docs.map(doc => doc.data());

            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.7);">No scores yet! Be the first!</li>';
                return;
            }

            leaderboardList.innerHTML = '';
            scores.forEach((score, index) => {
                const li = document.createElement('li');
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                
                li.innerHTML = `
                    <span>${medal} ${score.name}</span>
                    <span>${score.score.toLocaleString()}</span>
                `;
                leaderboardList.appendChild(li);
            });

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            // Fallback to local leaderboard
            this.loadLocalLeaderboard();
        }
    }

    loadLocalLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        
        try {
            const localScores = JSON.parse(localStorage.getItem('localScores')) || [];
            
            if (localScores.length === 0) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.7);">No local scores yet!<br><small>Offline Mode</small></li>';
                return;
            }

            leaderboardList.innerHTML = '';
            // Add offline indicator
            const offlineIndicator = document.createElement('li');
            offlineIndicator.innerHTML = '<span style="color: #FFD700; text-align: center; width: 100%;">📱 Local Scores (Offline)</span>';
            offlineIndicator.style.borderBottom = '2px solid #FFD700';
            offlineIndicator.style.marginBottom = '10px';
            leaderboardList.appendChild(offlineIndicator);

            localScores.forEach((score, index) => {
                const li = document.createElement('li');
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                
                li.innerHTML = `
                    <span>${medal} ${score.name}</span>
                    <span>${score.score.toLocaleString()}</span>
                `;
                leaderboardList.appendChild(li);
            });

        } catch (error) {
            console.error('Error loading local leaderboard:', error);
            leaderboardList.innerHTML = '<li style="text-align: center; color: #FF5252;">Error loading scores</li>';
        }
    }

    async loadEliteLeaderboard() {
        const leaderboardList = document.getElementById('eliteLeaderboardList');
        leaderboardList.innerHTML = '<li>Loading...</li>';

        if (!db) {
            // Load from local storage
            this.loadLocalEliteLeaderboard();
            return;
        }

        try {
            const snapshot = await db.collection('scores')
                .orderBy('score', 'desc')
                .limit(10)
                .get();

            const scores = snapshot.docs.map(doc => doc.data());

            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.7);">No scores yet!</li>';
                return;
            }

            leaderboardList.innerHTML = '';
            scores.forEach((score, index) => {
                const li = document.createElement('li');
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `👑`;
                
                li.innerHTML = `
                    <span>${medal} ${score.name}</span>
                    <span>${score.score.toLocaleString()}</span>
                `;
                leaderboardList.appendChild(li);
            });

        } catch (error) {
            console.error('Error loading elite leaderboard:', error);
            // Fallback to local leaderboard
            this.loadLocalEliteLeaderboard();
        }
    }

    async loadGlobalLeaderboard() {
        const leaderboardList = document.getElementById('globalLeaderboardList');
        leaderboardList.innerHTML = '<li>Loading global rankings...</li>';

        if (!db) {
            // Load from local storage
            this.loadLocalGlobalLeaderboard();
            return;
        }

        try {
            const snapshot = await db.collection('scores')
                .orderBy('score', 'desc')
                .limit(1000)
                .get();

            const scores = snapshot.docs.map(doc => doc.data());

            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.7);">No global scores yet!</li>';
                return;
            }

            leaderboardList.innerHTML = '';
            scores.forEach((score, index) => {
                const li = document.createElement('li');
                const rank = index + 1;
                
                // Skip top 10 (they're shown in elite section)
                if (rank <= 10) return;
                
                li.innerHTML = `
                    <span>#${rank} ${score.name}</span>
                    <span>${score.score.toLocaleString()}</span>
                `;
                leaderboardList.appendChild(li);
            });

            // If less than 11 scores, show message
            if (scores.length <= 10) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.5);">Only top 10 players so far!<br>Be the 11th player!</li>';
            }

        } catch (error) {
            console.error('Error loading global leaderboard:', error);
            // Fallback to local leaderboard
            this.loadLocalGlobalLeaderboard();
        }
    }

    async calculatePlayerRank(playerScore) {
        const rankElement = document.getElementById('playerRank');
        
        if (!db) {
            // Calculate local rank
            this.calculateLocalPlayerRank(playerScore);
            return;
        }

        try {
            const snapshot = await db.collection('scores')
                .orderBy('score', 'desc')
                .get();

            const scores = snapshot.docs.map(doc => doc.data());
            let playerRank = 1;

            // Find where this score would rank
            for (let i = 0; i < scores.length; i++) {
                if (playerScore > scores[i].score) {
                    playerRank = i + 1;
                    break;
                }
                if (i === scores.length - 1) {
                    playerRank = scores.length + 1;
                }
            }

            // Show rank with special messages
            let rankMessage = '';
            if (playerRank === 1) {
                rankMessage = '🏆 #1 WORLD CHAMPION! 🏆';
            } else if (playerRank <= 3) {
                rankMessage = `🥉 YOU PLACED #${playerRank}! 🥉`;
            } else if (playerRank <= 10) {
                rankMessage = `👑 YOU PLACED #${playerRank}! 👑`;
            } else if (playerRank <= 100) {
                rankMessage = `⭐ YOU PLACED #${playerRank}! ⭐`;
            } else {
                rankMessage = `🌟 YOU PLACED #${playerRank}! 🌟`;
            }

            rankElement.textContent = rankMessage;
            rankElement.classList.remove('hidden');
            
            // Trigger rank animation after a delay
            setTimeout(() => {
                rankElement.classList.add('show');
            }, 800);

        } catch (error) {
            console.error('Error calculating rank:', error);
            this.calculateLocalPlayerRank(playerScore);
        }
    }

    loadLocalEliteLeaderboard() {
        const leaderboardList = document.getElementById('eliteLeaderboardList');
        
        try {
            const localScores = JSON.parse(localStorage.getItem('localScores')) || [];
            
            if (localScores.length === 0) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.7);">No local scores yet!</li>';
                return;
            }

            leaderboardList.innerHTML = '';

            // Show only top 10 for elite section
            const top10 = localScores.slice(0, 10);
            top10.forEach((score, index) => {
                const li = document.createElement('li');
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `👑`;
                
                li.innerHTML = `
                    <span>${medal} ${score.name}</span>
                    <span>${score.score.toLocaleString()}</span>
                `;
                leaderboardList.appendChild(li);
            });

        } catch (error) {
            console.error('Error loading local elite leaderboard:', error);
            leaderboardList.innerHTML = '<li style="text-align: center; color: #FF5252;">Error loading scores</li>';
        }
    }

    loadLocalGlobalLeaderboard() {
        const leaderboardList = document.getElementById('globalLeaderboardList');
        
        try {
            const localScores = JSON.parse(localStorage.getItem('localScores')) || [];
            
            if (localScores.length <= 10) {
                leaderboardList.innerHTML = '<li style="text-align: center; color: rgba(255,255,255,0.5);">Only top 10 local players!<br>📱 Playing offline</li>';
                return;
            }

            leaderboardList.innerHTML = '';

            // Show ranks 11 and beyond
            const beyond10 = localScores.slice(10);
            beyond10.forEach((score, index) => {
                const li = document.createElement('li');
                const rank = index + 11;
                
                li.innerHTML = `
                    <span>#${rank} ${score.name}</span>
                    <span>${score.score.toLocaleString()}</span>
                `;
                leaderboardList.appendChild(li);
            });

        } catch (error) {
            console.error('Error loading local global leaderboard:', error);
            leaderboardList.innerHTML = '<li style="text-align: center; color: #FF5252;">Error loading scores</li>';
        }
    }

    calculateLocalPlayerRank(playerScore) {
        const rankElement = document.getElementById('playerRank');
        
        try {
            const localScores = JSON.parse(localStorage.getItem('localScores')) || [];
            let playerRank = 1;

            // Find where this score would rank
            for (let i = 0; i < localScores.length; i++) {
                if (playerScore > localScores[i].score) {
                    playerRank = i + 1;
                    break;
                }
                if (i === localScores.length - 1) {
                    playerRank = localScores.length + 1;
                }
            }

            // Show rank with special messages (local)
            let rankMessage = '';
            if (playerRank === 1) {
                rankMessage = '🏆 #1 LOCAL CHAMPION! 🏆';
            } else if (playerRank <= 3) {
                rankMessage = `🥉 LOCAL RANK #${playerRank}! 🥉`;
            } else if (playerRank <= 10) {
                rankMessage = `👑 LOCAL RANK #${playerRank}! 👑`;
            } else {
                rankMessage = `📱 LOCAL RANK #${playerRank}! 📱`;
            }

            rankElement.textContent = rankMessage;
            rankElement.classList.remove('hidden');
            
            // Trigger rank animation after a delay
            setTimeout(() => {
                rankElement.classList.add('show');
            }, 800);

        } catch (error) {
            console.error('Error calculating local rank:', error);
            rankElement.textContent = '📱 LOCAL PLAYER';
            rankElement.classList.remove('hidden');
            
            // Trigger rank animation after a delay
            setTimeout(() => {
                rankElement.classList.add('show');
            }, 800);
        }
    }

    async submitScoreFromGameOver() {
        const nameInput = document.getElementById('gameOverNameInput');
        const submitBtn = document.getElementById('submitHighScore');
        const skipBtn = document.getElementById('skipHighScore');
        const form = document.getElementById('highScoreForm');
        const playerName = nameInput.value.trim();

        if (!playerName) {
            // Add shake animation for empty name
            nameInput.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => nameInput.style.animation = '', 500);
            nameInput.focus();
            return;
        }

        if (playerName.length > 20) {
            // Add shake animation for too long name
            nameInput.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => nameInput.style.animation = '', 500);
            nameInput.focus();
            return;
        }

        // Show instant success state
        submitBtn.textContent = '✓ SUBMITTED';
        submitBtn.classList.add('button-success');
        skipBtn.classList.add('button-loading');
        submitBtn.disabled = true;
        skipBtn.disabled = true;
        nameInput.disabled = true;

        if (!db) {
            // Save to local storage only
            console.log('Saving score locally (Firebase not available)');
            this.saveScoreLocally(playerName, currentHighScore);
            
            // Show success state
            setTimeout(() => {
                submitBtn.textContent = '✓ SAVED!';
                submitBtn.classList.remove('button-loading');
                submitBtn.classList.add('button-success');
                form.classList.add('form-success');
                
                // Add success message
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Score saved locally!';
                form.appendChild(successMsg);
                
                // Refresh leaderboards and hide form after delay
                this.loadEliteLeaderboard();
                this.loadGlobalLeaderboard();
                this.calculatePlayerRank(currentHighScore);
                setTimeout(() => {
                    this.hideHighScoreForm();
                }, 2000);
            }, 500);
            return;
        }

        try {
            // Submit to Firebase
            await db.collection('scores').add({
                name: playerName,
                score: currentHighScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: new Date().toISOString()
            });

            // Show success state
            submitBtn.textContent = '✓ SUBMITTED!';
            submitBtn.classList.remove('button-loading');
            submitBtn.classList.add('button-success');
            form.classList.add('form-success');
            
            // Add success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Score submitted to global leaderboard!';
            form.appendChild(successMsg);
            
            // Refresh leaderboards and hide form after delay
            this.loadEliteLeaderboard();
            this.loadGlobalLeaderboard();
            this.calculatePlayerRank(currentHighScore);
            setTimeout(() => {
                this.hideHighScoreForm();
            }, 2000);

        } catch (error) {
            console.error('Error submitting score:', error);
            // Fallback to local storage
            this.saveScoreLocally(playerName, currentHighScore);
            
            // Show partial success state
            submitBtn.textContent = '✓ SAVED LOCAL';
            submitBtn.classList.remove('button-loading');
            submitBtn.classList.add('button-success');
            form.classList.add('form-success');
            
            // Add warning message
            const warningMsg = document.createElement('div');
            warningMsg.className = 'success-message';
            warningMsg.style.color = '#FFA726';
            warningMsg.textContent = 'Saved locally! Check internet connection.';
            form.appendChild(warningMsg);
            
            // Refresh leaderboards and hide form after delay
            this.loadEliteLeaderboard();
            this.loadGlobalLeaderboard();
            this.calculatePlayerRank(currentHighScore);
            setTimeout(() => {
                this.hideHighScoreForm();
            }, 2500);
        }
    }

    shareScore() {
        const score = currentHighScore;
        const shareText = `🎮 I just scored ${score.toLocaleString()} points in Alien Escape! Can you beat my score?`;
        
        if (navigator.share) {
            // Use native sharing if available (mobile)
            navigator.share({
                title: 'Alien Escape - My High Score!',
                text: shareText,
                url: window.location.href
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareText + ' ' + window.location.href)
                    .then(() => {
                        alert('Score copied to clipboard! Share it with your friends!');
                    })
                    .catch(() => {
                        // Ultimate fallback
                        prompt('Copy this text to share your score:', shareText + ' ' + window.location.href);
                    });
            } else {
                // Ultimate fallback
                prompt('Copy this text to share your score:', shareText + ' ' + window.location.href);
            }
        }
    }

    // Clean up old scores (keep only top 100)
    async cleanupScores() {
        try {
            const snapshot = await db.collection('scores')
                .orderBy('score', 'desc')
                .offset(100)
                .get();

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            if (!snapshot.empty) {
                await batch.commit();
                console.log('Cleaned up old scores');
            }
        } catch (error) {
            console.log('Could not clean up scores:', error);
        }
    }
}

// Initialize leaderboard immediately since script is loaded at bottom
const leaderboard = new Leaderboard();

// Make leaderboard available globally
window.leaderboard = leaderboard; 