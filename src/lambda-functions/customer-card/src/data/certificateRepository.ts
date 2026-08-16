import type {
  ApplePassMaterial,
  CertificateRepository as Repository,
} from '../business/applePassService';
import type { SecretStringProvider } from './secretsExtensionClient';

export class CertificateRepository implements Repository {
  constructor(
    private readonly secrets: SecretStringProvider,
    private readonly secretName: string
  ) {}

  async get(): Promise<ApplePassMaterial> {
    return parseApplePassMaterial(await this.secrets.getSecretString(this.secretName));
  }
}

export function parseApplePassMaterial(secretString: string): ApplePassMaterial {
  let value: unknown;
  try {
    value = JSON.parse(secretString) as unknown;
  } catch {
    throw new Error('The Apple certificate secret is not valid JSON');
  }
  if (!isRecord(value)) {
    throw new Error('The Apple certificate secret must be a JSON object');
  }

  const signerKeyPassphrase = optionalString(value, 'signerKeyPassphrase');
  return {
    organizationName: requiredString(value, 'organizationName'),
    passTypeIdentifier: requiredString(value, 'passTypeIdentifier'),
    signerCert: requiredString(value, 'signerCert'),
    signerKey: requiredString(value, 'signerKey'),
    ...(signerKeyPassphrase ? { signerKeyPassphrase } : {}),
    teamIdentifier: requiredString(value, 'teamIdentifier'),
    wwdr: requiredString(value, 'wwdr'),
  };
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`The Apple certificate secret is missing ${key}`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
