import { Template } from 'aws-cdk-lib/assertions';
import { App } from './constructs/app';
import { DatabaseStack } from './database';
import { WalletApiStack } from './walletApi';

describe('WalletApiStack', () => {
  test('synthesizes a small, least-privilege serverless architecture', () => {
    const app = new App({ context: { environment: 'dev' } });
    const database = new DatabaseStack(app, 'database', {
      env: { account: '111111111111', region: 'eu-central-1' },
    });
    const stack = new WalletApiStack(app, 'walletApi', {
      cardsTable: database.cardsTable,
      env: { account: '111111111111', region: 'eu-central-1' },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
