import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Study session model for persistence
const studySessions = new Map(); // userId -> session data

class StudySession {
    constructor(userId, preferences = {}) {
        this.userId = userId;
        this.sessionId = Date.now().toString();
        this.startTime = new Date();
        this.messages = [];
        this.topics = preferences.topics || [];
        this.difficulty = preferences.difficulty || 'intermediate';
        this.learningStyle = preferences.learningStyle || 'visual';
        this.weakAreas = preferences.weakAreas || [];
        this.context = {
            currentTopic: null,
            studyGoals: [],
            progressTracking: {},
            recommendedActions: []
        };
    }

    addMessage(role, content, metadata = {}) {
        this.messages.push({
            role,
            content,
            timestamp: new Date(),
            metadata
        });
    }

    getRecentContext(limit = 10) {
        return this.messages.slice(-limit);
    }

    updateContext(updates) {
        this.context = { ...this.context, ...updates };
    }
}

// AI Study Buddy - Start session
router.post('/start-session', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferences = {} } = req.body;

        // Get user data for personalization
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create new study session
        const session = new StudySession(userId, {
            ...preferences,
            weakAreas: user.intelligence?.weakAreas || [],
            userLevel: user.level,
            userXP: user.xp
        });

        studySessions.set(userId, session);

        // Generate welcome message based on user data
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        
        const prompt = `You are an AI Study Buddy for a quiz learning platform. Create a personalized welcome message for this user:

User Profile:
- Name: ${user.name}
- Level: ${user.level}
- XP: ${user.xp}
- Weak Areas: ${session.weakAreas.join(', ') || 'None identified yet'}
- Preferred Topics: ${session.topics.join(', ') || 'Not specified'}
- Learning Style: ${session.learningStyle}
- Difficulty Preference: ${session.difficulty}

Create a warm, encouraging welcome message that:
1. Welcomes them personally
2. Acknowledges their current level/progress
3. Offers to help with their weak areas
4. Suggests some study activities
5. Asks what they'd like to work on today

Keep it conversational, supportive, and under 200 words.`;

        const result = await model.generateContent(prompt);
        const welcomeMessage = result.response.text();

        session.addMessage('assistant', welcomeMessage, { type: 'welcome' });

        res.json({
            sessionId: session.sessionId,
            message: welcomeMessage,
            userProfile: {
                name: user.name,
                level: user.level,
                xp: user.xp,
                weakAreas: session.weakAreas
            }
        });

    } catch (error) {
        console.error('Error starting AI study session:', error);
        res.status(500).json({ message: 'Failed to start study session' });
    }
});

// AI Study Buddy - Chat
router.post('/chat', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { message, requestType = 'general' } = req.body;

        let session = studySessions.get(userId);
        if (!session) {
            return res.status(400).json({ message: 'No active study session. Please start a session first.' });
        }

        // Add user message to session
        session.addMessage('user', message, { requestType });

        // Get user data for context
        const user = await User.findById(userId);
        
        // Generate AI response based on request type
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        let response;
        switch (requestType) {
            case 'quiz_request':
                response = await generateQuizResponse(model, session, user, message);
                break;
            case 'explanation':
                response = await generateExplanationResponse(model, session, user, message);
                break;
            case 'study_plan':
                response = await generateStudyPlanResponse(model, session, user, message);
                break;
            case 'weak_areas':
                response = await generateWeakAreasResponse(model, session, user, message);
                break;
            default:
                response = await generateGeneralResponse(model, session, user, message);
        }

        session.addMessage('assistant', response.content, { 
            type: requestType,
            actions: response.actions || []
        });

        res.json({
            response: response.content,
            actions: response.actions || [],
            sessionContext: {
                currentTopic: session.context.currentTopic,
                studyGoals: session.context.studyGoals,
                recommendedActions: session.context.recommendedActions
            }
        });

    } catch (error) {
        console.error('Error in AI chat:', error);
        res.status(500).json({ message: 'Failed to process chat message' });
    }
});

