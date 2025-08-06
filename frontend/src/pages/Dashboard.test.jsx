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

function setupApiMock(username, activityData, profileData) {
  apiFetch.mockImplementation((path) => {
    if (path === '/ping') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'pong' }) });
    }
    if (path === `/users/${username}/activity`) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(activityData) });
    }
    if (path === `/users/${username}/security-profile`) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(profileData) });
    }
    if (path === '/api/security') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ enabled: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  localStorage.clear();
  apiFetch.mockReset();
  jwtDecode.mockReset();
});

test('fetches data and renders security components for Alice', async () => {
  localStorage.setItem('apiShieldAuthToken', 'token');
  jwtDecode.mockReturnValue({ sub: 'alice', role: 'user' });
  setupApiMock('alice', [{ time: 't', ip: '1.1.1.1', status: 'success' }], { mfa: true });

  render(<Dashboard />);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/alice/activity'));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/alice/security-profile'));

  expect(await screen.findByText(/mfa is enabled/i)).toBeInTheDocument();
  expect(await screen.findByText('1.1.1.1')).toBeInTheDocument();
});

test('fetches data and renders security components for Ben', async () => {
  localStorage.setItem('apiShieldAuthToken', 'token');
  jwtDecode.mockReturnValue({ sub: 'ben', role: 'user' });
  setupApiMock('ben', [{ time: 't', ip: '2.2.2.2', status: 'failure' }], { mfa: false });

  render(<Dashboard />);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/ben/activity'));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/ben/security-profile'));

  expect(await screen.findByText(/mfa is disabled/i)).toBeInTheDocument();
  expect(await screen.findByText('2.2.2.2')).toBeInTheDocument();
});
