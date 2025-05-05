# 🧠 Quiz App

An advanced, full-stack **AI-powered Quiz App** built with the **MERN Stack** that enables users to take quizzes, generate AI-based questions, and upgrade to premium for enhanced features like insights, achievements, and live battles.

---

## 🌐 Live Demo

👉 [Click here to visit the live site](https://quiz-app-cp2h.onrender.com/)

---

## 🚀 Features

- 🔐 **Authentication**
  - Google OAuth, JWT-based authentication
  - Role-based access (User, Premium, Admin)

- 🧠 **AI-Powered Quiz Generation**
  - Automatic question generation with duration and marks
  - AI evaluates written test answers using NLP

- 📊 **Reports & Performance Tracking**
  - Get score reports, quiz history, and question reviews

- 🏆 **Leaderboards & Achievements**
  - View top scorers weekly/monthly
  - Earn badges like “Quiz Master,” “Speed Genius,” etc.

- 🤝 **Live Quiz Battles** *(in progress)*
  - Challenge friends in real-time and compete live

- 💳 **Subscription Plans**
  - Free: Limited quizzes
  - Premium: Unlimited access + AI insights

- 🛡️ Admin Panel
  QuizNest includes a powerful admin dashboard enabling full control over platform operations:
  
  - 🔍 Monitor: View reports on quiz usage and user performance.
  - 🧩 Manage: Add/edit/delete quizzes and questions.
  - 👥 Control Users: Promote, suspend, or analyze users by roles (User, Premium, Admin).
  - 📈 View Insights: Access real-time statistics and analytics of quiz activity.
  
  Accessible to Admins only. Requires login with appropriate credentials.

---

## 🛠️ Tech Stack

- **Frontend**: React,CSS, Vite
- **Backend**: Node.js, Express.js, MongoDB
- **AI Integration**: Together AI, Google Gemini API
- **Authentication**: JWT, Google OAuth
- **Deployment**: Render

---
## 👤 Author

Developed by [MaXiMo000](https://github.com/MaXiMo000)  
All rights reserved © 2025

Please contact for licensing or collaboration inquiries.
**Do not remove this credit in forks or copies. Attribution is required.**
---

### 📦 Installation & Setup

```🔗 Backend


bash
cd backend
npm install
Create a .env file in the backend folder with the following:

env
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
Start the backend server:

bash
npm start


💻 Frontend

bash
cd frontend
npm install
Create a .env file in the frontend folder:

env
VITE_BACKEND_URL=https://your-backend-url.onrender.com
VITE_CONTACT_KEY = from emailjs 
VITE_CONTACT_SERVICE = from emailjs 
VITE_CONTACT_TEMPLATE = from emailjs 
Or use this for local testing:

env
VITE_BACKEND_URL=http://localhost:4000

In your pages jsx, access the backend URL like:
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

Start the frontend server:
bash
npm run dev


📈 Project Progress Timeline:
  Date	      Commit Description
  07-03-2025	Initial commit: basic project structure
  08-03-2025	AI-based question generation added
  09-03-2025	Improved UI and quiz-taking UX
  10-03-2025	Auto duration/marks for AI questions, backend deployed
  10-03-2025	Added written test with AI evaluation
  10-03-2025	Added AuthWrapper and mobile responsiveness
  10-03-2025	Integrated JWT authentication and enhanced UI


✅ Completed Features:
    ✅ Better UI/UX
    ✅ AI-powered question generation
    ✅ Time limits for tests
    ✅ Role-based access with JWT
    ✅ Quiz review/edit system
    ✅ Written test with AI evaluation
    ✅ AI-based difficulty level adjustment
    ✅ Beginner users get easier questions
    ✅ Advanced users face harder ones
    ✅ Leaderboard for top scorers
    ✅ Free vs Premium subscriptions
    ✅Free users: Limited quizzes
    ✅Premium users: Unlimited access, AI insights


🔄 In Progress:
    🏅 Achievement Badges: => done
        Earn badges like:
            Quiz Master
            Speed Genius
            Perfect Score

    ⚔️ Live Quiz Battles => in progress
      Real-time quiz competition
      View opponent’s progress during battle


💬 Feedback & Contributions:
    Have suggestions or want to contribute?
    Open an issue or a pull request — all contributions are welcome! 🙌
