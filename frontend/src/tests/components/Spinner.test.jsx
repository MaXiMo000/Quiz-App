import React from 'react';
import { render, screen } from '../../utils/test-utils.jsx';
import Spinner from '../../components/Spinner';

describe('Spinner Component', () => {
  test('renders the default enhanced spinner on a generic page', () => {
    // Render at a generic route like '/'
    render(<Spinner message="Loading data..." />, { route: '/', path: '/' });

    expect(screen.getByText('Loading data...')).toBeInTheDocument();

    const container = screen.getByText('Loading data...').closest('.enhanced-spinner-container');
    expect(container).toBeInTheDocument();
  });

  test('renders the simple auth loader on the login page', () => {
    const { container } = render(<Spinner />, { route: '/login', path: '/login' });

    expect(container.querySelector('.simple-auth-loader')).toBeInTheDocument();
  });

  test('renders the simple auth loader on the register page', () => {
    const { container } = render(<Spinner />, { route: '/register', path: '/register' });

    expect(container.querySelector('.simple-auth-loader')).toBeInTheDocument();
  });
});
