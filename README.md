# 🧠 QuizNest – AI Quiz App

---

## 🌐 Live Demo

👉 [Click here to visit the live site](https://quiz-app-cp2h.onrender.com/)

---

## 🚀 Features

### 🔐 Authentication

* Google OAuth & JWT-based secure login
* Role-based access (User, Premium, Admin)

### 🧠 AI-Powered Quiz Generation

* Automatically generate MCQs & written questions
* AI assigns duration, marks, and evaluates written answers using NLP
* Adaptive difficulty: beginners get easier questions, advanced users get harder ones

### 🤖 Intelligence Dashboard *(Premium Feature)* ✅

* **Smart Quiz Recommendations**: AI-powered quiz suggestions based on performance, favorite categories, and learning patterns
* **Adaptive Difficulty System**: Dynamic difficulty adjustment based on recent performance with confidence scoring
* **Learning Analytics**: Comprehensive performance insights with trends, predictions, and personalized study recommendations
* **Performance Trends**: Visual weekly performance tracking with interactive charts
* **Next Quiz Predictions**: AI predicts expected performance on upcoming quizzes
* **Personalized Study Tips**: Custom recommendations for optimal study times and improvement areas

### 📊 Reports & Analytics

* Quiz history and detailed performance reports
* Real-time feedback and score analytics

### 🏆 Gamification

* **Achievements System** ✅

  * Earn badges like “Quiz Master,” “Speed Genius,” and “Perfect Score”
  * View badges and stats in user profile
* **Leaderboards**

  * Weekly and monthly top scorers
  * Promotes user engagement and competition

### ⚔️ Live Quiz Battles *(In Progress)*

* Challenge other users in real-time quiz duels
* See your opponent's live progress *(coming soon)*

### 🎨 UI/UX Enhancements ✅

* **Advanced Theme Selector** for Light/Dark/custom modes
* **Mobile Navigation Bar** for improved phone/tablet usability
* **Enhanced Dashboard UI** with upgraded design and data visualization
* **Gamification Hub** with daily challenges and tournament management
* **Interactive Quiz Modal** with mobile-responsive design and progress tracking
* **New Test Page** for better quiz flow and feedback
* Consistent design system and polished UI across all screens

### 💳 Subscription Plans

* **Free Plan**: Limited quizzes, core features
* **Premium Plan**: Unlimited access, AI insights, Intelligence Dashboard, achievements, and future battle mode

### 🛡️ Admin Panel

A powerful admin dashboard providing full control of platform operations:

* 🔍 Monitor user activity and quiz submissions
* 🧩 Add/Edit/Delete quizzes and questions
* 👥 Manage users: roles, status, analytics
* 📈 Real-time insights and platform stats

---

## 🛠️ Tech Stack

* **Frontend**: React, CSS, Vite
* **Backend**: Node.js, Express.js, MongoDB
* **AI Integration**: Together AI, Google Gemini API
* **Authentication**: JWT, Google OAuth
* **Deployment**: Render

---

## 👤 Author

Developed by [MaXiMo000](https://github.com/MaXiMo000)
All rights reserved © 2025

📩 For licensing or collaboration inquiries, feel free to reach out.
⚠️ **Please do not remove credit in forks or copies. Attribution is required.**

---

## 📦 Installation & Setup

### 🔗 Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder with:

```env
MONGO_URI=your_mongodb_uri
PORT=5000
TOGETHER_AI_API_KEY=your_ai_key
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
FRONTEND_URL=http://localhost:5173
GOOGLE_SECRET=your_google_secret
GEMINI_API_KEY=your_gemini_api_key
```

Start the backend server:

```bash
npm start
```

### 💻 Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder with:

```env
VITE_BACKEND_URL=https://your-backend-url.onrender.com
VITE_CONTACT_KEY=your_emailjs_key
VITE_CONTACT_SERVICE=your_emailjs_service
VITE_CONTACT_TEMPLATE=your_emailjs_template
```

For local testing:

```env
VITE_BACKEND_URL=http://localhost:4000
```

Access env variables in React pages:

```js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
```

Run the frontend dev server:

```bash
npm run dev
```

---

## 🗓️ Project Progress Timeline

| Date       | Commit Description                                      |
| ---------- | ------------------------------------------------------- |
| 07-03-2025 | Initial commit: basic project structure                 |
| 08-03-2025 | AI-based question generation added                      |
| 09-03-2025 | Improved UI and quiz-taking UX                          |
| 10-03-2025 | Auto duration/marks for AI questions, backend deployed  |
| 10-03-2025 | Added written test with AI evaluation                   |
| 10-03-2025 | AuthWrapper + responsive layout                         |
| 10-03-2025 | Integrated JWT, enhanced frontend                       |
| 23-07-2025 | Advanced Theme Selector, Mobile Navbar, Test Page added |
| 23-07-2025 | Achievement System fully integrated                     |
| 24-07-2025 | Full UI consistency pass + New Dashboard design         |
| 25-07-2025 | Intelligence Dashboard with AI insights added (Premium) |
| 27-07-2025 | Gamification Hub: Daily Challenges and Tournaments      |
| 27-07-2025 | Enhanced Quiz Modal UI with mobile optimization         |

---

## ✅ Completed Features

* ✅ Better UI/UX Design
* ✅ AI-powered question generation
* ✅ Adaptive test difficulty
* ✅ JWT-based role management (User/Premium/Admin)
* ✅ Written tests with AI NLP evaluation
* ✅ Quiz result tracking and reviews
* ✅ Achievement Badge System 🏆
* ✅ Leaderboards (weekly/monthly)
* ✅ Free vs Premium user flow
* ✅ Advanced Theme Selector 🌙
* ✅ Mobile Navbar for responsive layout 📱
* ✅ Enhanced Dashboard & Test Page 🎯
* ✅ Intelligence Dashboard with AI-powered insights 🧠
* ✅ Gamification Hub with Daily Challenges and Tournaments 🏆
* ✅ Mobile-optimized Quiz Modal with enhanced UX 📱
* ✅ An advanced 🏆 Gamification

* **Daily Challenges** ✅

  * Fresh daily quiz challenges with special rewards
  * Progress tracking and completion status
  * XP and points system for engagement
  * Reset timer for next day's challenges
* **Tournament System** ✅

  * Create and participate in quiz tournaments
  * Registration-based competitive gameplay
  * Prize distribution for top performers
  * Real-time leaderboards and rankings
* **Achievements System** ✅

  * Earn badges like "Quiz Master," "Speed Genius," and "Perfect Score"
  * View badges and stats in user profile
* **Enhanced Quiz Experience** ✅

  * Interactive quiz modal with progress tracking
  * Mobile-optimized quiz interface
  * Real-time timer and question indicators
  * Smooth animations and responsive design
* **Leaderboards**

  * Weekly and monthly top scorers
  * Tournament-specific rankings
  * Promotes user engagement and competitionstack **AI-powered Quiz App** built with the **MERN Stack** that enables users to take intelligent quizzes, generate questions via AI, track performance, and enjoy gamified elements like achievements and leaderboards. Premium users get access to exclusive features such as insights, advanced theming, and live battles.

---

## 🔄 In Progress

* ⚔️ **Live Quiz Battles**

  * Real-time 1v1 quiz mode
  * View your opponent’s progress live

---

## 💬 Feedback & Contributions

Got feedback, ideas, or want to collaborate?
Open an issue or a pull request — all contributions are welcome! 🙌
