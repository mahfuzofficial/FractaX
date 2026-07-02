import client from './client';

export const assetApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get('/assets', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get(`/assets/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    client.post('/assets', data).then((r) => r.data),

  getMyListings: () =>
    client.get('/assets/my/listings').then((r) => r.data),
};
