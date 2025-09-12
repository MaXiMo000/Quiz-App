import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

const MockThemeProvider = ({ children }) => {
    const theme = 'light';
    const changeTheme = () => {}; // no-op
    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

const customRender = (ui, { route = '/', path = '/', ...renderOptions } = {}) => {
  const AllTheProviders = ({ children }) => {
    return (
      <MemoryRouter initialEntries={[route]}>
        <MockThemeProvider>
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        </MockThemeProvider>
      </MemoryRouter>
    );
  };
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// re-export everything from React Testing Library
export * from '@testing-library/react';

// override the render method with our custom one
export { customRender as render };
