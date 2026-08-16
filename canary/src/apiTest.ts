import type { IncomingMessage } from 'node:http';
import synthetics from 'Synthetics';
import type { Client } from './client';
import { requestCreateCustomerCard, requestDownloadCustomerPass } from './tests';
import { expectStatus, readResponse } from './validators/response';

export class ApiTest {
  constructor(private readonly client: Client) {}

  async test(): Promise<string[]> {
    const failures: string[] = [];
    let cardId: string | undefined;

    try {
      await synthetics.executeHttpStep(
        'Create customer card',
        requestCreateCustomerCard(this.client),
        async (response: IncomingMessage): Promise<void> => {
          expectStatus(response, 201, 'Create customer card');
          const body = JSON.parse((await readResponse(response)).toString('utf8')) as unknown;
          if (!isRecord(body) || typeof body.id !== 'string') {
            throw new Error('Create customer card response did not include an id');
          }
          cardId = body.id;
        }
      );

      if (!cardId) throw new Error('Create customer card step did not return an id');
      await synthetics.executeHttpStep(
        'Download Apple Wallet pass',
        requestDownloadCustomerPass(this.client, cardId),
        async (response: IncomingMessage): Promise<void> => {
          expectStatus(response, 200, 'Download Apple Wallet pass');
          if (
            !String(response.headers['content-type']).startsWith('application/vnd.apple.pkpass')
          ) {
            throw new Error('Downloaded response is not an Apple Wallet pass');
          }
          const pass = await readResponse(response);
          if (pass.subarray(0, 2).toString('ascii') !== 'PK') {
            throw new Error('Downloaded pass is not a ZIP archive');
          }
        }
      );
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Unknown canary failure');
    }
    return failures;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
