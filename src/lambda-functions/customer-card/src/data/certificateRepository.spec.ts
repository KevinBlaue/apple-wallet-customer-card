import { CertificateRepository, parseApplePassMaterial } from './certificateRepository';
import type { SecretStringProvider } from './secretsExtensionClient';

const MATERIAL = {
  organizationName: 'Example Organization',
  passTypeIdentifier: 'pass.example.customer-card',
  signerCert: 'signer-cert-base64',
  signerKey: 'signer-key-base64',
  signerKeyPassphrase: 'optional-passphrase',
  teamIdentifier: 'TEAM123456',
  wwdr: 'wwdr-base64',
};

describe('CertificateRepository', () => {
  test('parses all required Apple signing values', () => {
    expect(parseApplePassMaterial(JSON.stringify(MATERIAL))).toEqual(MATERIAL);
  });

  test.each(['not-json', '[]', '{"organizationName":"Example"}'])(
    'rejects invalid certificate material',
    (secret) => {
      expect(() => parseApplePassMaterial(secret)).toThrow('Apple certificate secret');
    }
  );

  test('loads signing material through the secrets extension provider', async () => {
    const getSecretString = jest.fn().mockResolvedValue(JSON.stringify(MATERIAL));
    const repository = new CertificateRepository(
      { getSecretString } as SecretStringProvider,
      '/demo/certificates'
    );
    await expect(repository.get()).resolves.toEqual(MATERIAL);
    await expect(repository.get()).resolves.toEqual(MATERIAL);
    expect(getSecretString).toHaveBeenCalledTimes(2);
    expect(getSecretString).toHaveBeenCalledWith('/demo/certificates');
  });
});
