import { render, screen } from '@testing-library/react';
import UserAccounts, { USER_DATA } from './UserAccounts';

test('renders features list for selected user', () => {
  render(<UserAccounts />);
  const featureItems = screen.getAllByRole('listitem');
  expect(featureItems).toHaveLength(USER_DATA.alice.features.length);
});
