import { render, screen } from '@testing-library/react';
import SecurityProfile from './SecurityProfile';

test('shows message when no profile', () => {
  render(<SecurityProfile />);
  expect(screen.getByText(/no security profile/i)).toBeInTheDocument();
});

test('renders profile fields in plain language', () => {
  const profile = { mfa: true, passwordRotationDays: 30 };
  render(<SecurityProfile profile={profile} />);
  expect(screen.getByText(/mfa is enabled/i)).toBeInTheDocument();
  expect(screen.getByText(/password rotation days: 30/i)).toBeInTheDocument();
});
