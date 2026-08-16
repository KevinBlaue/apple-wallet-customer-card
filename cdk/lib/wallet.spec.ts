import { Template } from 'aws-cdk-lib/assertions';
import { App } from './constructs/app';
import { WalletStack } from './wallet';

describe('WalletStack', () => {
  test('synthesizes a small, least-privilege serverless architecture', () => {
    const app = new App({ context: { environment: 'dev' } });
    const stack = new WalletStack(app, 'wallet', {
      env: { account: '111111111111', region: 'eu-central-1' },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
