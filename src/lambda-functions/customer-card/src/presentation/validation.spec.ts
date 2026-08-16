import { RequestError } from './errors';
import { parseCreateCardBody, validateCardId } from './validation';

describe('request validation', () => {
  test('normalizes a valid customer name', () => {
    expect(parseCreateCardBody('{"name":"  Ada Lovelace  "}')).toEqual({ name: 'Ada Lovelace' });
  });

  test.each([
    [null, 400, 'INVALID_JSON'],
    ['{', 400, 'INVALID_JSON'],
    ['{}', 422, 'INVALID_NAME'],
    ['{"name":"   "}', 422, 'INVALID_NAME'],
    [`{"name":"${'a'.repeat(81)}"}`, 422, 'INVALID_NAME'],
    ['{"name":"Ada","internal":true}', 422, 'UNEXPECTED_FIELDS'],
  ])('rejects an invalid body', (body, statusCode, code) => {
    expectRequestError(() => parseCreateCardBody(body), statusCode, code);
  });

  test('accepts a UUID and rejects arbitrary identifiers', () => {
    const id = '018f47a7-9b9e-7d6c-8b8d-9a1a7f063130';
    expect(validateCardId(id)).toBe(id);
    expectRequestError(() => validateCardId('not-a-uuid'), 400, 'INVALID_CARD_ID');
  });
});

function expectRequestError(operation: () => unknown, statusCode: number, code: string): void {
  try {
    operation();
    throw new Error('Expected operation to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(RequestError);
    expect(error).toMatchObject({ statusCode, code });
  }
}
