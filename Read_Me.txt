================================================================================
  CIE (COPYRIGHT INFORMATION EXTRACTION) — PROJECT OVERVIEW
================================================================================

TITLE:        QuizNest – AI-Powered Interactive Quiz Platform
INSTITUTION:  Chitkara University, Rajpura, Punjab
PRIMARY CONTACT / LEAD: Ritish Saini
ROLL NO. / EMPLOYEE CODE: 2210992169

This file complements the main README.md. It records academic submission
details, team and supervisor information, the project abstract, motivation,
original contribution, and a concise repository layout for reviewers.

================================================================================
  TEAM MEMBERS AND SUPERVISOR
================================================================================

1) Ritish Saini
   Roll / Emp. Code:  2210992169
   Address:           Vill. Bagol Khurd, District Hoshiarpur, Punjab
   Email:             ritish2169.be22@chitkara.edu.in
   Mobile:            9565069768
   (Primary contributor / project lead for this documentation entry.)

2) Husandeep Sharma
   Roll / Emp. Code:  2210991675
   Address:           Baba Deep Singh Nagar, Barnala, Punjab
   Email:             husandeep1675.be22@chitkara.edu.in
   Mobile:            7973867621

SUPERVISOR

   Prof. (Dr.) Darpan Anand
   Email:  darpan.anand@chitkara.edu.in
   Mobile: 7060874708

================================================================================
  MOTIVATION (PROBLEM BACKGROUND)
================================================================================

Most online quiz platforms use static question banks: every user sees the same
material, regardless of skill. Advanced learners are bored; beginners are
overwhelmed. Scores alone rarely explain what went wrong or how to improve.
There is little real-time feedback, weak community, and few reasons to return.
Engagement falls without personalization, appropriate challenge, and reward.

================================================================================
  OBJECTIVE
================================================================================

QuizNest aims to deliver a personalized, adaptive learning experience by:

  • Tailoring difficulty to each user and improving with them over time
  • Generating relevant questions with AI, reducing dependence on fixed banks
  • Driving engagement with points, badges, leaderboards, and multiplayer
  • Providing clear, actionable feedback (what to study next, not just scores)
  • Remaining accessible across ages, subjects, and devices, including offline
    where the platform supports it

================================================================================
  PROPOSED SOLUTION / SYSTEM OVERVIEW
================================================================================

QuizNest is a full-stack web platform. Users create accounts, choose topics,
and receive AI-generated questions matched to subject and current difficulty.
As the user answers, the system raises or lowers difficulty to stay in a
productive challenge band. Multiplayer battles, live leaderboards, XP, and
achievements add a competitive, motivating layer. Analytics and (where
implemented) learning paths and spaced repetition support long-term learning.

================================================================================
  KEY FEATURES (SUMMARY)
================================================================================

  • AI-generated questions (fresh, topic-aligned practice each session)
  • Adaptive difficulty (real-time adjustment from performance)
  • Real-time multiplayer quiz battles (WebSocket / live rooms)
  • Leaderboards and XP / rankings
  • Performance analytics and dashboards
  • Gamification: badges, achievements, daily challenges
  • AI Study Buddy: explanations, tips, and next-step suggestions
  • Wrong-answer review with explanations
  • Learning paths and spaced repetition (where implemented)
  • Bookmarks, search, activity feeds; friends and study groups
  • Themes and display options; PWA-style install and offline where supported
  • Secure login (e.g. email/password, Google OAuth where configured)
  • Admin and reporting (content management, activity oversight, where applicable)

================================================================================
  TECHNOLOGY / METHOD
================================================================================

  • Frontend:     React, Vite
  • Backend:      Node.js, Express (REST API)
  • Database:     MongoDB
  • Real-time:    Socket.IO
  • AI:           Google Gemini (question generation, Study Buddy)
  • Caching:      Redis (sessions / performance)
  (See README.md for exact versions, env vars, and optional services.)

================================================================================
  EXPECTED OUTCOMES AND BENEFITS
================================================================================

  • Better retention through adaptation and (where used) spaced repetition
  • Higher motivation via gamification, competition, and social features
  • Actionable feedback through analytics and AI explanations
  • Wider access via responsive UI and PWA-style deployment
  • Scalable architecture for more users, topics, and categories
  • Data-driven insight for learners and educators

================================================================================
  ORIGINAL CONTRIBUTION
================================================================================

Unlike typical quiz sites that only serve fixed questions and simple scores,
QuizNest combines: AI-generated content, adaptive difficulty, real-time
multiplayer, and a full gamification layer in one system. The AI Study Buddy
adds personalized support beyond static feedback. The result is a learning
environment meant to be effective, engaging, and extensible as users grow.

================================================================================
  REPOSITORY DIRECTORY STRUCTURE (HIGH LEVEL)
================================================================================

Quiz-App/
├── README.md                 Main project readme (setup, features, stack)
├── Read_Me.txt               This file (CIE / team / abstract / layout)
├── LICENSE
├── package.json              Root scripts (e.g. dev, combined start)
├── start.sh, start.bat       Local startup helpers
├── scripts/                  Helper scripts
├── tests/                    Top-level or shared tests (if present)
├── docs/                     Additional documentation
│   └── ADAPTIVE_DIFFICULTY_AND_CONFIDENCE.md
├── .github/                  GitHub workflows / templates
├── backend/                  Node.js + Express API
│   ├── server.js             Application entry
│   ├── config/               Configuration
│   ├── controllers/          Route handlers
│   ├── middleware/          Auth, logging, etc.
│   ├── models/               MongoDB models
│   ├── routes/               API routes
│   ├── services/            Business logic (AI, sockets, etc.)
│   ├── utils/                Helpers
│   ├── tests/                Backend tests
│   ├── algorithms/          Adaptive / scoring logic (as applicable)
│   └── package.json
└── frontend/                 React + Vite SPA
    ├── index.html
    ├── vite.config.js
    ├── public/               Static assets, PWA files
    ├── src/                  React components, pages, hooks, styles
    └── package.json

================================================================================
  NOTE TO REVIEWERS
================================================================================

Feature completeness may vary by deployment (environment variables, API keys,
and optional modules). For installation, environment variables, and the latest
feature list, refer to README.md and backend/frontend .env examples described
there.

Last updated: April 2026 (academic / CIE document for QuizNest).

================================================================================
