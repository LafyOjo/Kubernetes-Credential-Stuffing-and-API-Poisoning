import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { apiFetch } from '../api';
import { jwtDecode } from 'jwt-decode';

jest.mock('../api', () => ({
  apiFetch: jest.fn(),
  AUTH_TOKEN_KEY: 'apiShieldAuthToken'
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

function setupApiMock(username, activityData) {
  apiFetch.mockImplementation((path) => {
    if (path === '/ping') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'pong' }) });
    }
    if (path === `/users/${username}/activity`) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(activityData) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  localStorage.clear();
  apiFetch.mockReset();
  jwtDecode.mockReset();
});

test('fetches data and renders activity for Alice', async () => {
  localStorage.setItem('apiShieldAuthToken', 'token');
  jwtDecode.mockReturnValue({ sub: 'alice' });
  setupApiMock('alice', [{ time: 't', ip: '1.1.1.1', status: 'success' }]);

  render(<Dashboard />);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/alice/activity'));
  expect(await screen.findByText('1.1.1.1')).toBeInTheDocument();
});

test('fetches data and renders activity for Ben', async () => {
  localStorage.setItem('apiShieldAuthToken', 'token');
  jwtDecode.mockReturnValue({ sub: 'ben' });
  setupApiMock('ben', [{ time: 't', ip: '2.2.2.2', status: 'failure' }]);

  render(<Dashboard />);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/ben/activity'));
  expect(await screen.findByText('2.2.2.2')).toBeInTheDocument();
});
