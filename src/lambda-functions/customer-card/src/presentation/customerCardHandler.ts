import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApplePassService } from '../business/applePassService';
import { CustomerCardService } from '../business/customerCardService';
import { CertificateRepository } from '../data/certificateRepository';
import { CustomerCardRepository } from '../data/customerCardRepository';
import { SecretsExtensionClient } from '../data/secretsExtensionClient';
import { RequestError } from './errors';
import { parseCreateCardBody, validateCardId } from './validation';

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const;

type CardService = Pick<CustomerCardService, 'create' | 'generatePass'>;
export type CustomerCardHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

let defaultHandler: CustomerCardHandler | undefined;

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  defaultHandler ??= createCustomerCardHandler(createCustomerCardService());
  return defaultHandler(event);
}

export function createCustomerCardHandler(service: CardService): CustomerCardHandler {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext.requestId;
    const route = `${event.httpMethod} ${event.resource}`;
    console.info(JSON.stringify({ level: 'info', message: 'request.received', requestId, route }));

    try {
      if (event.httpMethod === 'POST' && event.resource === '/cards') {
        const { name } = parseCreateCardBody(event.body);
        const card = await service.create(name);
        console.info(
          JSON.stringify({ level: 'info', message: 'card.created', requestId, cardId: card.id })
        );
        return jsonResponse(201, {
          id: card.id,
          name: card.name,
          createdAt: card.createdAt,
          passUrl: `/cards/${card.id}/pass`,
        });
      }

      if (event.httpMethod === 'GET' && event.resource === '/cards/{cardId}/pass') {
        const cardId = validateCardId(event.pathParameters?.cardId);
        const pass = await service.generatePass(cardId);
        if (!pass) {
          throw new RequestError(404, 'CARD_NOT_FOUND', 'The requested card does not exist');
        }
        return {
          statusCode: 200,
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/vnd.apple.pkpass',
            'Content-Disposition': `attachment; filename="${cardId}.pkpass"`,
          },
          body: pass.toString('base64'),
          isBase64Encoded: true,
        };
      }

      throw new RequestError(404, 'ROUTE_NOT_FOUND', 'The requested route does not exist');
    } catch (error) {
      if (error instanceof RequestError) {
        return jsonResponse(error.statusCode, { code: error.code, message: error.message });
      }
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'request.failed',
          requestId,
          route,
          errorType: error instanceof Error ? error.name : 'UnknownError',
        })
      );
      return jsonResponse(500, {
        code: 'INTERNAL_ERROR',
        message: 'The request failed unexpectedly',
      });
    }
  };
}

function createCustomerCardService(): CustomerCardService {
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });
  const certificates = new CertificateRepository(
    new SecretsExtensionClient(requiredEnvironment('SECRETS_EXTENSION_URL')),
    requiredEnvironment('CERTIFICATE_SECRET_NAME')
  );
  return new CustomerCardService({
    repository: new CustomerCardRepository(documentClient, requiredEnvironment('CARDS_TABLE_NAME')),
    passGenerator: new ApplePassService(certificates),
    cardTtlDays: positiveIntegerEnvironment('CARD_TTL_DAYS'),
  });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function positiveIntegerEnvironment(name: string): number {
  const value = Number(requiredEnvironment(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function jsonResponse(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
