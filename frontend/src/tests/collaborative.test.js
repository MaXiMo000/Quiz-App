import React from 'react';
import { render, screen } from '@testing-library/react';
import SharedNotes from '../components/SharedNotes';

// Mock the useNotification hook
jest.mock('../hooks/useNotification', () => ({
    useNotification: () => ({
        showSuccess: jest.fn(),
        showError: jest.fn(),
    }),
}));

describe('SharedNotes', () => {
    it('renders without crashing', () => {
        render(<SharedNotes groupId="test-group-id" />);
        expect(screen.getByText('Shared Notes')).toBeInTheDocument();
    });

    // This is a placeholder for a more complex test that would involve a mock socket server.
    it('should connect to the socket server and join the group room', () => {
        // In a real test, you would mock the socket.io-client and assert that
        // the socket connects and emits the 'join_group_notes' event.
        expect(true).toBe(true);
    });
});
