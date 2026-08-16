import type { CustomerCardPassGenerator, CustomerCardRepository } from './customerCardService';
import { CustomerCardService } from './customerCardService';

const CARD_ID = '018f47a7-9b9e-7d6c-8b8d-9a1a7f063130';
const NOW = new Date('2026-08-16T10:00:00.000Z');

describe('CustomerCardService', () => {
  const create = jest.fn<
    ReturnType<CustomerCardRepository['create']>,
    Parameters<CustomerCardRepository['create']>
  >();
  const get = jest.fn<
    ReturnType<CustomerCardRepository['get']>,
    Parameters<CustomerCardRepository['get']>
  >();
  const generate = jest.fn<
    ReturnType<CustomerCardPassGenerator['generate']>,
    Parameters<CustomerCardPassGenerator['generate']>
  >();
  const repository: CustomerCardRepository = { create, get };
  const passGenerator: CustomerCardPassGenerator = { generate };

  beforeEach(() => jest.clearAllMocks());

  test('creates and stores a short-lived customer card', async () => {
    const service = subject();
    await expect(service.create('Ada')).resolves.toEqual({
      id: CARD_ID,
      name: 'Ada',
      createdAt: NOW.toISOString(),
      expiresAt: Math.floor(NOW.getTime() / 1000) + 7 * 86_400,
    });
    expect(create).toHaveBeenCalledWith({
      id: CARD_ID,
      name: 'Ada',
      createdAt: NOW.toISOString(),
      expiresAt: Math.floor(NOW.getTime() / 1000) + 7 * 86_400,
    });
  });

  test('generates a pass for an existing card', async () => {
    const card = {
      id: CARD_ID,
      name: 'Ada',
      createdAt: NOW.toISOString(),
      expiresAt: 1_777_000_000,
    };
    get.mockResolvedValue(card);
    generate.mockResolvedValue(Buffer.from('PK-pass'));
    await expect(subject().generatePass(CARD_ID)).resolves.toEqual(Buffer.from('PK-pass'));
    expect(generate).toHaveBeenCalledWith(card);
  });

  test('does not call the generator when the card does not exist', async () => {
    get.mockResolvedValue(undefined);
    await expect(subject().generatePass(CARD_ID)).resolves.toBeUndefined();
    expect(generate).not.toHaveBeenCalled();
  });

  function subject(): CustomerCardService {
    return new CustomerCardService({
      repository,
      passGenerator,
      cardTtlDays: 7,
      createId: () => CARD_ID,
      now: () => NOW,
    });
  }
});