// Generate personalized quiz
router.post('/generate-quiz', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { topic, difficulty, questionCount = 5, focusAreas = [] } = req.body;

        const user = await User.findById(userId);
        let session = studySessions.get(userId);
        
        if (!session) {
            session = new StudySession(userId);
            studySessions.set(userId, session);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const prompt = `Generate a personalized quiz for a student with the following profile:

User Profile:
- Level: ${user.level}
- Weak Areas: ${user.intelligence?.weakAreas?.join(', ') || 'None'}
- Focus Areas: ${focusAreas.join(', ') || 'General'}

Quiz Requirements:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Number of Questions: ${questionCount}
- Format: Multiple choice with 4 options each

For each question, provide:
1. A clear, educational question
2. Four distinct options (A, B, C, D)
3. The correct answer as a letter ("A", "B", "C", or "D")
4. A detailed explanation of why the answer is correct
5. Learning tips or mnemonics when helpful

Focus on areas where the student needs improvement. Make questions progressively challenging.

Return ONLY a valid JSON object with this structure:
{
  "title": "Personalized Quiz: [Topic]",
  "category": "[Category]",
  "difficulty": ${difficulty},
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "difficulty": ${difficulty},
      "explanation": "Detailed explanation with learning tips"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        let quizData;
        
        try {
            // Clean the response to ensure valid JSON
            let responseText = result.response.text().trim();
            responseText = responseText.replace(/```json\n?/, '').replace(/\n?```/, '');
            quizData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            return res.status(500).json({ message: 'Failed to generate quiz format' });
        }

        // Save quiz to database with proper validation
        const processedQuestions = quizData.questions.map(q => {
            // Ensure correctAnswer is a letter format (A, B, C, D)
            let correctAnswer = q.correctAnswer;
            if (typeof correctAnswer === 'number') {
                correctAnswer = ['A', 'B', 'C', 'D'][correctAnswer];
            }
            
            // Validate that correctAnswer is a valid letter
            if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
                console.warn(`Invalid correctAnswer: ${correctAnswer}, defaulting to A`);
                correctAnswer = 'A';
            }
            
            // Map difficulty to valid enum values
            let questionDifficulty = q.difficulty || difficulty;
            const difficultyMapping = {
                'beginner': 'easy',
                'easy': 'easy',
                'intermediate': 'medium',
                'medium': 'medium',
                'advanced': 'hard',
                'hard': 'hard',
                'expert': 'hard'
            };
            
            // Normalize to lowercase and map to valid enum
            const normalizedDifficulty = questionDifficulty.toLowerCase();
            questionDifficulty = difficultyMapping[normalizedDifficulty] || 'medium';
            
            return {
                question: q.question,
                options: q.options,
                correctAnswer: correctAnswer,
                difficulty: questionDifficulty
            };
        });

        const quiz = new Quiz({
            title: quizData.title,
            category: quizData.category,
            totalMarks: quizData.questions.length,
            passingMarks: Math.ceil(quizData.questions.length / 2),
            duration: quizData.questions.length * 2, // 2 minutes per question
            questions: processedQuestions,
            creator: userId,
            isAIGenerated: true,
            personalizedFor: userId,
            createdBy: {
                _id: userId,
                name: user.name
            },
            tags: ['ai-generated', topic.toLowerCase(), difficulty],
            aiMetadata: {
                userLevel: user.level,
                weakAreas: user.intelligence?.weakAreas || [],
                focusAreas,
                sessionId: session.sessionId
            },
            // Initialize difficulty distribution
            difficultyDistribution: {
                easy: processedQuestions.filter(q => q.difficulty === 'easy').length,
                medium: processedQuestions.filter(q => q.difficulty === 'medium').length,
                hard: processedQuestions.filter(q => q.difficulty === 'hard').length
            }
        });

        await quiz.save();

        // Update session context
        session.updateContext({
            currentTopic: topic,
            lastGeneratedQuiz: quiz._id
        });

        session.addMessage('assistant', `I've created a personalized ${questionCount}-question quiz on ${topic} at ${difficulty} level, focusing on your learning needs!`, {
            type: 'quiz_generated',
            quizId: quiz._id.toString()
        });

        res.json({
            quiz: {
                id: quiz._id,
                title: quiz.title,
                category: quiz.category,
                difficulty: difficulty,
                questionCount: quiz.questions.length,
                questions: quiz.questions
            },
            message: `Quiz generated successfully! This quiz is tailored to your Level ${user.level} profile and focuses on areas where you can improve.`
        });

    } catch (error) {
        console.error('Error generating AI quiz:', error);
        res.status(500).json({ message: 'Failed to generate quiz' });
    }
});

