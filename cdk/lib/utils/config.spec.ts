import { join } from 'node:path';
import { deepMerge, loadEnvironmentConfiguration } from './config';

describe('environment configuration', () => {
  test('merges defaults with the selected environment', () => {
    const directory = join(__dirname, '..', '..', 'environments');
    expect(loadEnvironmentConfiguration(directory, 'dev', 'wallet')).toMatchObject({
      apiStageName: 'v1',
      applicationLogLevel: 'DEBUG',
      cardTtlDays: 7,
      certificateSecretName: '/apple-wallet-customer-card/dev/certificates',
      removalPolicy: 'destroy',
    });
    expect(loadEnvironmentConfiguration(directory, 'prod', 'wallet')).toMatchObject({
      applicationLogLevel: 'INFO',
      cardTtlDays: 30,
      deletionProtection: true,
      removalPolicy: 'retain',
    });
  });

  test('deep-merges nested objects without mutating defaults', () => {
    const defaults = { tags: { project: 'wallet', lifecycle: 'default' }, region: 'eu-central-1' };
    expect(deepMerge(defaults, { tags: { lifecycle: 'ephemeral' } })).toEqual({
      tags: { project: 'wallet', lifecycle: 'ephemeral' },
      region: 'eu-central-1',
    });
    expect(defaults.tags.lifecycle).toBe('default');
  });
});
