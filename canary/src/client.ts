import type { RequestOptions } from 'node:https';

export interface CanaryRequest extends RequestOptions {
  readonly body?: string;
}

export class Client {
  private readonly baseUrl: URL;

  constructor(
    baseUrl: string,
    private readonly userAgent: string
  ) {
    this.baseUrl = new URL(baseUrl);
  }

  createRequest(
    method: 'GET' | 'POST',
    resource: string,
    body?: Record<string, unknown>
  ): CanaryRequest {
    const url = new URL(resource.replace(/^\//, ''), this.baseUrl);
    return {
      hostname: url.hostname,
      method,
      path: `${url.pathname}${url.search}`,
      port: 443,
      protocol: 'https:',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
  }
}
