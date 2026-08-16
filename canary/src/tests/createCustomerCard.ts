import type { CanaryRequest, Client } from '../client';

export function requestCreateCustomerCard(client: Client): CanaryRequest {
  return client.createRequest('POST', '/cards', { name: 'Synthetic Wallet Test' });
}
