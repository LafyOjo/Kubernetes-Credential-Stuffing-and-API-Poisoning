import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login header when no token is present', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { name: /sign in/i });
  expect(headerElement).toBeInTheDocument();
});
