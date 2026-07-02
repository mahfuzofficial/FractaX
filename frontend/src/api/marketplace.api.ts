import client from './client';

export const marketplaceApi = {
  browse: (params?: { search?: string; page?: number; limit?: number; category?: string }) =>
    client.get('/marketplace', { params }).then((r) => r.data),

  buy: (data: { assetId: string; shareType: 'BASIC' | 'PREMIUM'; quantity: number }) =>
    client.post('/marketplace/buy', data).then((r) => r.data),
};