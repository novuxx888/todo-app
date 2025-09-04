---

# TD · Todo (Gamified To-Do List)

A simple **React + Firebase** to-do list app where users can sign in with Google, add tasks, and gain XP + levels by completing them.
Checking off a task **awards XP**, removes it, and plays a little **sprite celebration animation** 🎉

---

## ✨ Features

* 🔑 Google Sign-In with Firebase Authentication
* 📝 Per-user task storage in Firestore
* ✅ Completing a task removes it from your list and gives you XP
* 🆙 Level system (XP required grows each level)
* 🎮 Animated pixel sprite that celebrates when you finish tasks
* 🔄 Real-time updates via Firestore listeners

---

## 🚀 Tech Stack

* [React](https://reactjs.org/) (via [Vite](https://vitejs.dev/))
* [Firebase](https://firebase.google.com/) (Auth + Firestore)
* Plain CSS for animation (`steps()` + `background-position`)
* Pixel art sprite sheets

---

## 🛠️ Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/todo-app.git
cd todo-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a project in the [Firebase Console](https://console.firebase.google.com/) and enable:

* Authentication → Google provider
* Firestore Database

Then copy your Firebase config into a `.env` file at the root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
public/
  sprites/
    hero_idle.png
    hero_celebrate.png
src/
  components/
    Sprite.jsx     # Sprite animation component
  App.jsx          # Main app
  firebase.js      # Firebase config
  index.css        # Global styles + sprite keyframes
```

---

## 🖼️ Sprites

* **Idle:** `hero_idle.png` (1 frame, 32×32 px)
* **Celebrate:** `hero_celebrate.png` (6 frames, 32×32 px each, laid out horizontally)

Both go in `public/sprites/`.

---

## 🌐 Deployment

You can deploy this anywhere React apps run:

* [Vercel](https://vercel.com/) (recommended — easiest for Vite)
* [Netlify](https://netlify.com/)
* GitHub Pages (`npm run build` then serve `dist/`)

---

## 📜 License

This project is for learning & fun. Use at your own risk. Sprites © their original creators.

---