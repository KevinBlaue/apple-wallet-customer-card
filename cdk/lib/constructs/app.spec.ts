import { App } from './app';

describe('App', () => {
  test('loads app defaults and environment-specific tags', () => {
    const app = new App({ context: { environment: 'dev' } });
    expect(app.environmentName).toBe('dev');
    expect(app.defaultRegion).toBe('eu-central-1');
    expect(app.stackEnvironment).toMatchObject({ region: 'eu-central-1' });
    expect(app.resourceTags).toEqual({
      project: 'apple-wallet-customer-card',
      'managed-by': 'aws-cdk',
      'data-classification': 'synthetic',
      lifecycle: 'ephemeral',
    });
    expect(app.iamGitHubEnabled).toBe(true);
  });

  test('uses defaults for a dynamic pull-request environment', () => {
    const app = new App({ context: { environment: 'pr-123' } });
    expect(app.environmentName).toBe('pr-123');
    expect(app.iamGitHubEnabled).toBe(false);
    expect(app.resourceTags).toEqual({
      project: 'apple-wallet-customer-card',
      'managed-by': 'aws-cdk',
      'data-classification': 'synthetic',
    });
  });

  test('validates the environment context', () => {
    expect(() => new App()).toThrow('lowercase environment name');
    expect(() => new App({ context: { environment: '../prod' } })).toThrow(
      'lowercase environment name'
    );
  });
});
