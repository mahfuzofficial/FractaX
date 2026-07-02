import client from './client';

export const kycApi = {
  submit: (formData: FormData) =>
    client.post('/kyc/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  getStatus: () =>
    client.get('/kyc/status').then((r) => r.data),
};
