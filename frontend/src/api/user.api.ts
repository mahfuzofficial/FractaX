import client from './client';

export const userApi = {
  getMe: () => client.get('/user/me').then((r) => r.data),
  getOwnerships: () => client.get('/user/me/ownerships').then((r) => r.data),
  getTransactions: () => client.get('/user/me/transactions').then((r) => r.data),
};
