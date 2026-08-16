import { RequestError } from './errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreateCardBody {
  readonly name: string;
}

export function parseCreateCardBody(body: string | null): CreateCardBody {
  if (!body) {
    throw new RequestError(400, 'INVALID_JSON', 'A JSON request body is required');
  }

  let value: unknown;
  try {
    value = JSON.parse(body) as unknown;
  } catch {
    throw new RequestError(400, 'INVALID_JSON', 'The request body must contain valid JSON');
  }

  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new RequestError(422, 'INVALID_NAME', 'The name field must be a string');
  }
  const name = value.name.trim();
  if (name.length < 1 || name.length > 80) {
    throw new RequestError(
      422,
      'INVALID_NAME',
      'The name must contain between 1 and 80 characters'
    );
  }
  if (Object.keys(value).some((key) => key !== 'name')) {
    throw new RequestError(422, 'UNEXPECTED_FIELDS', 'The request contains unsupported fields');
  }
  return { name };
}

export function validateCardId(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new RequestError(400, 'INVALID_CARD_ID', 'The card ID must be a valid UUID');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
