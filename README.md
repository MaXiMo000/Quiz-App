<!-- steps to run project -->

<!-- for backend -->
cd backend
npm i
add .env file
add MONGO_URI, PORT , TOGETHER_AI_API_KEY
npm start

<!-- for frontend -->
cd frontend npm i
.env => VITE_BACKEND_URL
in pages = const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
i deployed my backend and added the link and u can do the same 
npm run dev

<!-- done -->

<!-- project progress report -->
First commit // 07-03-2025 // made simple project
Second Commit // 08-03-2025 // developed ai question generation
Third commit // 09-03-2025 // made better UI and better User experience while taking test
Fourth commit // 10-03-2025 // made auto duration and marks on using AI question generation 
Fifth commit // 10-03-2025 // backend deployed

<!-- for future -->
better UI/UX = done
added time limit to test = done
adding Quizquestion which shows particular quiz's questions in detail and edit or delete a question =  done
adding written test which uses ai to check and gives score accordingly
better authorization maybe using cookie 