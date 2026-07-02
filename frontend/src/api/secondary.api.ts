import client from './client';

export const secondaryApi = {
  getAllListings: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get('/secondary', { params }).then((r) => r.data),

  getAssetListings: (assetId: string) =>
    client.get(`/secondary/asset/${assetId}`).then((r) => r.data),

  getMyListings: () =>
    client.get('/secondary/my').then((r) => r.data),

  createListing: (data: {
    assetId: string;
    shareType: 'BASIC' | 'PREMIUM';
    quantity: number;
    pricePerShare: number;
  }) => client.post('/secondary/list', data).then((r) => r.data),

  buyFromListing: (listingId: string, quantity?: number) =>
    client.post(`/secondary/buy/${listingId}`, { quantity }).then((r) => r.data),

  cancelListing: (listingId: string) =>
    client.delete(`/secondary/${listingId}`).then((r) => r.data),

  async getInsights(params: { assetId: string; shareType: 'BASIC' | 'PREMIUM' }) {
    const response = await client.get('/secondary/insights', { params });
    return response.data || response;
  },
};