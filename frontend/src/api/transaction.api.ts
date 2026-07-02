import client from './client';

export const transactionApi = {
  getById: (id: string) =>
    client.get(`/transactions/${id}`).then((r) => r.data),
};
