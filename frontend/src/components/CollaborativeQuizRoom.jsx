// src/components/CollaborativeQuizRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from '../utils/axios';
import config from '../config/config';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';
import SharedNotes from './SharedNotes';
import { useNotification } from '../hooks/useNotification';
import './CollaborativeQuizRoom.css';

const CollaborativeQuizRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { showSuccess, showError, showWarning } = useNotification();

    // UI state
    const [socket, setSocket] = useState(null);
    const [socketAuthenticated, setSocketAuthenticated] = useState(false);
    const [roomData, setRoomData] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [suggestedAnswer, setSuggestedAnswer] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [votes, setVotes] = useState({});
    const [gameStatus, setGameStatus] = useState('waiting');
    const [groupScore, setGroupScore] = useState(0);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [, setTimeLeft] = useState(0);
    const [whiteboardData] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [connectionError, setConnectionError] = useState(null);
    const [availableQuizzes, setAvailableQuizzes] = useState([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

    // refs
    const chatRef = useRef(null);
    const timerRef = useRef(null);
    const connectingRef = useRef(false);

    const token = localStorage.getItem('token');

    // Load quizzes on mount
    useEffect(() => {
        loadQuizzes();
        const timer = timerRef.current;
        return () => {
            if (socket) {
                socket.disconnect();
            }
            if (timer) {
                clearInterval(timer);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load quizzes function
    const loadQuizzes = async () => {
        try {
            setIsLoadingQuizzes(true);
            const response = await axios.get('/api/quizzes');
            setAvailableQuizzes(response.data);
            console.log('✅ Quizzes loaded:', response.data.length);
        } catch (error) {
            console.error('Error loading quizzes:', error);
            showError('Failed to load quizzes');
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    // Socket event handlers
    const handleRoomCreated = useCallback((data) => {
        setRoomData(data.room);
        setGameStatus(data.room.status || 'waiting');
        setGroupScore(data.room.groupScore || 0);
        setIsHost(true);
        setConnectionStatus('connected');
        setConnectionError(null);
        showSuccess('Collaborative quiz room created!');
    }, [showSuccess]);

    const handleRoomJoined = useCallback((data) => {
        setRoomData(data.room);
        setGameStatus(data.room.status || 'waiting');
        setGroupScore(data.room.groupScore || 0);
        setIsHost(data.room.hostId === socket?.userInfo?.id);
        setConnectionStatus('connected');
        setConnectionError(null);
        showSuccess('Successfully joined collaborative quiz room!');
    }, [showSuccess, socket]);

    const handlePlayerJoined = useCallback((data) => {
        setRoomData(prev => ({ ...prev, players: data.players }));
        setChatMessages(prev => [...prev, {
            type: 'system',
            message: `${data.player.name} joined the room`,
            timestamp: new Date()
        }]);
    }, []);

    const handlePlayerLeft = useCallback((data) => {
        setRoomData(prev => ({ ...prev, players: data.players }));
        setChatMessages(prev => [...prev, {
            type: 'system',
            message: `${data.player.name} left the room`,
            timestamp: new Date()
        }]);
    }, []);

    const handleNewQuestion = useCallback((data) => {
        setCurrentQuestion(data.question);
        setGameStatus('playing');
        setSuggestions([]);
        setVotes({});
        setTimeLeft(data.timeLimit || 30);
    }, []);

    const handleNewSuggestion = useCallback((data) => {
        setSuggestions(prev => [...prev, data.suggestion]);
    }, []);

    const handleVoteUpdated = useCallback((data) => {
        setVotes(prev => ({ ...prev, [data.suggestionId]: data.votes }));
    }, []);

    const handleQuestionResult = useCallback((data) => {
        setGroupScore(data.groupScore);
        setGameStatus('waiting');
        setCurrentQuestion(null);
        setSuggestions([]);
        setVotes({});
    }, []);

    const handleQuizFinished = useCallback((data) => {
        setGameStatus('finished');
        setGroupScore(data.finalScore);
        showSuccess(`Quiz completed! Final score: ${data.finalScore}`);
    }, [showSuccess]);

    const handleChatMessage = useCallback((data) => {
        setChatMessages(prev => [...prev, {
            type: 'user',
            user: data.user,
            message: data.message,
            timestamp: data.timestamp
        }]);
    }, []);

    const handleError = useCallback((data) => {
        console.error('Socket error:', data);
        setConnectionStatus('error');
        setConnectionError(data?.message || 'Socket error occurred');
        showError(data?.message || 'Socket error occurred');
    }, [showError]);


    // Connect socket when component mounts
    useEffect(() => {
        if (!location.pathname.includes('/collaborative-quiz/') || socket) return;
        if (!token) {
            showError('Please login to join collaborative quiz');
            navigate('/login');
            return;
        }

        // Prevent multiple connections
        if (connectingRef.current) return;

        connectingRef.current = true;

        const newSocket = io(config.BACKEND_URL, {
            path: '/socket.io/collaborative',
            auth: { token },
            transports: ['polling', 'websocket'], // Try polling first, then websocket
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        // Add authentication success handler first
        newSocket.on('authenticated', (userInfo) => {
            newSocket.userInfo = userInfo;
            setSocketAuthenticated(true);
            console.log('✅ Socket authenticated:', userInfo);
        });

        newSocket.on('connect', () => {
            setSocket(newSocket);
            setConnectionStatus('connected');
            setConnectionError(null);
            connectingRef.current = false;
            console.log('✅ Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setConnectionStatus('disconnected');
            setSocketAuthenticated(false);
            connectingRef.current = false;
            if (reason !== 'io client disconnect') showWarning('Disconnected from server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnectionStatus('error');
            setConnectionError(error.message || 'Connection failed');
            connectingRef.current = false;
        });

        // Add event listeners
        newSocket.on('collaborative_room_created', handleRoomCreated);
        newSocket.on('collaborative_room_joined', handleRoomJoined);
        newSocket.on('player_joined_collaborative', handlePlayerJoined);
        newSocket.on('player_left_collaborative', handlePlayerLeft);
        newSocket.on('new_collaborative_question', handleNewQuestion);
        newSocket.on('new_suggestion', handleNewSuggestion);
        newSocket.on('vote_updated', handleVoteUpdated);
        newSocket.on('collaborative_question_result', handleQuestionResult);
        newSocket.on('collaborative_quiz_finished', handleQuizFinished);
        newSocket.on('chat_message', handleChatMessage);
        newSocket.on('error', handleError);

        setSocket(newSocket);
    }, [location.pathname, socket, token, navigate, showError, showWarning, handleRoomCreated, handleRoomJoined, handlePlayerJoined, handlePlayerLeft, handleNewQuestion, handleNewSuggestion, handleVoteUpdated, handleQuestionResult, handleQuizFinished, handleChatMessage, handleError]);

    // Join or create room when socket is ready
    useEffect(() => {
        if (!socket || !socketAuthenticated || !availableQuizzes.length || roomData) {
            console.log('🔍 Room join/create conditions not met:', {
                socket: !!socket,
                authenticated: socketAuthenticated,
                quizzes: availableQuizzes.length,
                roomData: !!roomData
            });
            return;
        }

        console.log('🔄 Attempting to join or create room...');

        if (roomId && roomId !== 'undefined' && roomId !== 'null') {
            // Try to join existing room first
            console.log('🔄 Attempting to join existing room:', roomId);
            socket.emit('join_collaborative_room', { roomId });
        } else {
            // Create new room
            const quizId = availableQuizzes[0]?._id;
            if (quizId) {
                console.log('🔄 Creating new collaborative room with quiz:', quizId);
                socket.emit('create_collaborative_room', {
                    quizId,
                    settings: { maxPlayers: 10 }
                });
            } else {
                console.error('❌ No quiz available to create room');
                setConnectionStatus('error');
                setConnectionError('No quiz available');
            }
        }
    }, [socket, socketAuthenticated, availableQuizzes, roomData, roomId]);

    // Handle room creation error by trying to join instead
    useEffect(() => {
        if (!socket) return;

        const handleCreateError = (data) => {
            console.log('🔍 Socket error received:', data);
            if (data?.message === 'Failed to create room' && roomId) {
                console.log('🔄 Room creation failed, trying to join instead:', roomId);
                socket.emit('join_collaborative_room', { roomId });
            } else if (data?.message === 'Room not found' && roomId) {
                console.log('🔄 Room not found, creating new room with roomId:', roomId);
                const quizId = availableQuizzes[0]?._id;
                if (quizId) {
                    socket.emit('create_collaborative_room', {
                        quizId,
                        roomId,
                        settings: { maxPlayers: 10 }
                    });
                }
            }
        };

        socket.on('error', handleCreateError);
        return () => socket.off('error', handleCreateError);
    }, [socket, roomId, availableQuizzes]);

    // UI action handlers
    const handleSuggestAnswer = () => {
        if (!suggestedAnswer.trim()) return;
        if (socket && gameStatus === 'playing') {
            socket.emit('suggest_answer', { answer: suggestedAnswer });
            setSuggestedAnswer('');
        }
    };

    const handleVote = (suggestionId) => {
        if (socket) {
            socket.emit('vote_suggestion', { suggestionId });
        }
    };

    const handleStartQuiz = () => {
        if (socket && isHost && roomData?.players?.length >= 2) {
            socket.emit('start_collaborative_quiz');
        } else if (!isHost) {
            showError('Only the host can start the quiz');
        } else {
            showError('Need at least 2 players to start');
        }
    };

    const handleSendMessage = () => {
        if (chatInput.trim() && socket) {
            socket.emit('chat_message', { message: chatInput });
            setChatInput('');
        }
    };

    const handleRetryConnection = () => {
        console.log('🔄 Retry connection requested');
        setConnectionStatus('connecting');
        setConnectionError(null);
        setRoomData(null);
        setSocket(null);
        setSocketAuthenticated(false);
        connectingRef.current = false;
    };

    // Render loading state
    if (isLoadingQuizzes) {
        return (
            <div className="collaborative-quiz-room">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading quizzes...</p>
                </div>
            </div>
        );
    }

    // Render connection error state
    if (connectionStatus === 'error') {
        return (
            <div className="collaborative-quiz-room">
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h2>Connection Failed</h2>
                    <p>{connectionError || 'Unable to connect to the server'}</p>
                    <button onClick={handleRetryConnection} className="retry-btn">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Render connecting state
    if (connectionStatus === 'connecting' || connectionStatus === 'disconnected') {
        return (
            <div className="collaborative-quiz-room">
                <div className="connecting-container">
                    <div className="loading-spinner"></div>
                    <p>Connecting to server...</p>
                </div>
            </div>
        );
    }

    // Render main room interface
    return (
        <div className="collaborative-quiz-room">
            <div className="room-header">
                <h1>Collaborative Quiz Room</h1>
                {roomData && (
                    <div className="room-info">
                        <span>Room ID: {roomData.id}</span>
                        <span>Players: {roomData.players?.length || 0}</span>
                        <span>Score: {groupScore}</span>
                    </div>
                )}
            </div>

            <div className="room-content">
                <div className="quiz-area">
                    {currentQuestion ? (
                        <div className="question-container">
                            <h3>Question {currentQuestion.questionNumber}</h3>
                            <p>{currentQuestion.question}</p>
                            <div className="options">
                                {currentQuestion.options?.map((option, index) => (
                                    <button key={index} className="option-btn">
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="waiting-area">
                            <h3>Waiting for quiz to start...</h3>
                            {isHost && (
                                <button onClick={handleStartQuiz} className="start-btn">
                                    Start Quiz
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="sidebar">
                    <div className="suggestions-panel">
                        <h4>Suggestions</h4>
                        <div className="suggestion-input">
                            <input
                                type="text"
                                value={suggestedAnswer}
                                onChange={(e) => setSuggestedAnswer(e.target.value)}
                                placeholder="Suggest an answer..."
                                disabled={gameStatus !== 'playing'}
                            />
                            <button onClick={handleSuggestAnswer} disabled={gameStatus !== 'playing'}>
                                Suggest
                            </button>
                        </div>
                        <div className="suggestions-list">
                            {suggestions.map((suggestion, index) => (
                                <div key={index} className="suggestion-item">
                                    <span>{suggestion.answer}</span>
                                    <span>by {suggestion.suggester}</span>
                                    <button onClick={() => handleVote(suggestion.id)}>
                                        Vote ({votes[suggestion.id] || 0})
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chat-panel">
                        <h4>Chat</h4>
                        <div className="chat-messages" ref={chatRef}>
                            {chatMessages.map((msg, index) => (
                                <div key={index} className={`chat-message ${msg.type}`}>
                                    {msg.type === 'user' && <span className="username">{msg.user}:</span>}
                                    <span className="message">{msg.message}</span>
                                </div>
                            ))}
                        </div>
                        <div className="chat-input">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage}>Send</button>
                        </div>
                    </div>
                </div>
            </div>

            <CollaborativeWhiteboard data={whiteboardData} />
            <SharedNotes />
        </div>
    );
};

export default CollaborativeQuizRoom;
