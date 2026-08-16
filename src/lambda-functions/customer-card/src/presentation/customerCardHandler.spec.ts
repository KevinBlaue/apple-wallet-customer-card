import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { CustomerCard, CustomerCardService } from '../business/customerCardService';
import { createCustomerCardHandler } from './customerCardHandler';
import type { CustomerCardHandler } from './customerCardHandler';

const CARD_ID = '018f47a7-9b9e-7d6c-8b8d-9a1a7f063130';
const CARD: CustomerCard = {
  id: CARD_ID,
  name: 'Ada',
  createdAt: '2026-08-16T10:00:00.000Z',
  expiresAt: 1_777_000_000,
};

describe('customerCardHandler', () => {
  const create = jest.fn<
    ReturnType<CustomerCardService['create']>,
    Parameters<CustomerCardService['create']>
  >();
  const generatePass = jest.fn<
    ReturnType<CustomerCardService['generatePass']>,
    Parameters<CustomerCardService['generatePass']>
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  test('creates a customer card through the business service', async () => {
    create.mockResolvedValue(CARD);
    const response = await subject()(event('POST', '/cards', '{"name":"Ada"}'));
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      id: CARD_ID,
      name: 'Ada',
      createdAt: CARD.createdAt,
      passUrl: `/cards/${CARD_ID}/pass`,
    });
    expect(create).toHaveBeenCalledWith('Ada');
    expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining('Ada'));
  });

  test('returns a client error for malformed input', async () => {
    const response = await subject()(event('POST', '/cards', '{'));
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'INVALID_JSON' });
    expect(create).not.toHaveBeenCalled();
  });

  test('returns a base64 encoded Apple Wallet pass', async () => {
    generatePass.mockResolvedValue(Buffer.from('PK-pass'));
    const response = await subject()(
      event('GET', '/cards/{cardId}/pass', null, { cardId: CARD_ID })
    );
    expect(response).toMatchObject({
      statusCode: 200,
      body: Buffer.from('PK-pass').toString('base64'),
      isBase64Encoded: true,
    });
    expect(response.headers?.['Content-Type']).toBe('application/vnd.apple.pkpass');
    expect(generatePass).toHaveBeenCalledWith(CARD_ID);
  });

  test('returns not found when no card exists', async () => {
    generatePass.mockResolvedValue(undefined);
    const response = await subject()(
      event('GET', '/cards/{cardId}/pass', null, { cardId: CARD_ID })
    );
    expect(response.statusCode).toBe(404);
  });

  test('sanitizes unexpected errors and unknown routes', async () => {
    create.mockRejectedValue(new Error('database credentials leaked'));
    const failed = await subject()(event('POST', '/cards', '{"name":"Ada"}'));
    const unknown = await subject()(event('DELETE', '/cards', null));
    expect(JSON.parse(failed.body)).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'The request failed unexpectedly',
    });
    expect(failed.body).not.toContain('credentials');
    expect(unknown.statusCode).toBe(404);
  });

  function subject(): CustomerCardHandler {
    return createCustomerCardHandler({ create, generatePass });
  }
});

function event(
  httpMethod: string,
  resource: string,
  body: string | null,
  pathParameters: Record<string, string> | null = null
): APIGatewayProxyEvent {
  return {
    body,
    httpMethod,
    resource,
    pathParameters,
    requestContext: { requestId: 'request-123' },
  } as unknown as APIGatewayProxyEvent;
}
