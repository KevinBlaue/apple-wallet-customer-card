declare module 'Synthetics' {
  import type { IncomingMessage } from 'node:http';
  import type { RequestOptions } from 'node:https';

  interface CanaryRequestOptions extends RequestOptions {
    readonly body?: string;
  }

  const synthetics: {
    executeHttpStep(
      name: string,
      request: CanaryRequestOptions,
      validator: (response: IncomingMessage) => Promise<unknown>
    ): Promise<void>;
    getCanaryUserAgentString(): string;
    getConfiguration(): {
      setConfig(configuration: Record<string, unknown>): void;
    };
  };
  export default synthetics;
}

declare module 'SyntheticsLogger' {
  const logger: {
    info(message: string): void;
    error(message: string): void;
  };
  export default logger;
}
