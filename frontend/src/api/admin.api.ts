import client from './client';

export const adminApi = {
  getStats: () => client.get('/admin/stats').then((r) => r.data),
  getKyc: () => client.get('/admin/kyc').then((r) => r.data),
  approveKyc: (userId: string) => client.patch(`/admin/kyc/${userId}/approve`).then((r) => r.data),
  rejectKyc: (userId: string, note: string) => client.patch(`/admin/kyc/${userId}/reject`, { note }).then((r) => r.data),
  getAssets: () => client.get('/admin/assets').then((r) => r.data),
  approveAsset: (id: string) => client.patch(`/admin/assets/${id}/approve`).then((r) => r.data),
  rejectAsset: (id: string, note: string) => client.patch(`/admin/assets/${id}/reject`, { note }).then((r) => r.data),
};
