import type { IncomingMessage } from 'node:http';

export async function readResponse(response: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

export function expectStatus(response: IncomingMessage, expected: number, operation: string): void {
  if (response.statusCode !== expected) {
    throw new Error(`${operation} returned ${response.statusCode}; expected ${expected}`);
  }
}
