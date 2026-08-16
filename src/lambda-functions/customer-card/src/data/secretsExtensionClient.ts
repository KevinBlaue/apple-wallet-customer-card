export interface SecretStringProvider {
  getSecretString(secretName: string): Promise<string>;
}

export class SecretsExtensionClient implements SecretStringProvider {
  constructor(
    private readonly endpoint: string,
    private readonly sessionToken: () => string | undefined = () => process.env.AWS_SESSION_TOKEN,
    private readonly fetchImplementation: typeof fetch = fetch
  ) {}

  async getSecretString(secretName: string): Promise<string> {
    const token = this.sessionToken();
    if (!token) {
      throw new Error('Missing AWS_SESSION_TOKEN for the secrets extension');
    }

    const url = new URL(this.endpoint);
    url.searchParams.set('secretId', secretName);
    const response = await this.fetchImplementation(url.toString(), {
      headers: { 'X-Aws-Parameters-Secrets-Token': token },
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`Secrets extension returned HTTP ${response.status}`);
    }

    const body = await response.json();
    if (
      !isRecord(body) ||
      typeof body.SecretString !== 'string' ||
      body.SecretString.length === 0
    ) {
      throw new Error('Secrets extension response does not contain a SecretString');
    }
    return body.SecretString;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
