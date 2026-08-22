import { App } from './constructs/app';
import { createStacks } from './stacks';

describe('stack wiring', () => {
  test('uses environment-prefixed names and makes the API depend on the database', () => {
    const app = new App({ context: { environment: 'pr-123' } });
    const { database, iamGitHub, walletApi } = createStacks(app);

    expect(database.stackName).toBe('pr-123-database');
    expect(walletApi.stackName).toBe('pr-123-walletApi');
    expect(walletApi.dependencies).toContain(database);
    expect(iamGitHub).toBeUndefined();
  });

  test('includes the GitHub IAM stack for a persistent environment', () => {
    const app = new App({ context: { environment: 'dev' } });
    const { iamGitHub } = createStacks(app);
    expect(iamGitHub?.stackName).toBe('dev-iamGitHub');
  });
});
