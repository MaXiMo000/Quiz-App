import mongoose from 'mongoose';
import { LearningPath, UserPathProgress, Competency, UserCompetency } from '../models/LearningPath.js';

// Seed learning paths with comprehensive data
async function seedLearningPaths() {
    try {
        console.log('🌱 Starting learning path seeding...');
        
        // Clear existing data
        await LearningPath.deleteMany({});
        await Competency.deleteMany({});
        console.log('🧹 Cleared existing learning paths and competencies');
        
        // Create competencies first
        const competencies = await createCompetencies();
        console.log(`✅ Created ${competencies.length} competencies`);
        
        // Create learning paths
        const learningPaths = await createLearningPaths(competencies);
        console.log(`✅ Created ${learningPaths.length} learning paths`);
        
        console.log('🎉 Learning path seeding completed successfully!');
        return { competencies, learningPaths };
        
    } catch (error) {
        console.error('❌ Error seeding learning paths:', error);
        throw error;
    }
}

// Create competencies
async function createCompetencies() {
    const competencyData = [
        // JavaScript Competencies
        { 
            name: 'JavaScript Fundamentals', 
            category: 'JavaScript',
            description: 'Basic JavaScript syntax, variables, and data types',
            level: 'foundational',
            prerequisites: []
        },
        { 
            name: 'DOM Manipulation', 
            category: 'JavaScript',
            description: 'Interacting with HTML elements using JavaScript',
            level: 'intermediate',
            prerequisites: ['JavaScript Fundamentals']
        },
        { 
            name: 'Asynchronous JavaScript', 
            category: 'JavaScript',
            description: 'Promises, async/await, and API interactions',
            level: 'advanced',
            prerequisites: ['JavaScript Fundamentals', 'DOM Manipulation']
        },
        
        // React Competencies
        { 
            name: 'React Components', 
            category: 'React',
            description: 'Building and managing React components',
            level: 'foundational',
            prerequisites: ['JavaScript Fundamentals']
        },
        { 
            name: 'State Management', 
            category: 'React',
            description: 'Managing application state in React',
            level: 'intermediate',
            prerequisites: ['React Components']
        },
        { 
            name: 'Advanced React', 
            category: 'React',
            description: 'Advanced React patterns and optimization',
            level: 'advanced',
            prerequisites: ['State Management']
        },
        
        // Python Competencies
        { 
            name: 'Python Basics', 
            category: 'Python',
            description: 'Python syntax and basic programming concepts',
            level: 'foundational',
            prerequisites: []
        },
        { 
            name: 'Object-Oriented Python', 
            category: 'Python',
            description: 'Classes, inheritance, and OOP principles',
            level: 'intermediate',
            prerequisites: ['Python Basics']
        },
        { 
            name: 'Python Libraries', 
            category: 'Python',
            description: 'Working with popular Python libraries',
            level: 'advanced',
            prerequisites: ['Python Basics', 'Object-Oriented Python']
        },
        
        // Web Development Competencies
        { 
            name: 'HTML & CSS', 
            category: 'Web Development',
            description: 'Structuring and styling web pages',
            level: 'foundational',
            prerequisites: []
        },
        { 
            name: 'Advanced CSS', 
            category: 'Web Development',
            description: 'Advanced CSS techniques and frameworks',
            level: 'intermediate',
            prerequisites: ['HTML & CSS']
        },
        
        // Algorithms Competencies
        { 
            name: 'Basic Algorithms', 
            category: 'Algorithms',
            description: 'Fundamental algorithms and problem-solving',
            level: 'foundational',
            prerequisites: []
        },
        { 
            name: 'Data Structures', 
            category: 'Algorithms',
            description: 'Common data structures and their applications',
            level: 'intermediate',
            prerequisites: ['Basic Algorithms']
        },
        { 
            name: 'Advanced Algorithms', 
            category: 'Algorithms',
            description: 'Complex algorithms and optimization techniques',
            level: 'advanced',
            prerequisites: ['Data Structures']
        }
    ];
    
    const competencies = await Competency.insertMany(competencyData);
    return competencies;
}

