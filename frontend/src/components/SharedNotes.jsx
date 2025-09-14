import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../utils/axios';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import io from 'socket.io-client';
import './SharedNotes.css';
import { useNotification } from '../hooks/useNotification';

// Slate editor utilities (Toolbar, Element, Leaf, etc.)
const Toolbar = ({ editor }) => {
    // A simple toolbar for basic formatting
    return (
        <div className="note-toolbar">
            {/* Add buttons for bold, italic, lists, etc. */}
        </div>
    );
};

const Element = ({ attributes, children, element }) => {
    switch (element.type) {
        case 'heading-one':
            return <h1 {...attributes}>{children}</h1>;
        case 'bulleted-list':
            return <ul {...attributes}>{children}</ul>;
        case 'list-item':
            return <li {...attributes}>{children}</li>;
        default:
            return <p {...attributes}>{children}</p>;
    }
};

const Leaf = ({ attributes, children, leaf }) => {
    if (leaf.bold) {
        children = <strong>{children}</strong>;
    }
    return <span {...attributes}>{children}</span>;
};


const SharedNotes = ({ groupId }) => {
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const editor = useMemo(() => withHistory(withReact(createEditor())), []);
    const [value, setValue] = useState([{ type: 'paragraph', children: [{ text: '' }] }]);
    const { showSuccess, showError } = useNotification();
    const socket = useMemo(() => io(import.meta.env.VITE_API_URL, {
        path: "/socket.io/collaborative",
        auth: { token: localStorage.getItem("token") }
    }), []);

    useEffect(() => {
        if (groupId) {
            // Fetch initial notes
            axios.get(`/api/study-groups/${groupId}/notes`)
                .then(res => setNotes(res.data.notes))
                .catch(err => showError("Failed to load notes."));

            // Join socket room for this group
            socket.emit('join_group_notes', { groupId });

            // Listen for real-time updates
            socket.on('note_created', (newNote) => {
                setNotes(prev => [...prev, newNote]);
                showSuccess(`New note added: ${newNote.title}`);
            });

            socket.on('note_updated', (updatedNote) => {
                setNotes(prev => prev.map(n => n._id === updatedNote._id ? updatedNote : n));
                if (selectedNote?._id === updatedNote._id) {
                    setSelectedNote(updatedNote);
                    setValue(JSON.parse(updatedNote.content));
                }
            });

            socket.on('note_deleted', (noteId) => {
                setNotes(prev => prev.filter(n => n._id !== noteId));
                if (selectedNote?._id === noteId) {
                    setSelectedNote(null);
                    setValue([{ type: 'paragraph', children: [{ text: '' }] }]);
                }
                showSuccess("Note deleted.");
            });

            return () => {
                socket.emit('leave_group_notes', { groupId });
                socket.off('note_created');
                socket.off('note_updated');
                socket.off('note_deleted');
            };
        }
    }, [groupId, socket, showError, showSuccess, selectedNote]);

    const handleSelectNote = (note) => {
        setSelectedNote(note);
        setValue(JSON.parse(note.content));
    };

    const handleCreateNote = () => {
        if (!newNoteTitle.trim() || !socket) return;
        socket.emit('note_created', {
            groupId,
            title: newNoteTitle,
            content: JSON.stringify([{ type: 'paragraph', children: [{ text: 'Start writing...' }] }])
        });
        setNewNoteTitle('');
    };

    const handleUpdateNote = useCallback((newValue) => {
        setValue(newValue);
        if (selectedNote && socket) {
            const content = JSON.stringify(newValue);
            socket.emit('note_updated', { noteId: selectedNote._id, content });
        }
    }, [selectedNote, socket]);

    const handleDeleteNote = (noteId) => {
        if (window.confirm("Are you sure you want to delete this note?") && socket) {
            socket.emit('note_deleted', { noteId });
        }
    };

    return (
        <div className="shared-notes-layout">
            <div className="notes-sidebar">
                <h3>Shared Notes</h3>
                <div className="create-note-form">
                    <input
                        type="text"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        placeholder="New note title..."
                    />
                    <button onClick={handleCreateNote}>+</button>
                </div>
                <ul className="notes-list">
                    {notes.map(note => (
                        <li
                            key={note._id}
                            className={selectedNote?._id === note._id ? 'active' : ''}
                            onClick={() => handleSelectNote(note)}
                        >
                            {note.title}
                            <button className="delete-note-btn" onClick={() => handleDeleteNote(note._id)}>×</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="note-editor-container">
                {selectedNote ? (
                    <Slate editor={editor} value={value} onChange={handleUpdateNote}>
                        <Toolbar editor={editor} />
                        <Editable
                            className="note-editable"
                            renderElement={props => <Element {...props} />}
                            renderLeaf={props => <Leaf {...props} />}
                            placeholder="Start collaborating..."
                        />
                    </Slate>
                ) : (
                    <div className="no-note-selected">
                        <p>Select a note from the list to start editing, or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SharedNotes;
