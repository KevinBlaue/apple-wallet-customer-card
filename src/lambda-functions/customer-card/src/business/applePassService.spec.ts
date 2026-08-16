const addedBufferNames: string[] = [];
function addBuffer(name: string): void {
  addedBufferNames.push(name);
}
function getAsBuffer(): Buffer {
  return Buffer.from('PK-generated-pass');
}
let capturedBarcode: { message: string; format: string } | undefined;
function setBarcodes(barcode: { message: string; format: string }): void {
  capturedBarcode = barcode;
}
const passInstance = {
  addBuffer,
  getAsBuffer,
  setBarcodes,
  type: undefined,
  primaryFields: [] as unknown[],
  secondaryFields: [] as unknown[],
  backFields: [] as unknown[],
};
let capturedProperties: Record<string, unknown> | undefined;
function pkPass(
  _buffers: unknown,
  _certificates: unknown,
  properties: Record<string, unknown>
): typeof passInstance {
  capturedProperties = properties;
  return passInstance;
}

jest.mock('passkit-generator', () => ({ PKPass: pkPass }));

import { ApplePassService } from './applePassService';
import type { CertificateRepository } from './applePassService';
import type { CustomerCard } from './customerCardService';

const CARD: CustomerCard = {
  id: '018f47a7-9b9e-7d6c-8b8d-9a1a7f063130',
  name: 'Ada Lovelace',
  createdAt: '2026-08-16T10:00:00.000Z',
  expiresAt: 1_777_000_000,
};

describe('ApplePassService', () => {
  beforeEach(() => {
    passInstance.type = undefined;
    passInstance.primaryFields.length = 0;
    passInstance.secondaryFields.length = 0;
    passInstance.backFields.length = 0;
    addedBufferNames.length = 0;
    capturedProperties = undefined;
    capturedBarcode = undefined;
  });

  test('builds a store card whose QR payload is the generated UUID', async () => {
    const certificates: CertificateRepository = {
      get: jest.fn().mockResolvedValue({
        organizationName: 'Example Organization',
        passTypeIdentifier: 'pass.example.customer-card',
        signerCert: 'signer-cert',
        signerKey: 'signer-key',
        teamIdentifier: 'TEAM123456',
        wwdr: 'wwdr',
      }),
    };
    const pass = await new ApplePassService(certificates).generate(CARD);

    expect(pass).toEqual(Buffer.from('PK-generated-pass'));
    expect(capturedProperties?.serialNumber).toBe(CARD.id);
    expect(capturedBarcode).toMatchObject({
      message: CARD.id,
      format: 'PKBarcodeFormatQR',
    });
    expect(passInstance.type).toBe('storeCard');
    expect(passInstance.primaryFields[0]).toMatchObject({ value: CARD.name });
    expect(addedBufferNames).toEqual(['icon.png', 'icon@2x.png']);
  });
});
