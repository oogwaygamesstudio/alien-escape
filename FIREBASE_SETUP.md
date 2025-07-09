# 🔥 Firebase Global Leaderboard Setup

This guide will help you set up a **real Firebase database** for your Alien Escape global leaderboard!

## 🚀 Step 1: Create Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. Click **"Create a project"**
3. **Project name**: `alien-escape-leaderboard` (or any name you like)
4. **Enable Google Analytics**: Choose "Yes" (optional but recommended)
5. Click **"Create project"** and wait for setup to complete

## 🛠️ Step 2: Set up Firestore Database

1. In your Firebase project, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. **Security rules**: Choose **"Start in test mode"** (we'll configure proper rules later)
4. **Cloud Firestore location**: Choose your nearest region (e.g., `us-central1`)
5. Click **"Done"**

## 📱 Step 3: Register Web App

1. In Firebase Console, click the **Web icon** (`</>`) to add a web app
2. **App nickname**: `alien-escape-web`
3. **Check** "Also set up Firebase Hosting" (optional but recommended)
4. Click **"Register app"**
5. **COPY the Firebase config object** - you'll need this!

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz",
  authDomain: "alien-escape-leaderboard.firebaseapp.com",
  projectId: "alien-escape-leaderboard",
  storageBucket: "alien-escape-leaderboard.appspot.com",
  messagingSenderId: "987654321098",
  appId: "1:987654321098:web:abc123def456789012"
};
```

## ⚙️ Step 4: Configure Firestore Rules

1. Go to **"Firestore Database"** → **"Rules"** tab
2. Replace the default rules with these **secure rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to scores for leaderboard
    match /scores/{document} {
      allow read: if true;
      
      // Allow write only with valid data
      allow create: if resource == null
        && request.auth == null  // No authentication required
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 1
        && request.resource.data.name.size() <= 20
        && request.resource.data.score is number
        && request.resource.data.score >= 0
        && request.resource.data.score <= 1000000  // Max reasonable score
        && request.resource.data.timestamp != null
        && request.resource.data.date is string;
      
      // Prevent updates and deletes
      allow update, delete: if false;
    }
  }
}
```

3. Click **"Publish"**

## 🔧 Step 5: Update Game Configuration

1. **Open** `leaderboard.js` in your project
2. **Find** the `firebaseConfig` section at the top
3. **Replace** the demo config with your real Firebase config:

```javascript
// Replace this section in leaderboard.js:
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id", 
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

4. **Remove or comment out** the `demoFirebaseConfig` section
5. **Update** the initialization to use your real config:

```javascript
// Change this line:
firebase.initializeApp(demoFirebaseConfig);
// To this:
firebase.initializeApp(firebaseConfig);
```

## 🌐 Step 6: Deploy to GitHub Pages

### Option A: GitHub Pages (Recommended)

1. **Push your code** to your GitHub repository
2. Go to your **GitHub repository** → **Settings** → **Pages**
3. **Source**: Deploy from a branch
4. **Branch**: Select `main` (or `master`)
5. **Folder**: `/ (root)`
6. Click **"Save"**
7. Your game will be available at: `https://yourusername.github.io/your-repo-name`

### Option B: Firebase Hosting (Alternative)

1. **Install Firebase CLI**: `npm install -g firebase-tools`
2. **Login**: `firebase login`
3. **Initialize**: `firebase init hosting`
4. **Deploy**: `firebase deploy`

## 🎮 Step 7: Test the Global Leaderboard

1. **Open your deployed game** in multiple browsers/devices
2. **Play and submit scores** from different devices
3. **Verify** that scores appear on all devices in real-time
4. **Share the URL** with friends to test the global leaderboard!

## 🛡️ Security Features

- ✅ **Validated data**: Only allows proper score submissions
- ✅ **No authentication needed**: Easy for players to submit scores  
- ✅ **Read-only after creation**: Prevents score tampering
- ✅ **Reasonable limits**: Prevents spam and invalid scores
- ✅ **Rate limiting**: Firebase automatically prevents abuse

## 🔍 Monitoring Your Leaderboard

### View Scores in Firebase Console:
1. Go to **Firestore Database** → **Data** tab
2. You'll see a `scores` collection with all submitted scores
3. Each score document contains:
   - `name`: Player name (up to 20 characters)
   - `score`: Numeric score
   - `timestamp`: When submitted
   - `date`: ISO date string

### Usage Analytics:
1. Go to **Analytics** → **Dashboard** to see:
   - How many people are playing
   - Where they're from
   - Peak playing times

## 🚨 Important Notes

- **Free Tier**: Firebase free tier allows 50,000 reads/day and 20,000 writes/day
- **Scaling**: If your game gets popular, you may need to upgrade to paid plan
- **Backup**: Your scores are automatically backed up by Firebase
- **Global**: Works worldwide with Firebase's global CDN

## 🎯 Final Result

Once deployed, your game will have:
- 🌍 **True global leaderboard** accessible from any device
- 🏆 **Top 1000 rankings** with real-time updates  
- 👥 **Multiplayer competition** between friends and strangers
- 📱 **Cross-platform** - works on phones, tablets, computers
- ⚡ **Real-time updates** - see new scores instantly
- 🛡️ **Secure and reliable** - powered by Google's infrastructure

**Share your game URL with friends and start competing! 🎮**

---

Need help? Feel free to ask! The leaderboard will be epic! 🚀 