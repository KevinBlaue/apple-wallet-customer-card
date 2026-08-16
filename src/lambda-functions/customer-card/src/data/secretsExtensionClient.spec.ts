import { SecretsExtensionClient } from './secretsExtensionClient';

describe('SecretsExtensionClient', () => {
  const endpoint = 'http://localhost:2773/secretsmanager/get';

  test('retrieves a secret through the local Lambda extension', async () => {
    const fetchImplementation = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(JSON.stringify({ SecretString: 'certificate-json' })));
    const client = new SecretsExtensionClient(endpoint, () => 'session-token', fetchImplementation);

    await expect(client.getSecretString('/demo/certificates')).resolves.toBe('certificate-json');
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://localhost:2773/secretsmanager/get?secretId=%2Fdemo%2Fcertificates',
      {
        headers: { 'X-Aws-Parameters-Secrets-Token': 'session-token' },
        method: 'GET',
      }
    );
  });

  test('rejects missing Lambda credentials', async () => {
    const client = new SecretsExtensionClient(
      endpoint,
      () => undefined,
      jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    );
    await expect(client.getSecretString('/demo/certificates')).rejects.toThrow(
      'Missing AWS_SESSION_TOKEN'
    );
  });

  test('rejects unsuccessful or malformed extension responses', async () => {
    const failedFetch = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response('unavailable', { status: 503 }));
    const malformedFetch = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(JSON.stringify({ SecretBinary: 'not-supported' })));

    await expect(
      new SecretsExtensionClient(endpoint, () => 'token', failedFetch).getSecretString('secret')
    ).rejects.toThrow('HTTP 503');
    await expect(
      new SecretsExtensionClient(endpoint, () => 'token', malformedFetch).getSecretString('secret')
    ).rejects.toThrow('does not contain a SecretString');
  });
});
