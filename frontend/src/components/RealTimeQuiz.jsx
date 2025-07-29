import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from '../utils/axios';
import config from '../config/config';
import NotificationModal from './NotificationModal';
import { useNotification } from '../hooks/useNotification';
import './RealTimeQuiz.css';

const RealTimeQuiz = () => {
    const [socket, setSocket] = useState(null);
    const [socketAuthenticated, setSocketAuthenticated] = useState(false); // Force re-render when auth completes
    const [gameState, setGameState] = useState('menu'); // menu, creating, lobby, playing, results
    const [roomData, setRoomData] = useState(null);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [roomSettings, setRoomSettings] = useState({
        maxPlayers: 6,
        timePerQuestion: 30,
        questionCount: 10
    });
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [playerStats, setPlayerStats] = useState(null);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
    const [quizLoadError, setQuizLoadError] = useState(null);
    const chatRef = useRef(null);
    const timerRef = useRef(null);

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    useEffect(() => {
        loadQuizzes();
        loadPlayerStats();
        loadAvailableRooms();
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        console.log('Quizzes updated:', quizzes.length, 'quizzes loaded');
    }, [quizzes]);

    // Centralized socket event handler setup
    const setupSocketHandlers = (socketInstance) => {
        // Remove any existing listeners first to prevent duplicates
        socketInstance.off('room_created');
        socketInstance.off('room_joined');
        socketInstance.off('player_joined');
        socketInstance.off('player_left');
        socketInstance.off('host_changed');
        socketInstance.off('new_question');
        socketInstance.off('answer_submitted');
        socketInstance.off('question_results');
        socketInstance.off('quiz_finished');
        socketInstance.off('chat_message');
        socketInstance.off('error');

        // Add event listeners
        socketInstance.on('room_created', handleRoomCreated);
        socketInstance.on('room_joined', handleRoomJoined);
        socketInstance.on('player_joined', handlePlayerJoined);
        socketInstance.on('player_left', handlePlayerLeft);
        socketInstance.on('host_changed', handleHostChanged);
        socketInstance.on('new_question', handleNewQuestion);
        socketInstance.on('answer_submitted', handleAnswerSubmitted);
        socketInstance.on('question_results', handleQuestionResults);
        socketInstance.on('quiz_finished', handleQuizFinished);
        socketInstance.on('chat_message', handleChatMessage);
        socketInstance.on('error', handleError);
    };

    useEffect(() => {
        if (socket && socket.on && typeof socket.on === 'function' && !socket.handlersSetup) {
            setupSocketHandlers(socket);
            socket.handlersSetup = true; // Mark that handlers are set up
            
            return () => {
                if (socket && socket.off && typeof socket.off === 'function') {
                    socket.off('room_created');
                    socket.off('room_joined');
                    socket.off('player_joined');
                    socket.off('player_left');
                    socket.off('host_changed');
                    socket.off('new_question');
                    socket.off('answer_submitted');
                    socket.off('question_results');
                    socket.off('quiz_finished');
                    socket.off('chat_message');
                    socket.off('error');
                    socket.handlersSetup = false;
                }
            };
        }
    }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

    const connectSocket = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showError('Please login to play multiplayer quizzes', false);
            return;
        }

        // Don't create a new socket if one already exists and is connected
        if (socket && socket.connected && socketAuthenticated) {
            return;
        }

        // Clear existing socket if any
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            setSocket(null);
            setSocketAuthenticated(false);
        }

        const newSocket = io(config.BACKEND_URL, {
            auth: { token },
            forceNew: true // Ensure we get a fresh connection
        });

        // Add authentication success handler first
        newSocket.on('authenticated', (userInfo) => {
            newSocket.userInfo = userInfo;
            setSocketAuthenticated(true);
        });

        newSocket.on('connect', () => {
            setSocket(newSocket);
            setSocketAuthenticated(false);
            showSuccess('Connected to quiz server! 🎮');
        });

        newSocket.on('disconnect', () => {
            setSocket(null);
            setSocketAuthenticated(false);
            setGameState('menu');
            showWarning('Disconnected from server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            showError('Failed to connect to server. Please check your connection.');
        });
    };

    const loadQuizzes = async (showNotifications = false) => {
        try {
            setIsLoadingQuizzes(true);
            setQuizLoadError(null);
            const response = await axios.get('/api/quizzes');
            setQuizzes(response.data || []);
            
            if (showNotifications) {
                if (response.data && response.data.length > 0) {
                    showSuccess(`✅ ${response.data.length} quizzes loaded successfully!`);
                } else {
                    showWarning('No quizzes available at the moment');
                }
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
            setQuizLoadError('Failed to load quizzes. Please try again.');
            setQuizzes([]);
            if (showNotifications) {
                showError('Failed to load quizzes. Please check your connection and try again.');
            }
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    const loadPlayerStats = async () => {
        try {
            const response = await axios.get('/api/real-time-quiz/stats');
            setPlayerStats(response.data.stats);
        } catch (error) {
            console.error('Error loading player stats:', error);
            // Set default stats if API fails
            setPlayerStats({
                multiplayerGames: 0,
                multiplayerWins: 0,
                averageScore: 0,
                favoriteCategory: 'General',
                winRate: 0
            });
        }
    };

    const loadAvailableRooms = async (showNotifications = false) => {
        try {
            const response = await axios.get('/api/real-time-quiz/active-rooms');
            setAvailableRooms(response.data.rooms || []);
            
            if (showNotifications && response.data.rooms && response.data.rooms.length > 0) {
                showSuccess(`🏠 Found ${response.data.rooms.length} active rooms`);
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
            setAvailableRooms([]);
            if (showNotifications) {
                showError('Failed to load active rooms');
            }
        }
    };

    // Socket event handlers  
    const handleRoomCreated = (data) => {
        setRoomData(data.room);
        setGameState('lobby');
        setChatMessages([]);
        showSuccess('Room created successfully! 🎉');
    };

    const handleRoomJoined = (data) => {
        setRoomData(data.room);
        setGameState('lobby');
        setChatMessages([]);
        showSuccess('Successfully joined the room! 🎮');
    };

    const handlePlayerJoined = (data) => {
        setRoomData(prev => ({
            ...prev,
            players: data.players,
            playerCount: data.playerCount
        }));
        
        setChatMessages(prev => [...prev, {
            type: 'system',
            message: `${data.player.name} joined the room`,
            timestamp: new Date()
        }]);
    };

    const handlePlayerLeft = (data) => {
        setRoomData(prev => ({
            ...prev,
            players: data.players,
            playerCount: data.playerCount
        }));
        
        setChatMessages(prev => [...prev, {
            type: 'system',
            message: `${data.playerName} left the room`,
            timestamp: new Date()
        }]);
    };

    const handleHostChanged = (data) => {
        setRoomData(prev => ({
            ...prev,
            hostId: data.newHostId
        }));
        
        setChatMessages(prev => [...prev, {
            type: 'system',
            message: `${data.newHostName} is now the host`,
            timestamp: new Date()
        }]);
    };

    const handleNewQuestion = (data) => {
        setCurrentQuestion(data);
        setSelectedAnswer(null);
        setTimeLeft(data.timeLimit);
        setGameState('playing');
        
        if (data.questionIndex === 0) {
            showSuccess('Quiz started! Good luck! 🍀');
        }
        
        // Start timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleAnswerSubmitted = (data) => {
        setChatMessages(prev => [...prev, {
            type: 'system',
            message: `${data.playerName} submitted their answer (${data.answeredCount}/${data.totalPlayers})`,
            timestamp: new Date()
        }]);
    };

    const handleQuestionResults = (data) => {
        setLeaderboard(data.leaderboard);
        setGameState('question-results');
        
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        // Show results for a few seconds, then auto-advance
        setTimeout(() => {
            if (data.questionIndex < roomData.quiz.questionCount - 1) {
                setGameState('waiting-next');
            }
        }, 5000);
    };

    const handleQuizFinished = (data) => {
        setLeaderboard(data.leaderboard);
        setGameState('final-results');
        
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        // Reload player stats immediately after quiz completion
        loadPlayerStats();
        
        // Show congratulations based on position
        const userPosition = data.leaderboard.findIndex(player => player.isCurrentUser) + 1;
        if (userPosition === 1) {
            showSuccess('🎉 Congratulations! You won! 🏆');
        } else if (userPosition <= 3) {
            showSuccess(`🎉 Great job! You finished ${userPosition}${userPosition === 2 ? 'nd' : 'rd'} place! 🥉`);
        } else {
            showSuccess('Quiz completed! Well played! 👏');
        }
    };

    const handleChatMessage = (data) => {
        setChatMessages(prev => [...prev, {
            type: 'chat',
            playerId: data.playerId,
            playerName: data.playerName,
            message: data.message,
            timestamp: data.timestamp
        }]);
        
        // Auto-scroll chat
        setTimeout(() => {
            if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleError = (data) => {
        showError(data.message || 'An error occurred', false);
        console.error('Socket error:', data);
    };

    // Game actions
    const createRoom = async () => {
        if (!selectedQuiz) {
            showError('Please select a quiz first');
            return;
        }
        
        // If no socket or not authenticated, connect first
        if (!socket || !socketAuthenticated) {
            showWarning('Connecting to server...');
            
            const token = localStorage.getItem('token');
            if (!token) {
                showError('Please login to play multiplayer quizzes', false);
                return;
            }

            // Clear existing socket if any
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
                setSocket(null);
                setSocketAuthenticated(false);
            }

            const newSocket = io(config.BACKEND_URL, {
                auth: { token },
                forceNew: true
            });

            // Wait for authentication and then create room
            newSocket.on('authenticated', (userInfo) => {
                newSocket.userInfo = userInfo;
                setSocketAuthenticated(true);
                
                // Set up socket handlers for the new socket
                setupSocketHandlers(newSocket);
                newSocket.handlersSetup = true;
                
                // Create room immediately after authentication
                newSocket.emit('create_room', {
                    quizId: selectedQuiz._id,
                    settings: roomSettings
                });
            });

            newSocket.on('connect', () => {
                setSocket(newSocket);
                showSuccess('Connected to quiz server! 🎮');
            });

            newSocket.on('disconnect', () => {
                setSocket(null);
                setSocketAuthenticated(false);
                setGameState('menu');
                showWarning('Disconnected from server');
            });

            newSocket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                showError('Failed to connect to server. Please check your connection.');
            });

            return;
        }

        // Socket exists and is authenticated, create room directly
        socket.emit('create_room', {
            quizId: selectedQuiz._id,
            settings: roomSettings
        });
    };

    const joinRoom = async (roomId) => {
        // If no socket or not authenticated, connect first
        if (!socket || !socketAuthenticated) {
            showWarning('Connecting to server...');
            
            const token = localStorage.getItem('token');
            if (!token) {
                showError('Please login to play multiplayer quizzes', false);
                return;
            }

            // Clear existing socket if any
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
                setSocket(null);
                setSocketAuthenticated(false);
            }

            const newSocket = io(config.BACKEND_URL, {
                auth: { token },
                forceNew: true
            });

            // Wait for authentication and then join room
            newSocket.on('authenticated', (userInfo) => {
                newSocket.userInfo = userInfo;
                setSocketAuthenticated(true);
                
                // Set up socket handlers for the new socket
                setupSocketHandlers(newSocket);
                newSocket.handlersSetup = true;
                
                // Join room immediately after authentication
                showWarning('Joining room...');
                newSocket.emit('join_room', { roomId });
            });

            newSocket.on('connect', () => {
                setSocket(newSocket);
                showSuccess('Connected to quiz server! 🎮');
            });

            newSocket.on('disconnect', () => {
                setSocket(null);
                setSocketAuthenticated(false);
                setGameState('menu');
                showWarning('Disconnected from server');
            });

            newSocket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                showError('Failed to connect to server. Please check your connection.');
            });

            return;
        }

        // Socket exists and is authenticated, join room directly
        showWarning('Joining room...');
        socket.emit('join_room', { roomId });
    };

    const startQuiz = () => {
        if (socket && roomData) {
            console.log('Starting quiz...', { 
                roomData: roomData,
                playerCount: roomData.playerCount,
                hostId: roomData.hostId,
                currentUserId: socket.userInfo?.id,
                isHost: roomData.hostId === socket.userInfo?.id
            });
            socket.emit('start_quiz');
            showSuccess('Starting quiz... Get ready! 🎯');
        } else {
            console.error('Cannot start quiz - missing socket or room data', { socket, roomData });
            showError('Unable to start quiz. Please try again.');
        }
    };

    const submitAnswer = (answerIndex) => {
        if (selectedAnswer !== null || !socket) return;
        
        setSelectedAnswer(answerIndex);
        
        const timeSpent = roomSettings.timePerQuestion - timeLeft;
        socket.emit('submit_answer', {
            answer: answerIndex,
            timeSpent: timeSpent
        });
        
        showSuccess(`Answer submitted! ✅`);
    };

    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave_room');
        }
        setGameState('menu');
        setRoomData(null);
        setCurrentQuestion(null);
        setChatMessages([]);
        setLeaderboard([]);
        showSuccess('Left the room successfully');
    };

    const sendChatMessage = () => {
        if (!chatInput.trim() || !socket) return;
        
        socket.emit('chat_message', { message: chatInput });
        setChatInput('');
    };

    // Render functions
    const renderMainMenu = () => (
        <div className="real-time-quiz-menu">
            <motion.div
                className="menu-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1>🎮 Real-Time Quiz Battles</h1>
                <p>Challenge friends and players worldwide in live quiz competitions!</p>
            </motion.div>

            {playerStats && (
                <motion.div
                    className="player-stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h3>Your Stats</h3>
                    <div className="stats-grid">
                        <div className="stat">
                            <span className="stat-value">{playerStats.multiplayerGames}</span>
                            <span className="stat-label">Games Played</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{playerStats.multiplayerWins}</span>
                            <span className="stat-label">Wins</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">
                                {playerStats.multiplayerGames === 0 ? '0' : `${playerStats.winRate}%`}
                            </span>
                            <span className="stat-label">Win Rate</span>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="menu-sections">
                <motion.div
                    className="menu-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3>Create Room</h3>
                    <div className="section-header">
                        <span></span>
                        <button onClick={() => loadQuizzes(true)} className="refresh-btn">
                            🔄 Refresh Quizzes
                        </button>
                    </div>
                    <div className="create-room-form">
                        <div className="form-group">
                            <label>Select Quiz: {!isLoadingQuizzes && `(${quizzes.length} available)`}</label>
                            <select
                                value={selectedQuiz?._id || ''}
                                onChange={(e) => {
                                    const quiz = quizzes.find(q => q._id === e.target.value);
                                    setSelectedQuiz(quiz);
                                }}
                                disabled={isLoadingQuizzes}
                            >
                                <option value="" disabled>
                                    {isLoadingQuizzes ? 'Loading quizzes...' : 
                                     quizLoadError ? 'Failed to load quizzes' :
                                     quizzes.length === 0 ? 'No quizzes available' :
                                     'Choose a quiz...'}
                                </option>
                                {!isLoadingQuizzes && !quizLoadError && quizzes.map(quiz => (
                                    <option key={quiz._id} value={quiz._id}>
                                        {quiz.title} - {quiz.category} ({quiz.questions?.length || 0} questions)
                                    </option>
                                ))}
                            </select>
                            {quizLoadError && (
                                <div className="error-message">
                                    <p>{quizLoadError}</p>
                                    <button onClick={() => loadQuizzes(true)} className="retry-btn">Retry</button>
                                </div>
                            )}
                            {selectedQuiz && (
                                <div className="quiz-info">
                                    <p><strong>Category:</strong> {selectedQuiz.category}</p>
                                    <p><strong>Questions:</strong> {selectedQuiz.questions?.length || 0}</p>
                                    <p><strong>Duration:</strong> {selectedQuiz.duration} minutes</p>
                                    <p><strong>Total Marks:</strong> {selectedQuiz.totalMarks}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="settings-grid">
                            <div className="form-group">
                                <label>Max Players:</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="8"
                                    value={roomSettings.maxPlayers || 6}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value >= 2 && value <= 8) {
                                            setRoomSettings(prev => ({
                                                ...prev,
                                                maxPlayers: value
                                            }));
                                        }
                                    }}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Time per Question (sec):</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="120"
                                    value={roomSettings.timePerQuestion || 30}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value >= 10 && value <= 120) {
                                            setRoomSettings(prev => ({
                                                ...prev,
                                                timePerQuestion: value
                                            }));
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        
                        <motion.button
                            className="create-room-btn"
                            onClick={createRoom}
                            disabled={!selectedQuiz || isLoadingQuizzes}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isLoadingQuizzes ? 'Loading...' : 'Create Room 🚀'}
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div
                    className="menu-section"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="section-header">
                        <h3>Join Room</h3>
                        <button 
                            className="refresh-btn"
                            onClick={() => loadAvailableRooms(true)}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                    
                    <div className="available-rooms">
                        {availableRooms.length === 0 ? (
                            <p className="no-rooms">No active rooms found. Create one to get started!</p>
                        ) : (
                            availableRooms.map(room => (
                                <motion.div
                                    key={room.id}
                                    className="room-card"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => joinRoom(room.id)}
                                >
                                    <div className="room-info">
                                        <h4>{room.quizTitle}</h4>
                                        <p>Host: {room.hostName}</p>
                                        <p>{room.playerCount}/{room.maxPlayers} players</p>
                                    </div>
                                    <div className="room-status">
                                        <span className="status-indicator"></span>
                                        Waiting
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );

    const renderLobby = () => (
        <div className="quiz-lobby">
            <div className="lobby-header">
                <div className="room-info">
                    <h2>Room: {roomData.id}</h2>
                    <p>{roomData.quiz.title} • {roomData.quiz.questionCount} questions</p>
                </div>
                <button className="leave-btn" onClick={leaveRoom}>
                    Leave Room
                </button>
            </div>

            <div className="lobby-content">
                <div className="players-section">
                    <h3>Players ({roomData.playerCount}/{roomData.settings.maxPlayers})</h3>
                    <div className="players-grid">
                        {roomData.players.map((player, index) => (
                            <motion.div
                                key={player.id}
                                className={`player-card ${player.id === roomData.hostId ? 'host' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="player-avatar">{player.avatar}</div>
                                <div className="player-info">
                                    <div className="player-name">
                                        {player.name}
                                        {player.id === roomData.hostId && <span className="host-badge">👑</span>}
                                    </div>
                                    <div className="player-level">Level {player.level}</div>
                                </div>
                            </motion.div>
                        ))}
                        
                        {/* Empty slots */}
                        {Array.from({ length: roomData.settings.maxPlayers - roomData.playerCount }).map((_, index) => (
                            <div key={`empty-${index}`} className="player-card empty">
                                <div className="empty-slot">Waiting for player...</div>
                            </div>
                        ))}
                    </div>

                    {!socket && (
                        <motion.button
                            className="start-quiz-btn"
                            onClick={connectSocket}
                            style={{ background: '#667eea', marginBottom: '10px' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Connect to Server 🔌
                        </motion.button>
                    )}

                    {roomData && roomData.hostId && socket && socket.userInfo && socketAuthenticated && (
                        roomData.hostId === socket.userInfo.id
                    ) && (
                        <motion.button
                            className="start-quiz-btn"
                            onClick={startQuiz}
                            disabled={roomData.playerCount < 2}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {roomData.playerCount < 2 ? 'Need at least 2 players' : 'Start Quiz! 🎯'}
                        </motion.button>
                    )}
                </div>

                <div className="chat-section">
                    <h3>Chat</h3>
                    <div className="chat-messages" ref={chatRef}>
                        {chatMessages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.type}`}>
                                {msg.type === 'chat' ? (
                                    <>
                                        <span className="chat-author">{msg.playerName}:</span>
                                        <span className="chat-text">{msg.message}</span>
                                    </>
                                ) : (
                                    <span className="system-message">{msg.message}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="chat-input">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Type a message..."
                            maxLength={100}
                        />
                        <button onClick={sendChatMessage}>Send</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderQuestionPhase = () => (
        <div className="quiz-playing">
            <div className="question-header">
                <div className="question-progress">
                    Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}
                </div>
                <div className="timer">
                    <div className="timer-circle">
                        <span>{timeLeft}</span>
                    </div>
                </div>
            </div>

            <motion.div
                className="question-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2>{currentQuestion.question.question}</h2>
                
                <div className="options-grid">
                    {currentQuestion.question.options.map((option, index) => (
                        <motion.button
                            key={index}
                            className={`option-btn ${selectedAnswer === index ? 'selected' : ''}`}
                            onClick={() => submitAnswer(index)}
                            disabled={selectedAnswer !== null}
                            whileHover={{ scale: selectedAnswer === null ? 1.02 : 1 }}
                            whileTap={{ scale: selectedAnswer === null ? 0.98 : 1 }}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            <div className="mini-chat">
                <div className="mini-chat-messages">
                    {chatMessages.slice(-3).map((msg, index) => (
                        <div key={index} className={`mini-chat-message ${msg.type}`}>
                            {msg.type === 'chat' ? `${msg.playerName}: ${msg.message}` : msg.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderResults = () => (
        <div className="quiz-results">
            <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {gameState === 'final-results' ? '🏆 Final Results' : '📊 Question Results'}
            </motion.h2>

            <div className="leaderboard">
                {leaderboard.map((player, index) => (
                    <motion.div
                        key={player.playerId}
                        className={`leaderboard-item ${index === 0 ? 'winner' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="rank">#{index + 1}</div>
                        <div className="player-info">
                            <div className="player-avatar">{player.avatar}</div>
                            <div className="player-details">
                                <div className="player-name">{player.playerName}</div>
                                <div className="player-level">Level {player.level}</div>
                            </div>
                        </div>
                        <div className="score">{player.score} pts</div>
                        {index === 0 && <div className="crown">👑</div>}
                    </motion.div>
                ))}
            </div>

            {gameState === 'final-results' && (
                <motion.button
                    className="back-to-menu-btn"
                    onClick={() => {
                        setGameState('menu');
                        setRoomData(null);
                        loadAvailableRooms();
                        loadPlayerStats(); // Reload stats after quiz completion
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Back to Menu
                </motion.button>
            )}
        </div>
    );

    // Main render
    return (
        <div className="real-time-quiz">
            <AnimatePresence mode="wait">
                {gameState === 'menu' && (
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {renderMainMenu()}
                    </motion.div>
                )}
                
                {gameState === 'lobby' && (
                    <motion.div
                        key="lobby"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {renderLobby()}
                    </motion.div>
                )}
                
                {(gameState === 'playing' || gameState === 'waiting-next') && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {renderQuestionPhase()}
                    </motion.div>
                )}
                
                {(gameState === 'question-results' || gameState === 'final-results') && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {renderResults()}
                    </motion.div>
                )}
            </AnimatePresence>
            
            <NotificationModal 
                notification={notification} 
                onClose={hideNotification} 
            />
        </div>
    );
};

export default RealTimeQuiz;
