import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import config from '../config/config';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';
import './CollaborativeQuizRoom.css';

const CollaborativeQuizRoom = () => {
    const { roomId } = useParams();
    const [socket, setSocket] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [suggestedAnswer, setSuggestedAnswer] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    const token = localStorage.getItem('token');
    const newSocket = useMemo(() => io(config.BACKEND_URL, {
        path: "/socket.io/collaborative",
        auth: { token }
    }), [token]);

    useEffect(() => {
        setSocket(newSocket);

        newSocket.emit('join_collaborative_room', { roomId });

        newSocket.on('collaborative_room_joined', (data) => {
            setRoomData(data.room);
        });

        newSocket.on('player_joined_collaborative', (data) => {
            setRoomData(prev => ({ ...prev, players: data.players }));
        });

        newSocket.on('new_collaborative_question', (data) => {
            setCurrentQuestion(data);
        });

        newSocket.on('new_suggestion', (data) => {
            // Handle new suggestion
        });

        newSocket.on('vote_updated', (data) => {
            // Handle vote update
        });

        newSocket.on('collaborative_question_result', (data) => {
            // Handle question result
        });

        newSocket.on('collaborative_quiz_finished', (data) => {
            // Handle quiz finished
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, newSocket]);

    const handleSuggestAnswer = () => {
        if (suggestedAnswer.trim() && socket) {
            socket.emit('suggest_answer', { answer: suggestedAnswer });
            setSuggestedAnswer('');
        }
    };

    return (
        <div className="collaborative-quiz-room">
            <div className="quiz-area">
                {/* Quiz content will go here */}
            </div>
            <div className="whiteboard-area">
                <CollaborativeWhiteboard socket={socket} />
            </div>
            <div className="chat-area">
                {/* Chat content will go here */}
            </div>
        </div>
    );
};

export default CollaborativeQuizRoom;
