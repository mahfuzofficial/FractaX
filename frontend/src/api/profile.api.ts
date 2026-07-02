import client from './client';

export const profileApi = {
  getProfile: () =>
    client.get('/profile').then((r) => r.data.data),

  updatePersonal: (data: {
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    profession?: string;
    education?: string;
  }) => client.patch('/profile/personal', data).then((r) => r.data),

  updateEmail: (data: { email: string; password: string }) =>
    client.patch('/profile/email', data).then((r) => r.data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => client.patch('/profile/password', data).then((r) => r.data),

  updateAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return fetch(`http://localhost:5000/api/profile/avatar`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: formData,
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw { response: { data: json } };
      return json;
    });
  },

  updateWalletAddress: (walletAddress: string) =>
    client.patch('/profile/wallet-address', { walletAddress }).then((r) => r.data),

  getPaymentMethods: () =>
    client.get('/profile/payment-methods').then((r) => r.data.data),

  addPaymentMethod: (data: any) =>
    client.post('/profile/payment-methods', data).then((r) => r.data),

  updatePaymentMethod: (id: string, data: any) =>
    client.patch(`/profile/payment-methods/${id}`, data).then((r) => r.data),

  deletePaymentMethod: (id: string) =>
    client.delete(`/profile/payment-methods/${id}`).then((r) => r.data),

  setDefaultPaymentMethod: (id: string) =>
    client.patch(`/profile/payment-methods/${id}/default`).then((r) => r.data),
};