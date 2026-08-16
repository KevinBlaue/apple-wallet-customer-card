import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { CustomerCard } from '../business/customerCardService';
import { CustomerCardRepository } from './customerCardRepository';

const CARD: CustomerCard = {
  id: '018f47a7-9b9e-7d6c-8b8d-9a1a7f063130',
  name: 'Ada',
  createdAt: '2026-08-16T10:00:00.000Z',
  expiresAt: 1_777_000_000,
};

describe('CustomerCardRepository', () => {
  test('creates cards conditionally to protect UUID uniqueness', async () => {
    let capturedCommand: unknown;
    const send = jest.fn((command: unknown) => {
      capturedCommand = command;
      return Promise.resolve({});
    });
    const store = new CustomerCardRepository(
      { send } as unknown as DynamoDBDocumentClient,
      'cards-table'
    );
    await store.create(CARD);
    expect(capturedCommand).toBeInstanceOf(PutCommand);
    if (!(capturedCommand instanceof PutCommand)) throw new Error('Expected a PutCommand');
    expect(capturedCommand.input).toMatchObject({
      TableName: 'cards-table',
      Item: CARD,
      ConditionExpression: 'attribute_not_exists(id)',
    });
  });

  test('reads a card consistently', async () => {
    let capturedCommand: unknown;
    const send = jest.fn((command: unknown) => {
      capturedCommand = command;
      return Promise.resolve({ Item: CARD });
    });
    const store = new CustomerCardRepository(
      { send } as unknown as DynamoDBDocumentClient,
      'cards-table'
    );
    await expect(store.get(CARD.id)).resolves.toEqual(CARD);
    expect(capturedCommand).toBeInstanceOf(GetCommand);
    if (!(capturedCommand instanceof GetCommand)) throw new Error('Expected a GetCommand');
    expect(capturedCommand.input).toMatchObject({
      TableName: 'cards-table',
      Key: { id: CARD.id },
      ConsistentRead: true,
    });
  });
});