// Get study recommendations
router.get('/recommendations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's recent quiz performance
        const recentQuizzes = await Quiz.find({
            'results.userId': userId
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('results');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const prompt = `Analyze this student's profile and provide personalized study recommendations:

Student Profile:
- Name: ${user.name}
- Level: ${user.level}
- Total XP: ${user.xp}
- Weak Areas: ${user.intelligence?.weakAreas?.join(', ') || 'None identified'}
- Strong Areas: ${user.intelligence?.strongAreas?.join(', ') || 'None identified'}
- Recent Quiz Topics: ${recentQuizzes.map(q => q.category).join(', ') || 'None'}

Provide 5-7 actionable study recommendations including:
1. Specific topics to focus on
2. Difficulty levels to attempt
3. Study strategies that would help
4. Time management suggestions
5. Gamification goals to motivate progress

Format as a JSON array of recommendation objects:
[
  {
    "title": "Recommendation Title",
    "description": "Detailed description",
    "action": "Specific action to take",
    "priority": "high|medium|low",
    "estimatedTime": "time estimate",
    "category": "weakness|strength|general|strategy"
  }
]`;

        const result = await model.generateContent(prompt);
        let recommendations;
        
        try {
            let responseText = result.response.text().trim();
            responseText = responseText.replace(/```json\n?/, '').replace(/\n?```/, '');
            recommendations = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing recommendations:', parseError);
            // Fallback recommendations
            recommendations = [
                {
                    title: "Focus on Weak Areas",
                    description: "Spend extra time on topics where you scored lowest",
                    action: "Take practice quizzes in your weakest subjects",
                    priority: "high",
                    estimatedTime: "15-30 minutes daily",
                    category: "weakness"
                },
                {
                    title: "Progressive Difficulty",
                    description: "Gradually increase quiz difficulty as you improve",
                    action: "Start with easy quizzes and work up to expert level",
                    priority: "medium",
                    estimatedTime: "20 minutes per session",
                    category: "strategy"
                }
            ];
        }

        res.json({
            recommendations,
            profile: {
                level: user.level,
                xp: user.xp,
                weakAreas: user.intelligence?.weakAreas || [],
                strongAreas: user.intelligence?.strongAreas || []
            }
        });

    } catch (error) {
        console.error('Error getting study recommendations:', error);
        res.status(500).json({ message: 'Failed to get recommendations' });
    }
});

// AI Response Generation Functions
async function generateQuizResponse(model, session, user, message) {
    const prompt = `The student wants a quiz. Based on their message: "${message}"

Student Context:
- Level: ${user.level}
- Weak Areas: ${session.weakAreas.join(', ') || 'None'}
- Current Topic: ${session.context.currentTopic || 'None'}

Respond encouragingly and ask for specific details:
1. What topic/subject
2. How many questions
3. What difficulty level
4. Any specific focus areas

Keep it conversational and helpful. Offer suggestions based on their weak areas.`;

    const result = await model.generateContent(prompt);
    
    return {
        content: result.response.text(),
        actions: ['generate_quiz']
    };
}

async function generateExplanationResponse(model, session, user, message) {
    const prompt = `The student needs an explanation for: "${message}"

Student Profile:
- Level: ${user.level}
- Learning Style: ${session.learningStyle}

Provide a clear, detailed explanation that:
1. Breaks down the concept simply
2. Uses examples relevant to their level
3. Includes memory aids or tips
4. Suggests related practice

Adapt the explanation style to their learning preference (${session.learningStyle}).`;

    const result = await model.generateContent(prompt);
    
    return {
        content: result.response.text(),
        actions: ['offer_practice', 'suggest_related_topics']
    };
}

