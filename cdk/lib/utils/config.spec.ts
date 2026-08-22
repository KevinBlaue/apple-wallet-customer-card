import { join } from 'node:path';
import { deepMerge, loadEnvironmentConfiguration } from './config';

describe('environment configuration', () => {
  test('merges defaults with the selected environment', () => {
    const directory = join(__dirname, '..', '..', 'environments');
    expect(loadEnvironmentConfiguration(directory, 'dev', 'walletApi')).toMatchObject({
      apiStageName: 'v1',
      applicationLogLevel: 'DEBUG',
      cardTtlDays: 7,
      certificateSecretName: '/apple-wallet-customer-card/{environment}/certificates',
      removalPolicy: 'destroy',
    });
    expect(loadEnvironmentConfiguration(directory, 'prod', 'walletApi')).toMatchObject({
      applicationLogLevel: 'INFO',
      cardTtlDays: 30,
      removalPolicy: 'retain',
    });
  });

  test('uses defaults when a dynamic environment has no override directory', () => {
    const directory = join(__dirname, '..', '..', 'environments');
    expect(loadEnvironmentConfiguration(directory, 'pr-123', 'database')).toMatchObject({
      removalPolicy: 'destroy',
      seedDemoData: true,
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
