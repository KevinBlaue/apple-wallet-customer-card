import { Client } from './client';

describe('Canary Client', () => {
  test('creates an HTTPS request relative to the API stage', () => {
    const request = new Client('https://example.invalid/v1/', 'customer-card-canary').createRequest(
      'POST',
      '/cards',
      { name: 'Synthetic Wallet Test' }
    );
    expect(request).toMatchObject({
      hostname: 'example.invalid',
      method: 'POST',
      path: '/v1/cards',
      protocol: 'https:',
      body: '{"name":"Synthetic Wallet Test"}',
    });
  });
});