async function generateStudyPlanResponse(model, session, user, message) {
    const prompt = `Create a personalized study plan based on: "${message}"

Student Profile:
- Level: ${user.level}
- XP: ${user.xp}
- Weak Areas: ${session.weakAreas.join(', ') || 'None'}
- Available Time: Extract from their message

Create a structured study plan with:
1. Daily/weekly goals
2. Specific topics to cover
3. Practice quiz schedules
4. Progress milestones
5. Motivation strategies

Make it realistic and achievable for their level.`;

    const result = await model.generateContent(prompt);
    
    return {
        content: result.response.text(),
        actions: ['save_study_plan', 'set_reminders']
    };
}

async function generateWeakAreasResponse(model, session, user, message) {
    const prompt = `Help the student with their weak areas. Message: "${message}"

Current Weak Areas: ${session.weakAreas.join(', ') || 'None identified yet'}
Student Level: ${user.level}

Provide:
1. Targeted practice suggestions
2. Learning strategies for weak areas
3. Confidence-building approaches
4. Resources or techniques that can help
5. Gradual improvement plan

Be encouraging and specific about how to improve.`;

    const result = await model.generateContent(prompt);
    
    return {
        content: result.response.text(),
        actions: ['practice_weak_areas', 'track_improvement']
    };
}

async function generateGeneralResponse(model, session, user, message) {
    const recentMessages = session.getRecentContext(5);
    const conversationContext = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

    const prompt = `You are a supportive AI Study Buddy for QuizNest. Respond to: "${message}"

Student Profile:
- Name: ${user.name}
- Level: ${user.level}
- XP: ${user.xp}
- Current Topic: ${session.context.currentTopic || 'None'}
- Weak Areas: ${session.weakAreas.join(', ') || 'None identified'}

Recent Conversation:
${conversationContext}

Respond in a helpful, encouraging way. Offer specific assistance like:
- Generating practice quizzes on specific topics
- Explaining difficult concepts
- Creating study plans
- Analyzing weak areas for improvement
- Motivational study tips

Keep responses conversational, under 150 words, and always offer actionable next steps.
If they ask about generating quizzes, be specific about topics and difficulty levels available.
If they mention struggling with something, offer targeted help and practice suggestions.`;

    const result = await model.generateContent(prompt);
    
    // Analyze the response to suggest relevant actions
    const responseText = result.response.text().toLowerCase();
    const actions = [];
    
    if (responseText.includes('quiz') || responseText.includes('practice')) {
        actions.push('generate_quiz');
    }
    if (responseText.includes('explain') || responseText.includes('concept')) {
        actions.push('explain_concept');
    }
    if (responseText.includes('study plan') || responseText.includes('schedule')) {
        actions.push('create_study_plan');
    }
    if (responseText.includes('weak') || responseText.includes('improve')) {
        actions.push('analyze_weak_areas');
    }
    
    return {
        content: result.response.text(),
        actions: actions.length > 0 ? actions : ['generate_quiz', 'explain_concept']
    };
}

// End study session
router.post('/end-session', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const session = studySessions.get(userId);

        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        // Calculate session summary
        const sessionDuration = (new Date() - session.startTime) / 1000 / 60; // minutes
        const totalMessages = session.messages.length;
        
        // Archive session (in production, save to database)
        const sessionSummary = {
            sessionId: session.sessionId,
            duration: Math.round(sessionDuration),
            messageCount: totalMessages,
            topicsDiscussed: [session.context.currentTopic].filter(Boolean),
            goals: session.context.studyGoals,
            endTime: new Date()
        };

        // Remove from active sessions
        studySessions.delete(userId);

        res.json({
            message: 'Study session ended successfully',
            summary: sessionSummary
        });

    } catch (error) {
        console.error('Error ending study session:', error);
        res.status(500).json({ message: 'Failed to end session' });
    }
});

// Save study plan
router.post('/save-study-plan', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { studyPlanContent, timestamp } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize study plans array if it doesn't exist
        if (!user.studyPlans) {
            user.studyPlans = [];
        }

        // Add new study plan
        user.studyPlans.push({
            content: studyPlanContent,
            createdAt: timestamp || new Date(),
            isActive: true,
            source: 'ai_generated'
        });

        // Keep only the last 5 study plans
        if (user.studyPlans.length > 5) {
            user.studyPlans = user.studyPlans.slice(-5);
        }

        await user.save();

        res.json({
            message: 'Study plan saved successfully! You can view it in your dashboard under "My Study Plans".',
            studyPlanId: user.studyPlans[user.studyPlans.length - 1]._id
        });

    } catch (error) {
        console.error('Error saving study plan:', error);
        res.status(500).json({ message: 'Failed to save study plan' });
    }
});

