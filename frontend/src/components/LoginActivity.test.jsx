import { render, screen } from '@testing-library/react';
import LoginActivity from './LoginActivity';

test('shows message when no activities', () => {
  render(<LoginActivity />);
  expect(screen.getByText(/no login activity/i)).toBeInTheDocument();
});

test('renders table rows for activities', () => {
  const data = [{ time: '2024-01-01', ip: '1.1.1.1', status: 'success' }];
  render(<LoginActivity activities={data} />);
  expect(screen.getByText('1.1.1.1')).toBeInTheDocument();
});
