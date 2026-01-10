import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import config from '../../config/config';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';
import './LiveQuizRoom.css';

const LiveQuizRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [error, setError] = useState(null);
    const [gameState, setGameState] = useState('waiting');
    const [mySuggestion, setMySuggestion] = useState(null);
    const [myVote, setMyVote] = useState(null);
    const chatRef = useRef(null);

    useEffect(() => {
        const newSocket = io(config.BACKEND_URL, {
            auth: { token: localStorage.getItem('token') },
        });
        setSocket(newSocket);

        newSocket.emit('join_room', { roomId });

        newSocket.on('room_joined', (data) => setRoomData(data.room));
        newSocket.on('new_question', (data) => {
            setCurrentQuestion(data);
            setSuggestions([]);
            setMySuggestion(null);
            setMyVote(null);
            setGameState('playing');
        });
        newSocket.on('new_suggestion', (data) => setSuggestions(prev => [...prev, data.suggestion]));
        newSocket.on('vote_update', (data) => {
            setSuggestions(prev => prev.map(s => s.answer === data.answer ? { ...s, votes: Array(data.votes) } : s));
        });
        newSocket.on('quiz_finished', (data) => {
            setGameState('results');
            setRoomData(prev => ({ ...prev, groupScore: data.groupScore }));
        });
        newSocket.on('chat_message', (message) => setChatMessages(prev => [...prev, message]));
        newSocket.on('error', (err) => setError(err.message));

        return () => newSocket.close();
    }, [roomId]);

    const handleSuggestAnswer = (answer) => {
        if (mySuggestion !== null) return;
        setMySuggestion(answer);
        socket.emit('suggest_answer', { answer });
    };

    const handleVoteAnswer = (answer) => {
        if (myVote !== null) return;
        setMyVote(answer);
        socket.emit('vote_answer', { answer });
    };

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        socket.emit('chat_message', { message: chatInput });
        setChatInput('');
    };

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatMessages]);

    if (error) return <div className="error-message">Error: {error}</div>;
    if (!roomData) return <div>Loading room...</div>;

    return (
        <div className="live-quiz-room-container">
            <header>
                <h1>Collaborative Quiz: {roomData.quiz.title}</h1>
                <button onClick={() => navigate('/realtimeraquizzes')}>Leave Room</button>
            </header>
            <main>
                <div className="quiz-content">
                    {gameState === 'waiting' && <h2>Waiting for host to start...</h2>}
                    {gameState === 'playing' && currentQuestion && (
                        <>
                            <h2>Q{currentQuestion.questionNumber}: {currentQuestion.question.question}</h2>
                            <div className="options-grid">
                                {currentQuestion.question.options.map((option, index) => (
                                    <button key={index} onClick={() => handleSuggestAnswer(index)} disabled={mySuggestion !== null}>
                                        {mySuggestion === index ? 'Suggested!' : `Suggest: ${option}`}
                                    </button>
                                ))}
                            </div>
                            <div className="suggestions-list">
                                <h3>Suggestions</h3>
                                {suggestions.map((suggestion, index) => (
                                    <div key={index} className="suggestion-item">
                                        <p>{currentQuestion.question.options[suggestion.answer]}</p>
                                        <button onClick={() => handleVoteAnswer(suggestion.answer)} disabled={myVote !== null}>
                                            Vote ({suggestion.votes.length})
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <CollaborativeWhiteboard socket={socket} />
                        </>
                    )}
                    {gameState === 'results' && (
                        <div className="results-screen">
                            <h2>Quiz Finished!</h2>
                            <h3>Group Score: {roomData.groupScore}</h3>
                        </div>
                    )}
                </div>
                <aside className="sidebar">
                    <div className="players-list">
                        <h3>Players</h3>
                        <ul>{roomData.players.map(p => <li key={p.id}>{p.name}</li>)}</ul>
                    </div>
                    <div className="chat-box">
                        <h3>Chat</h3>
                        <div className="messages" ref={chatRef}>
                            {chatMessages.map((msg, i) => <p key={i}><b>{msg.playerName}:</b> {msg.message}</p>)}
                        </div>
                        <div className="chat-input">
                            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} />
                            <button onClick={sendChatMessage}>Send</button>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default LiveQuizRoom;
