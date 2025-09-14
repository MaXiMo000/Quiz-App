import React, { useRef, useEffect, useState } from 'react';
import './CollaborativeWhiteboard.css';

const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

const CollaborativeWhiteboard = ({ socket }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [isErasing, setIsErasing] = useState(false);
    const lastPosition = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;

        if (socket) {
            socket.on('whiteboard_draw', ({ x0, y0, x1, y1, color, brushSize, isErasing }) => {
                const context = contextRef.current;
                if (isErasing) {
                    context.globalCompositeOperation = 'destination-out';
                    context.lineWidth = brushSize;
                } else {
                    context.globalCompositeOperation = 'source-over';
                    context.strokeStyle = color;
                    context.lineWidth = brushSize;
                }
                context.beginPath();
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
                context.stroke();
            });

            socket.on('whiteboard_clear', () => {
                const context = contextRef.current;
                context.clearRect(0, 0, canvas.width, canvas.height);
            });
        }
    }, [socket]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setIsDrawing(true);
        lastPosition.current = { x: offsetX, y: offsetY };
    };

    const finishDrawing = () => {
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const { x, y } = lastPosition.current;

        const context = contextRef.current;
        if (isErasing) {
            context.globalCompositeOperation = 'destination-out';
            context.lineWidth = brushSize;
        } else {
            context.globalCompositeOperation = 'source-over';
            context.strokeStyle = color;
            context.lineWidth = brushSize;
        }

        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(offsetX, offsetY);
        context.stroke();

        socket.emit('whiteboard_draw', { x0: x, y0: y, x1: offsetX, y1: offsetY, color, brushSize, isErasing });
        lastPosition.current = { x: offsetX, y: offsetY };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        context.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('whiteboard_clear');
    };

    return (
        <div className="whiteboard-container">
            <div className="toolbar">
                <div className="color-picker">
                    {COLORS.map(c => (
                        <div key={c} className={`color-swatch ${color === c && !isErasing ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => { setColor(c); setIsErasing(false); }} />
                    ))}
                </div>
                <div className="brush-size-picker">
                    <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} />
                    <span>{brushSize}</span>
                </div>
                <div className="tool-picker">
                    <button onClick={() => setIsErasing(false)} className={!isErasing ? 'active' : ''}>Pencil</button>
                    <button onClick={() => setIsErasing(true)} className={isErasing ? 'active' : ''}>Eraser</button>
                </div>
                <button onClick={clearCanvas}>Clear</button>
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseMove={draw}
                onMouseOut={finishDrawing}
            />
        </div>
    );
};

export default CollaborativeWhiteboard;
