// This file is run before each test file, after the test environment has been set up.

import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup after each test to prevent memory leaks
afterEach(() => {
  cleanup();
});
