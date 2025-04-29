<!-- steps to run project -->

<!-- for backend -->
cd backend
npm i
add .env file
add MONGO_URI, PORT , TOGETHER_AI_API_KEY, JWT_SECRET
npm start

<!-- for frontend -->
cd frontend npm i
.env => VITE_BACKEND_URL
in pages = const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
i deployed my backend and added the link and u can do the same or add localhost backend link to env file
npm run dev

<!-- done -->

<!-- project progress report -->
First commit // 07-03-2025 // made simple project
Second Commit // 08-03-2025 // developed ai question generation
Third commit // 09-03-2025 // made better UI and better User experience while taking test
Fourth commit // 10-03-2025 // made auto duration and marks on using AI question generation 
Fifth commit // 10-03-2025 // backend deployed
sixth commit // 10-03-2025 // added Written Test 
seventh commit // 10-03-2025 // used authwrapper and mobile responsive
eight commit // 10-03-2025 // added jwt token authentication and better UI 

<!-- for future -->
better UI/UX = done
added time limit to test = done
adding Quizquestion which shows particular quiz's questions in detail and edit or delete a question =  done
adding written test which uses ai to check and gives score accordingly = done 
change the reports get and check from name to id = done

✅ AI-Based Difficulty Leveling
AI analyzes past performance and adjusts question difficulty dynamically = in progress
Beginner users get easier questions; advanced users get challenging ones = in progress

Leaderboards & Achievements
Top scorers of the week/month displayed. = done
Earn badges like “Quiz Master,” “Speed Genius,” “Perfect Score,” etc.

 Live Quiz Battles
Users can challenge friends to a live quiz.
Compete in real-time, see opponent’s progress.

✅ Subscription Plans
Free users get limited quizzes.
Premium users get AI-powered insights, unlimited access, etc.
