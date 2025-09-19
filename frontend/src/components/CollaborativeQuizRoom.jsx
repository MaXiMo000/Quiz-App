// src/components/CollaborativeQuizRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSocket, getQuizzes, clearQuizzesCache } from '../lib/socketClient';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';
import SharedNotes from './SharedNotes';
import { useNotification } from '../hooks/useNotification';
import './CollaborativeQuizRoom.css';

// Module-level flag to prevent multiple initializations across React Strict Mode
let hasInitializedGlobally = false;

const CollaborativeQuizRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
  const location = useLocation();
    const { showSuccess, showError, showWarning } = useNotification();

  // UI state
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);
    const [roomData, setRoomData] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [suggestedAnswer, setSuggestedAnswer] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
  const [gameStatus, setGameStatus] = useState('waiting');
    const [groupScore, setGroupScore] = useState(0);
    const [isHost, setIsHost] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionError, setConnectionError] = useState(null);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);

  // refs & singleton
  const chatRef = useRef(null);
  const timerRef = useRef(null);
  const socketRef = useRef(null); // will hold the singleton socket instance
  const listenersAttached = useRef(false);
  const hasEmittedJoin = useRef(false);
  const createRoomOnNotFound = useRef(false);
  const hasCreatedSocket = useRef(false);

    const token = localStorage.getItem('token');

  // --------- stable handlers ----------
  const handleRoomCreated = useCallback((data) => {
    setRoomData(data.room);
    setGameStatus(data.room.status || 'waiting');
    setGroupScore(data.room.groupScore || 0);
    setIsHost(true);
    setConnectionStatus('connected');
    showSuccess('Collaborative quiz room created!');
  }, [showSuccess]);

  const handleRoomJoined = useCallback((data) => {
            setRoomData(data.room);
    setGameStatus(data.room.status || 'waiting');
    setGroupScore(data.room.groupScore || 0);
    setIsHost(data.room.hostId === socketRef.current?.userInfo?.id);
    setConnectionStatus('connected');
            showSuccess('Successfully joined collaborative quiz room!');
  }, [showSuccess]);

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
                message: 'A player left the room',
                timestamp: new Date()
            }]);
  }, []);

  const handleNewQuestion = useCallback((data) => {
            setCurrentQuestion(data);
            setGameStatus('playing');
    setTimeLeft(data.timeLimit || 30);
            setSuggestions([]);
            setSuggestedAnswer('');

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

            showSuccess('New question started! Work together to find the answer!');
  }, [showSuccess]);

  const handleNewSuggestion = useCallback((data) => {
            setSuggestions(prev => {
                const exists = prev.find(s => s.answer === data.suggestion.answer);
      if (!exists) return [...prev, data.suggestion];
      return prev.map(s => s.answer === data.suggestion.answer ? { ...s, votes: data.suggestion.votes } : s);
    });
  }, []);

  const handleVoteUpdated = useCallback((data) => {
    setSuggestions(prev => prev.map(s => s.answer === data.answer ? { ...s, votes: data.votes } : s));
  }, []);

  const handleQuestionResult = useCallback((data) => {
            if (timerRef.current) clearInterval(timerRef.current);
            setGroupScore(data.groupScore);
            showSuccess(data.isCorrect ? 'Correct answer! Well done team!' : 'Incorrect answer. Better luck next time!');
            setTimeout(() => {
                if (data.questionIndex < roomData?.quiz?.questions?.length - 1) {
                    setGameStatus('waiting');
                    setCurrentQuestion(null);
                }
            }, 5000);
  }, [showSuccess, roomData?.quiz?.questions?.length]);

  const handleQuizFinished = useCallback((data) => {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameStatus('finished');
            setGroupScore(data.groupScore);
            showSuccess(`Quiz finished! Team score: ${data.groupScore} points!`);
  }, [showSuccess]);

  const handleChatMessage = useCallback((data) => {
    setChatMessages(prev => [...prev, {
      type: 'chat',
      playerName: data.playerName,
      message: data.message,
      timestamp: data.timestamp
    }]);
  }, []);

  const handleError = useCallback((data) => {
    // Room-not-found fallback: try create room exactly once
    if (data?.message === 'Room not found') {
      if (!createRoomOnNotFound.current && availableQuizzes.length > 0) {
        createRoomOnNotFound.current = true;
        const quizId = availableQuizzes[0]._id;
        console.log(`🔄 Room ${roomId} not found, creating new room with that ID`);
        socketRef.current?.emit('create_collaborative_room', {
          quizId,
          roomId, // Use the roomId from URL
          settings: { maxPlayers: 10 }
        });
        return;
      }
    }
    setConnectionStatus('error');
    setConnectionError(data?.message || 'Socket error occurred');
    showError(data?.message || 'Socket error occurred');
  }, [availableQuizzes, showError, roomId]);

  // ---------- attach socket listeners once ----------
  const attachHandlersOnce = useCallback((s) => {
    if (!s || listenersAttached.current) return;
    s.off('collaborative_room_created', handleRoomCreated);
    s.off('collaborative_room_joined', handleRoomJoined);
    s.off('player_joined_collaborative', handlePlayerJoined);
    s.off('player_left_collaborative', handlePlayerLeft);
    s.off('new_collaborative_question', handleNewQuestion);
    s.off('new_suggestion', handleNewSuggestion);
    s.off('vote_updated', handleVoteUpdated);
    s.off('collaborative_question_result', handleQuestionResult);
    s.off('collaborative_quiz_finished', handleQuizFinished);
    s.off('chat_message', handleChatMessage);
    s.off('error', handleError);

    s.on('collaborative_room_created', handleRoomCreated);
    s.on('collaborative_room_joined', handleRoomJoined);
    s.on('player_joined_collaborative', handlePlayerJoined);
    s.on('player_left_collaborative', handlePlayerLeft);
    s.on('new_collaborative_question', handleNewQuestion);
    s.on('new_suggestion', handleNewSuggestion);
    s.on('vote_updated', handleVoteUpdated);
    s.on('collaborative_question_result', handleQuestionResult);
    s.on('collaborative_quiz_finished', handleQuizFinished);
    s.on('chat_message', handleChatMessage);
    s.on('error', handleError);

    listenersAttached.current = true;
    console.log('✅ Socket handlers attached successfully (socket id: ' + (s.id || 'unknown') + ')');
  }, [
    handleRoomCreated, handleRoomJoined, handlePlayerJoined, handlePlayerLeft,
    handleNewQuestion, handleNewSuggestion, handleVoteUpdated, handleQuestionResult,
    handleQuizFinished, handleChatMessage, handleError
  ]);

  // ---------- load quizzes (singleton) ----------
  const loadQuizzes = useCallback(async () => {
    try {
      const quizzes = await getQuizzes(token);
      setAvailableQuizzes(quizzes);
    } catch (err) {
      console.error('loadQuizzes error:', err);
    }
  }, [token]);

  // ---------- create or reuse socket (singleton) ----------
  const initSocket = useCallback(() => {
    if (!token) return null;
    if (hasCreatedSocket.current) {
      // reuse singleton
      const s = getSocket(token);
      socketRef.current = s;
      return s;
    }
    hasCreatedSocket.current = true;

    // getSocket uses polling first (see src/lib/socketClient.js)
    const s = getSocket(token);
    socketRef.current = s;

    // auth/connect/cleanup
    s.on('authenticated', (userInfo) => {
      s.userInfo = userInfo;
      setSocketAuthenticated(true);
      console.log('✅ Socket authenticated:', userInfo);
    });

    s.on('connect', () => {
      setConnectionStatus('connected');
      setConnectionError(null);
      console.log('✅ Socket connected:', s.id, s.io?.engine?.transport?.name);
      // attach handlers once
      attachHandlersOnce(s);
    });

    s.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      setSocketAuthenticated(false);
      if (reason !== 'io client disconnect') showWarning('Disconnected from server');
    });

    s.on('connect_error', (err) => {
      console.error('connect_error', err);
      setConnectionStatus('error');
      setConnectionError(err?.message || 'Connection failed');
      showError('Failed to connect to server. Please check your connection.');
    });

    // engine upgrade errors (helpful logging)
    s.io?.engine?.on?.('upgradeError', (err) => {
      console.warn('engine upgradeError', err);
    });

    return s;
  }, [token, attachHandlersOnce, showError, showWarning]);

  // ---------- mount effect: create socket + load quizzes (run once per mount) ----------
  useEffect(() => {
    if (!location.pathname.includes('/collaborative-quiz/')) return;
    if (!token) {
      showError('Please login to join collaborative quiz');
      navigate('/login');
      return;
    }

    // Prevent multiple initializations across React Strict Mode using module-level flag
    if (hasInitializedGlobally) {
      console.log('🔄 Skipping initialization - already initialized globally');
      return;
    }
    hasInitializedGlobally = true;

    console.log('🚀 Initializing CollaborativeQuizRoom - fetching quizzes and creating socket');

    // fetch quizzes once (singleton)
    loadQuizzes();

    // init socket once (singleton)
    initSocket();

    // cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Do NOT aggressively destroy the module-level socket here if you want reuse across pages.
      // But if you prefer to fully cleanup on unmount, uncomment below:
      // cleanupSocket();
      // socketRef.current = null;
      listenersAttached.current = false;
      hasCreatedSocket.current = false;
      hasEmittedJoin.current = false;
      createRoomOnNotFound.current = false;
      // Don't reset hasInitializedGlobally here - let it persist across React Strict Mode
    };
    // Only depend on stable values - remove function dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname, navigate, showError]);

  // ---------- attempt join/create once we're ready ----------
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    if (availableQuizzes.length === 0) return;
    if (roomData) return;
    if (hasEmittedJoin.current) return;

    // prefer server-authenticated flag, but fallback to connected
    const canProceed = socketAuthenticated || (s && s.connected);
    if (!canProceed) return;

    hasEmittedJoin.current = true;

    if (roomId && roomId !== 'undefined' && roomId !== 'null') {
      console.log('🔄 Emitting join_collaborative_room for', roomId);
      s.emit('join_collaborative_room', { roomId });
    } else {
      const quizId = availableQuizzes[0]?._id;
      if (!quizId) {
        setConnectionStatus('error');
        setConnectionError('No quizzes available');
        return;
      }
      console.log('🔄 Emitting create_collaborative_room with quiz:', quizId);
      s.emit('create_collaborative_room', { quizId, settings: { maxPlayers: 10 } });
    }
  }, [socketAuthenticated, availableQuizzes, roomData, roomId]);

  // ---------- UI action helpers ----------
    const handleSuggestAnswer = () => {
    if (!suggestedAnswer.trim()) return;
    if (socketRef.current && gameStatus === 'playing') {
      socketRef.current.emit('suggest_answer', { answer: suggestedAnswer });
            setSuggestedAnswer('');
        }
    };

  const handleRetryConnection = () => {
    console.log('🔄 Retry connection requested');
    setConnectionStatus('connecting');
    setConnectionError(null);
    setRoomData(null);
    hasCreatedSocket.current = false;
    hasEmittedJoin.current = false;
    createRoomOnNotFound.current = false;
    hasInitializedGlobally = false; // Allow re-initialization globally

    // Clear quiz cache and refetch
    clearQuizzesCache();
    loadQuizzes();

    // cleanup and create again
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (e) {
        console.warn('Error cleaning up socket:', e);
      }
      socketRef.current = null;
    }
    initSocket();
  };

    const handleStartQuiz = () => {
    if (socketRef.current && isHost && roomData?.players?.length >= 2) {
      socketRef.current.emit('start_collaborative_quiz');
        } else if (!isHost) {
            showWarning('Only the host can start the quiz');
        } else {
            showWarning('Need at least 2 players to start the quiz');
        }
    };

    const handleSendChat = () => {
    if (chatInput.trim() && socketRef.current) {
      socketRef.current.emit('chat_message', { message: chatInput });
            setChatInput('');
        }
    };

    const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_room');
        }
        navigate('/real-time-quiz');
    };

  // auto scroll chat
    useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [chatMessages]);

  // route guard
  if (!location.pathname.includes('/collaborative-quiz/')) return <div>Loading...</div>;

  // loading UI while no roomData
    if (!roomData) {
    const getLoadingText = () => {
      switch (connectionStatus) {
        case 'connecting': return { main: 'Connecting', sub: 'to server...', progress: 'Establishing connection...' };
        case 'connected': return { main: 'Joining', sub: 'collaborative room...', progress: 'Loading room data...' };
        case 'disconnected': return { main: 'Reconnecting', sub: 'to server...', progress: 'Attempting to reconnect...' };
        case 'error': return { main: 'Connection', sub: 'failed', progress: connectionError || 'Unable to connect' };
        default: return { main: 'Loading', sub: 'please wait...', progress: 'Initializing...' };
      }
    };
    const loadingText = getLoadingText();

        return (
            <div className="collaborative-quiz-room loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="loading-dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
            <div className="loading-circle"><div className="circle-ring"></div><div className="circle-ring"></div><div className="circle-ring"></div></div>
          </div>
          <div className="loading-text">
            <h2>{loadingText.main}</h2>
            <h3>{loadingText.sub}</h3>
            {connectionStatus === 'error' && (
              <div className="error-actions">
                <button className="retry-btn" onClick={handleRetryConnection}>Retry Connection</button>
              </div>
            )}
          </div>
          <div className="loading-progress">
            <div className="progress-bar"><div className="progress-fill"></div></div>
            <p>{loadingText.progress}</p>
          </div>
                </div>
            </div>
        );
    }

  // main UI
    return (
        <div className="collaborative-quiz-room">
            <div className="quiz-header">
                <div className="room-info">
                    <h2>Collaborative Quiz Room: {roomId}</h2>
                    <p>{roomData.quiz?.title || 'Loading quiz...'} • {roomData.players?.length || 0} players</p>
                    {isHost && <span className="host-badge">👑 Host</span>}
                </div>
        <button className="leave-btn" onClick={handleLeaveRoom}>Leave Room</button>
            </div>

            <div className="quiz-content">
                <div className="quiz-area">
                    {gameStatus === 'waiting' && (
                        <div className="waiting-state">
                            <h3>Waiting for players...</h3>
                            <div className="players-list">
                                {roomData.players?.map((player, index) => (
                                    <div key={player.id || index} className="player-badge">
                                        <span className="player-avatar">{player.avatar || player.name?.charAt(0).toUpperCase()}</span>
                                        {player.name}
                                        {player.id === roomData.hostId && <span className="crown">👑</span>}
                                    </div>
                                ))}
                            </div>
                            {isHost && (
                <button className="start-quiz-btn" onClick={handleStartQuiz} disabled={roomData.players?.length < 2}>
                                    {roomData.players?.length < 2 ? 'Need at least 2 players' : 'Start Collaborative Quiz'}
                                </button>
                            )}
                        </div>
                    )}

                    {gameStatus === 'playing' && currentQuestion && (
                        <div className="question-container">
                            <div className="question-header">
                <div className="question-progress">Question {currentQuestion.questionIndex + 1} of {roomData.quiz?.questions?.length}</div>
                <div className="timer"><div className="timer-circle"><span>{timeLeft}</span></div></div>
                            </div>
                            <div className="question-content">
                                <h3 className="question-title">{currentQuestion.question.question}</h3>
                                <div className="options-container">
                  {currentQuestion.question.options.map((opt, i) => (
                    <div key={i} className="option-item">
                      <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                      <span className="option-text">{opt}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="suggestion-container">
                                    <h4>Suggest an answer:</h4>
                                    <div className="suggestion-input">
                    <textarea value={suggestedAnswer} onChange={(e) => setSuggestedAnswer(e.target.value)} placeholder="Type your suggested answer here..." rows={3} />
                                    </div>
                  <button className="suggestion-button" onClick={handleSuggestAnswer} disabled={!suggestedAnswer.trim()}>Suggest Answer</button>
                                </div>
                                {suggestions.length > 0 && (
                                    <div className="suggestions-list">
                                        <h4>Team Suggestions:</h4>
                    {suggestions.map((sug, idx) => (
                      <div key={idx} className="suggestion-item">
                        <span className="suggestion-text">{sug.answer}</span>
                        <span className="vote-count">{sug.votes?.length || 0} vote(s)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {gameStatus === 'finished' && (
                        <div className="results-container">
                            <h2>🎉 Quiz Completed!</h2>
                            <div className="final-score">
                                <h3>Team Score: {groupScore} points</h3>
                                <p>Great teamwork everyone!</p>
                            </div>
              <button className="back-to-menu-btn" onClick={() => navigate('/real-time-quiz')}>Back to Quiz Hub</button>
                        </div>
                    )}
                </div>

                <div className="whiteboard-area">
                    <h3>Collaborative Whiteboard</h3>
          <CollaborativeWhiteboard socket={socketRef.current} />
                </div>

                <div className="chat-area">
                    <h3>Team Chat</h3>
                    <div className="chat-messages" ref={chatRef}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.type}`}>
                {msg.type === 'system' ? <span className="system-message">{msg.message}</span> : <>
                  <span className="chat-author">{msg.playerName}:</span><span className="chat-text">{msg.message}</span>
                </>}
                            </div>
                        ))}
                    </div>
                    <div className="chat-input-container">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendChat()} placeholder="Type a message..." className="chat-input" />
            <button className="chat-send-button" onClick={handleSendChat}>Send</button>
                    </div>
                </div>
            </div>

            <div className="notes-area">
                <SharedNotes groupId={roomId} />
            </div>
        </div>
    );
};

export default CollaborativeQuizRoom;
