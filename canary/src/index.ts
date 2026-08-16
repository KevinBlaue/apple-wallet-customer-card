import synthetics from 'Synthetics';
import log from 'SyntheticsLogger';
import { ApiTest } from './apiTest';
import { Client } from './client';

export async function handler(): Promise<string> {
  const endpoint = process.env.API_URL;
  if (!endpoint) throw new Error('Missing required environment variable API_URL');

  synthetics.getConfiguration().setConfig({
    includeRequestHeaders: true,
    includeResponseHeaders: true,
    includeRequestBody: false,
    includeResponseBody: false,
    restrictedHeaders: ['Authorization', 'X-Amz-Security-Token'],
  });

  const client = new Client(endpoint, synthetics.getCanaryUserAgentString());
  const failures = await new ApiTest(client).test();
  if (failures.length > 0) {
    const message = `Canary failed: ${failures.join('. ')}`;
    log.error(message);
    throw new Error(message);
  }
  log.info('Canary completed successfully');
  return 'Canary completed successfully';
}