// Set reminder
router.post('/set-reminder', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { reminderText, context } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize reminders array if it doesn't exist
        if (!user.reminders) {
            user.reminders = [];
        }

        // Add new reminder
        user.reminders.push({
            text: reminderText,
            context: context || 'general',
            createdAt: new Date(),
            isActive: true,
            source: 'ai_study_buddy'
        });

        await user.save();

        res.json({
            message: `Perfect! I've set up your reminder for "${reminderText}". You'll receive notifications as requested.`,
            reminderId: user.reminders[user.reminders.length - 1]._id
        });

    } catch (error) {
        console.error('Error setting reminder:', error);
        res.status(500).json({ message: 'Failed to set reminder' });
    }
});

// Track progress
router.get('/track-progress', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get recent quiz performance
        const recentQuizzes = await Quiz.find({
            'results.userId': userId
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('results');

        // Calculate progress metrics
        const totalQuizzesTaken = recentQuizzes.length;
        const averageScore = recentQuizzes.length > 0 
            ? recentQuizzes.reduce((sum, quiz) => {
                const userResult = quiz.results.find(r => r.userId.toString() === userId);
                return sum + (userResult ? (userResult.score / quiz.totalMarks) * 100 : 0);
            }, 0) / totalQuizzesTaken
            : 0;

        // Get improvement trend (compare first half vs second half of recent quizzes)
        let improvementTrend = 'stable';
        if (totalQuizzesTaken >= 4) {
            const firstHalf = recentQuizzes.slice(Math.ceil(totalQuizzesTaken / 2));
            const secondHalf = recentQuizzes.slice(0, Math.floor(totalQuizzesTaken / 2));
            
            const firstHalfAvg = firstHalf.reduce((sum, quiz) => {
                const userResult = quiz.results.find(r => r.userId.toString() === userId);
                return sum + (userResult ? (userResult.score / quiz.totalMarks) * 100 : 0);
            }, 0) / firstHalf.length;
            
            const secondHalfAvg = secondHalf.reduce((sum, quiz) => {
                const userResult = quiz.results.find(r => r.userId.toString() === userId);
                return sum + (userResult ? (userResult.score / quiz.totalMarks) * 100 : 0);
            }, 0) / secondHalf.length;
            
            if (secondHalfAvg > firstHalfAvg + 5) {
                improvementTrend = 'improving';
            } else if (secondHalfAvg < firstHalfAvg - 5) {
                improvementTrend = 'declining';
            }
        }

        // Generate AI progress report
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Generate a motivational progress report for this student:

Student Profile:
- Name: ${user.name}
- Level: ${user.level}
- Total XP: ${user.xp}
- Quizzes Taken Recently: ${totalQuizzesTaken}
- Average Score: ${averageScore.toFixed(1)}%
- Trend: ${improvementTrend}
- Weak Areas: ${user.intelligence?.weakAreas?.join(', ') || 'None identified'}
- Strong Areas: ${user.intelligence?.strongAreas?.join(', ') || 'None identified'}

Create an encouraging progress report that:
1. Acknowledges their efforts and achievements
2. Highlights specific improvements or areas of strength
3. Provides actionable suggestions for continued growth
4. Sets realistic goals for the next steps
5. Motivates them to keep learning

Keep it positive, specific, and under 200 words.`;

        const result = await model.generateContent(prompt);
        const progressReport = result.response.text();

        res.json({
            progressReport,
            metrics: {
                totalQuizzesTaken,
                averageScore: Math.round(averageScore * 10) / 10,
                improvementTrend,
                currentLevel: user.level,
                totalXP: user.xp,
                weakAreas: user.intelligence?.weakAreas || [],
                strongAreas: user.intelligence?.strongAreas || []
            }
        });

    } catch (error) {
        console.error('Error tracking progress:', error);
        res.status(500).json({ message: 'Failed to track progress' });
    }
});

export default router;