// Create learning paths
async function createLearningPaths(competencies) {
    const learningPathsData = [
        // JavaScript Learning Path
        {
            title: 'JavaScript Fundamentals',
            description: 'Master the basics of JavaScript programming from variables to functions',
            category: 'Programming',
            subject: 'JavaScript',
            level: 'beginner',
            estimatedDuration: 40,
            tags: ['javascript', 'programming', 'fundamentals', 'beginner'],
            objectives: [
                {
                    id: 'js-vars-mastery',
                    title: 'Variable Declaration Mastery',
                    description: 'Understand JavaScript variables and data types',
                    measurable: true,
                    targetScore: 85,
                    priority: 1
                },
                {
                    id: 'js-control-flow',
                    title: 'Control Flow Mastery',
                    description: 'Learn control flow with conditionals and loops',
                    measurable: true,
                    targetScore: 80,
                    priority: 2
                },
                {
                    id: 'js-functions-mastery',
                    title: 'Function Usage Mastery',
                    description: 'Master function declaration and usage',
                    measurable: true,
                    targetScore: 85,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'variables',
                    title: 'Variables & Data Types',
                    description: 'Learn about variables, strings, numbers, and booleans',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 180,
                    competencies: ['variables', 'data-types'],
                    resources: [
                        { type: 'article', title: 'JavaScript Variables Guide', url: '#' },
                        { type: 'video', title: 'Data Types Explained', url: '#' }
                    ]
                },
                {
                    id: 'operators',
                    title: 'Operators',
                    description: 'Arithmetic, comparison, and logical operators',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 250, y: 100 },
                    prerequisites: ['variables'],
                    estimatedTime: 120,
                    competencies: ['operators'],
                    resources: [
                        { type: 'article', title: 'JavaScript Operators', url: '#' }
                    ]
                },
                {
                    id: 'conditionals',
                    title: 'Conditionals',
                    description: 'If statements, switch cases, and ternary operators',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 200 },
                    prerequisites: ['operators'],
                    estimatedTime: 180,
                    competencies: ['conditionals'],
                    resources: [
                        { type: 'exercise', title: 'Conditional Logic Practice', url: '#' }
                    ]
                },
                {
                    id: 'loops',
                    title: 'Loops',
                    description: 'For loops, while loops, and iteration',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 250, y: 200 },
                    prerequisites: ['conditionals'],
                    estimatedTime: 240,
                    competencies: ['loops'],
                    resources: [
                        { type: 'video', title: 'Mastering JavaScript Loops', url: '#' }
                    ]
                },
                {
                    id: 'functions',
                    title: 'Functions',
                    description: 'Function declaration, parameters, and return values',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 175, y: 300 },
                    prerequisites: ['loops'],
                    estimatedTime: 300,
                    competencies: ['functions'],
                    resources: [
                        { type: 'article', title: 'JavaScript Functions Deep Dive', url: '#' },
                        { type: 'exercise', title: 'Function Challenges', url: '#' }
                    ]
                },
                {
                    id: 'js-fundamentals-test',
                    title: 'Fundamentals Assessment',
                    description: 'Test your JavaScript fundamentals knowledge',
                    type: 'assessment',
                    difficulty: 'beginner',
                    position: { x: 175, y: 400 },
                    prerequisites: ['functions'],
                    estimatedTime: 120,
                    competencies: ['assessment'],
                    resources: [
                        { type: 'quiz', title: 'JavaScript Fundamentals Quiz', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'JavaScript Fundamentals')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },
        
        // React Learning Path
        {
            title: 'React Fundamentals',
            description: 'Learn React from the ground up - components, JSX, props, and state',
            category: 'Web Development',
            subject: 'React',
            level: 'beginner',
            estimatedDuration: 35,
            tags: ['react', 'frontend', 'components', 'jsx'],
            objectives: [
                {
                    id: 'react-components-mastery',
                    title: 'React Components Mastery',
                    description: 'Understand React components and JSX',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'react-state-mastery',
                    title: 'State Management Mastery',
                    description: 'Learn to manage props and state',
                    measurable: true,
                    targetScore: 85,
                    priority: 2
                },
                {
                    id: 'react-events-mastery',
                    title: 'Event Handling Mastery',
                    description: 'Handle events in React applications',
                    measurable: true,
                    targetScore: 80,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'jsx-basics',
                    title: 'JSX & Components',
                    description: 'Introduction to JSX syntax and React components',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 240,
                    competencies: ['jsx', 'components'],
                    resources: [
                        { type: 'article', title: 'JSX Introduction', url: '#' },
                        { type: 'video', title: 'React Components Explained', url: '#' }
                    ]
                },
                {
                    id: 'props',
                    title: 'Props',
                    description: 'Passing data between components with props',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 250, y: 100 },
                    prerequisites: ['jsx-basics'],
                    estimatedTime: 180,
                    competencies: ['props'],
                    resources: [
                        { type: 'exercise', title: 'Props Practice', url: '#' }
                    ]
                },
                {
                    id: 'state',
                    title: 'State Management',
                    description: 'Managing component state with useState hook',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 175, y: 200 },
                    prerequisites: ['props'],
                    estimatedTime: 300,
                    competencies: ['state'],
                    resources: [
                        { type: 'video', title: 'useState Hook Tutorial', url: '#' }
                    ]
                },
                {
                    id: 'events',
                    title: 'Event Handling',
                    description: 'Handling user interactions and events',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 100, y: 300 },
                    prerequisites: ['state'],
                    estimatedTime: 180,
                    competencies: ['events'],
                    resources: [
                        { type: 'exercise', title: 'Event Handling Practice', url: '#' }
                    ]
                },
                {
                    id: 'react-project',
                    title: 'Mini Project',
                    description: 'Build a simple React application',
                    type: 'project',
                    difficulty: 'intermediate',
                    position: { x: 250, y: 300 },
                    prerequisites: ['events'],
                    estimatedTime: 480,
                    competencies: ['project'],
                    resources: [
                        { type: 'article', title: 'Todo App Project Guide', url: '#' }
                    ]
                }
            ],
            competencies: [
                competencies.find(c => c.name === 'React Components')?._id,
                competencies.find(c => c.name === 'State Management')?._id
            ].filter(Boolean),
            prerequisites: [competencies.find(c => c.name === 'JavaScript Fundamentals')?._id].filter(Boolean),
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },
        
        // Python Learning Path
        {
            title: 'Python Programming Basics',
            description: 'Start your Python journey with syntax, data structures, and basic programming concepts',
            category: 'Programming',
            subject: 'Python',
            level: 'beginner',
            estimatedDuration: 45,
            tags: ['python', 'programming', 'basics', 'syntax'],
            objectives: [
                {
                    id: 'python-syntax-mastery',
                    title: 'Python Syntax Mastery',
                    description: 'Learn Python syntax and basic operations',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'python-structures-mastery',
                    title: 'Data Structures Mastery',
                    description: 'Understand Python data structures',
                    measurable: true,
                    targetScore: 85,
                    priority: 2
                },
                {
                    id: 'python-functions-mastery',
                    title: 'Functions Mastery',
                    description: 'Write functions and handle exceptions',
                    measurable: true,
                    targetScore: 85,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'python-syntax',
                    title: 'Python Syntax',
                    description: 'Basic Python syntax, variables, and print statements',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 180,
                    competencies: ['syntax'],
                    resources: [
                        { type: 'article', title: 'Python Syntax Guide', url: '#' }
                    ]
                },
                {
                    id: 'data-types',
                    title: 'Data Types',
                    description: 'Numbers, strings, lists, and dictionaries',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 250, y: 100 },
                    prerequisites: ['python-syntax'],
                    estimatedTime: 240,
                    competencies: ['data-types'],
                    resources: [
                        { type: 'video', title: 'Python Data Types', url: '#' }
                    ]
                },
                {
                    id: 'control-flow',
                    title: 'Control Flow',
                    description: 'If statements, loops, and control structures',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 175, y: 200 },
                    prerequisites: ['data-types'],
                    estimatedTime: 300,
                    competencies: ['control-flow'],
                    resources: [
                        { type: 'exercise', title: 'Control Flow Exercises', url: '#' }
                    ]
                },
                {
                    id: 'python-functions',
                    title: 'Functions',
                    description: 'Defining and calling functions in Python',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 300 },
                    prerequisites: ['control-flow'],
                    estimatedTime: 240,
                    competencies: ['functions'],
                    resources: [
                        { type: 'article', title: 'Python Functions', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'Python Basics')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },
        
        // Web Development Path
        {
            title: 'Web Development Fundamentals',
            description: 'Learn HTML, CSS, and basic web development principles',
            category: 'Web Development',
            subject: 'Web Development',
            level: 'beginner',
            estimatedDuration: 30,
            tags: ['html', 'css', 'web', 'frontend'],
            objectives: [
                {
                    id: 'html-mastery',
                    title: 'HTML Structure Mastery',
                    description: 'Structure web pages with HTML',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'css-mastery',
                    title: 'CSS Styling Mastery',
                    description: 'Style elements with CSS',
                    measurable: true,
                    targetScore: 85,
                    priority: 2
                },
                {
                    id: 'responsive-mastery',
                    title: 'Responsive Design Mastery',
                    description: 'Create responsive layouts',
                    measurable: true,
                    targetScore: 80,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'html-basics',
                    title: 'HTML Structure',
                    description: 'Basic HTML tags and document structure',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 240,
                    competencies: ['html'],
                    resources: [
                        { type: 'article', title: 'HTML Basics', url: '#' }
                    ]
                },
                {
                    id: 'css-styling',
                    title: 'CSS Styling',
                    description: 'Basic CSS properties and selectors',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 250, y: 100 },
                    prerequisites: ['html-basics'],
                    estimatedTime: 300,
                    competencies: ['css'],
                    resources: [
                        { type: 'video', title: 'CSS Fundamentals', url: '#' }
                    ]
                },
                {
                    id: 'layouts',
                    title: 'CSS Layouts',
                    description: 'Flexbox and basic grid layouts',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 175, y: 200 },
                    prerequisites: ['css-styling'],
                    estimatedTime: 360,
                    competencies: ['layouts'],
                    resources: [
                        { type: 'exercise', title: 'Layout Challenges', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'HTML & CSS')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },
        
        // Algorithms Path
        {
            title: 'Algorithm Fundamentals',
            description: 'Learn basic algorithms and problem-solving techniques',
            category: 'Computer Science',
            subject: 'Algorithms',
            level: 'intermediate',
            estimatedDuration: 50,
            tags: ['algorithms', 'data-structures', 'problem-solving'],
            objectives: [
                {
                    id: 'complexity-mastery',
                    title: 'Complexity Analysis Mastery',
                    description: 'Understand basic algorithm complexity',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'sorting-mastery',
                    title: 'Sorting Algorithms Mastery',
                    description: 'Learn searching techniques',
                    measurable: true,
                    targetScore: 85,
                    priority: 2
                },
                {
                    id: 'problem-solving-mastery',
                    title: 'Problem Solving Mastery',
                    description: 'Solve algorithmic problems',
                    measurable: true,
                    targetScore: 85,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'complexity',
                    title: 'Time Complexity',
                    description: 'Understanding Big O notation and algorithm analysis',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 240,
                    competencies: ['complexity'],
                    resources: [
                        { type: 'article', title: 'Big O Notation Guide', url: '#' }
                    ]
                },
                {
                    id: 'sorting',
                    title: 'Sorting Algorithms',
                    description: 'Bubble sort, selection sort, and merge sort',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 250, y: 100 },
                    prerequisites: ['complexity'],
                    estimatedTime: 360,
                    competencies: ['sorting'],
                    resources: [
                        { type: 'video', title: 'Sorting Algorithms Visualized', url: '#' }
                    ]
                },
                {
                    id: 'searching',
                    title: 'Searching Algorithms',
                    description: 'Linear search and binary search',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 175, y: 200 },
                    prerequisites: ['sorting'],
                    estimatedTime: 240,
                    competencies: ['searching'],
                    resources: [
                        { type: 'exercise', title: 'Search Algorithm Practice', url: '#' }
                    ]
                }
            ],
            competencies: [
                competencies.find(c => c.name === 'Basic Algorithms')?._id,
                competencies.find(c => c.name === 'Data Structures')?._id
            ].filter(Boolean),
            prerequisites: [competencies.find(c => c.name === 'JavaScript Fundamentals')?._id].filter(Boolean),
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },

        // Data Science Path
        {
            title: 'Data Science Foundations',
            description: 'Learn data analysis, statistics, and machine learning basics',
            category: 'Data Science',
            subject: 'Data Analysis',
            level: 'intermediate',
            estimatedDuration: 60,
            tags: ['data-science', 'statistics', 'analysis', 'python'],
            objectives: [
                {
                    id: 'statistics-mastery',
                    title: 'Statistics Mastery',
                    description: 'Understand descriptive and inferential statistics',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'data-analysis-mastery',
                    title: 'Data Analysis Mastery',
                    description: 'Learn to analyze and visualize data',
                    measurable: true,
                    targetScore: 85,
                    priority: 2
                },
                {
                    id: 'ml-basics-mastery',
                    title: 'Machine Learning Basics',
                    description: 'Introduction to machine learning concepts',
                    measurable: true,
                    targetScore: 75,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'statistics-basics',
                    title: 'Statistics Fundamentals',
                    description: 'Mean, median, mode, standard deviation',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 300,
                    competencies: ['statistics'],
                    resources: [
                        { type: 'article', title: 'Statistics for Data Science', url: '#' }
                    ]
                },
                {
                    id: 'data-visualization',
                    title: 'Data Visualization',
                    description: 'Creating charts and graphs to represent data',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 250, y: 100 },
                    prerequisites: ['statistics-basics'],
                    estimatedTime: 240,
                    competencies: ['visualization'],
                    resources: [
                        { type: 'exercise', title: 'Plotting with Python', url: '#' }
                    ]
                },
                {
                    id: 'ml-introduction',
                    title: 'Machine Learning Intro',
                    description: 'Supervised vs unsupervised learning',
                    type: 'concept',
                    difficulty: 'advanced',
                    position: { x: 175, y: 200 },
                    prerequisites: ['data-visualization'],
                    estimatedTime: 360,
                    competencies: ['machine-learning'],
                    resources: [
                        { type: 'video', title: 'ML Concepts Explained', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'Python Libraries')?._id].filter(Boolean),
            prerequisites: [competencies.find(c => c.name === 'Python Basics')?._id].filter(Boolean),
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },

        // Mathematics Path
        {
            title: 'Essential Mathematics',
            description: 'Core mathematical concepts for science and engineering',
            category: 'Mathematics',
            subject: 'Mathematics',
            level: 'intermediate',
            estimatedDuration: 70,
            tags: ['mathematics', 'algebra', 'calculus', 'geometry'],
            objectives: [
                {
                    id: 'algebra-mastery',
                    title: 'Algebra Mastery',
                    description: 'Master algebraic equations and functions',
                    measurable: true,
                    targetScore: 85,
                    priority: 1
                },
                {
                    id: 'calculus-basics',
                    title: 'Calculus Fundamentals',
                    description: 'Understanding derivatives and integrals',
                    measurable: true,
                    targetScore: 75,
                    priority: 2
                },
                {
                    id: 'geometry-mastery',
                    title: 'Geometry Applications',
                    description: 'Apply geometric principles to real problems',
                    measurable: true,
                    targetScore: 80,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'algebra-fundamentals',
                    title: 'Algebra Basics',
                    description: 'Linear equations, quadratic functions, polynomials',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 300,
                    competencies: ['algebra'],
                    resources: [
                        { type: 'article', title: 'Algebra Essentials', url: '#' }
                    ]
                },
                {
                    id: 'geometry-basics',
                    title: 'Geometry Principles',
                    description: 'Shapes, angles, area, and volume calculations',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 250, y: 100 },
                    prerequisites: ['algebra-fundamentals'],
                    estimatedTime: 240,
                    competencies: ['geometry'],
                    resources: [
                        { type: 'exercise', title: 'Geometry Problems', url: '#' }
                    ]
                },
                {
                    id: 'calculus-intro',
                    title: 'Introduction to Calculus',
                    description: 'Limits, derivatives, and basic integration',
                    type: 'concept',
                    difficulty: 'advanced',
                    position: { x: 175, y: 200 },
                    prerequisites: ['geometry-basics'],
                    estimatedTime: 420,
                    competencies: ['calculus'],
                    resources: [
                        { type: 'video', title: 'Calculus Made Easy', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'Basic Algorithms')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },

        // Science Path
        {
            title: 'General Science Concepts',
            description: 'Fundamental concepts in physics, chemistry, and biology',
            category: 'Science',
            subject: 'General Science',
            level: 'beginner',
            estimatedDuration: 55,
            tags: ['science', 'physics', 'chemistry', 'biology'],
            objectives: [
                {
                    id: 'physics-basics',
                    title: 'Physics Fundamentals',
                    description: 'Understanding motion, energy, and forces',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'chemistry-basics',
                    title: 'Chemistry Principles',
                    description: 'Atoms, molecules, and chemical reactions',
                    measurable: true,
                    targetScore: 80,
                    priority: 2
                },
                {
                    id: 'biology-basics',
                    title: 'Biology Essentials',
                    description: 'Cells, genetics, and life processes',
                    measurable: true,
                    targetScore: 80,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'physics-fundamentals',
                    title: 'Physics Basics',
                    description: 'Motion, forces, energy, and basic physics laws',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 300,
                    competencies: ['physics'],
                    resources: [
                        { type: 'article', title: 'Physics for Beginners', url: '#' }
                    ]
                },
                {
                    id: 'chemistry-fundamentals',
                    title: 'Chemistry Basics',
                    description: 'Atomic structure, periodic table, chemical bonds',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 250, y: 100 },
                    prerequisites: ['physics-fundamentals'],
                    estimatedTime: 280,
                    competencies: ['chemistry'],
                    resources: [
                        { type: 'video', title: 'Chemistry Explained', url: '#' }
                    ]
                },
                {
                    id: 'biology-fundamentals',
                    title: 'Biology Basics',
                    description: 'Cell structure, DNA, evolution, ecosystems',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 175, y: 200 },
                    prerequisites: ['chemistry-fundamentals'],
                    estimatedTime: 300,
                    competencies: ['biology'],
                    resources: [
                        { type: 'exercise', title: 'Biology Lab Simulations', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'Basic Algorithms')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },

        // History Path
        {
            title: 'World History Overview',
            description: 'Major events and civilizations throughout human history',
            category: 'History',
            subject: 'World History',
            level: 'beginner',
            estimatedDuration: 40,
            tags: ['history', 'civilization', 'culture', 'events'],
            objectives: [
                {
                    id: 'ancient-history',
                    title: 'Ancient Civilizations',
                    description: 'Understanding early human civilizations',
                    measurable: true,
                    targetScore: 80,
                    priority: 1
                },
                {
                    id: 'modern-history',
                    title: 'Modern Era Events',
                    description: 'Key events from 1500 to present',
                    measurable: true,
                    targetScore: 80,
                    priority: 2
                },
                {
                    id: 'cultural-understanding',
                    title: 'Cultural Impact',
                    description: 'How history shaped modern culture',
                    measurable: true,
                    targetScore: 75,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'ancient-civilizations',
                    title: 'Ancient Civilizations',
                    description: 'Egypt, Greece, Rome, and other early societies',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 240,
                    competencies: ['history'],
                    resources: [
                        { type: 'article', title: 'Ancient World Overview', url: '#' }
                    ]
                },
                {
                    id: 'medieval-period',
                    title: 'Medieval Era',
                    description: 'Middle Ages, feudalism, and cultural developments',
                    type: 'concept',
                    difficulty: 'beginner',
                    position: { x: 250, y: 100 },
                    prerequisites: ['ancient-civilizations'],
                    estimatedTime: 240,
                    competencies: ['history'],
                    resources: [
                        { type: 'video', title: 'Medieval Life and Society', url: '#' }
                    ]
                },
                {
                    id: 'modern-era',
                    title: 'Modern History',
                    description: 'Industrial revolution to contemporary times',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 175, y: 200 },
                    prerequisites: ['medieval-period'],
                    estimatedTime: 300,
                    competencies: ['history'],
                    resources: [
                        { type: 'exercise', title: 'Timeline Activities', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'HTML & CSS')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        },

        // Language Learning Path
        {
            title: 'English Language Mastery',
            description: 'Improve grammar, vocabulary, and communication skills',
            category: 'Languages',
            subject: 'English',
            level: 'intermediate',
            estimatedDuration: 45,
            tags: ['english', 'grammar', 'vocabulary', 'communication'],
            objectives: [
                {
                    id: 'grammar-mastery',
                    title: 'Grammar Proficiency',
                    description: 'Master English grammar rules',
                    measurable: true,
                    targetScore: 85,
                    priority: 1
                },
                {
                    id: 'vocabulary-expansion',
                    title: 'Vocabulary Building',
                    description: 'Expand active vocabulary significantly',
                    measurable: true,
                    targetScore: 80,
                    priority: 2
                },
                {
                    id: 'communication-skills',
                    title: 'Communication Excellence',
                    description: 'Effective writing and speaking skills',
                    measurable: true,
                    targetScore: 80,
                    priority: 3
                }
            ],
            nodes: [
                {
                    id: 'grammar-foundations',
                    title: 'Grammar Fundamentals',
                    description: 'Parts of speech, sentence structure, punctuation',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 100, y: 100 },
                    prerequisites: [],
                    estimatedTime: 240,
                    competencies: ['grammar'],
                    resources: [
                        { type: 'article', title: 'English Grammar Guide', url: '#' }
                    ]
                },
                {
                    id: 'vocabulary-building',
                    title: 'Vocabulary Expansion',
                    description: 'Word roots, prefixes, suffixes, context clues',
                    type: 'concept',
                    difficulty: 'intermediate',
                    position: { x: 250, y: 100 },
                    prerequisites: ['grammar-foundations'],
                    estimatedTime: 200,
                    competencies: ['vocabulary'],
                    resources: [
                        { type: 'exercise', title: 'Vocabulary Exercises', url: '#' }
                    ]
                },
                {
                    id: 'writing-skills',
                    title: 'Writing Proficiency',
                    description: 'Essay structure, argument development, style',
                    type: 'project',
                    difficulty: 'advanced',
                    position: { x: 175, y: 200 },
                    prerequisites: ['vocabulary-building'],
                    estimatedTime: 360,
                    competencies: ['writing'],
                    resources: [
                        { type: 'exercise', title: 'Writing Workshop', url: '#' }
                    ]
                }
            ],
            competencies: [competencies.find(c => c.name === 'HTML & CSS')?._id].filter(Boolean),
            prerequisites: [],
            createdBy: {
                _id: null,
                name: 'System'
            },
            isActive: true
        }
    ];
    
    const learningPaths = await LearningPath.insertMany(learningPathsData);
    return learningPaths;
}

export { seedLearningPaths };