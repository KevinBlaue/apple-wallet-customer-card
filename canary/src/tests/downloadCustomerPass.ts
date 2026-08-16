import type { CanaryRequest, Client } from '../client';

export function requestDownloadCustomerPass(client: Client, cardId: string): CanaryRequest {
  return client.createRequest('GET', `/cards/${encodeURIComponent(cardId)}/pass`);
}
