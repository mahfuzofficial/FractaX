import client from './client';

export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    client.post('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data).then((r) => r.data),

  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }).then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    client.post('/auth/refresh-token', { refreshToken }).then((r) => r.data),
};
