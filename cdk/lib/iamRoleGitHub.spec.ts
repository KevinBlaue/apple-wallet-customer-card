import { Match, Template } from 'aws-cdk-lib/assertions';
import { App } from './constructs/app';
import { IamRoleGitHubStack } from './iamRoleGitHub';

describe('IamRoleGitHubStack', () => {
  test('trusts only this repository through the GitHub OIDC audience', () => {
    const app = new App({ context: { environment: 'dev' } });
    const stack = new IamRoleGitHubStack(app, 'iamGitHub', {
      env: { account: '111111111111', region: 'eu-central-1' },
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
              },
              StringLike: {
                'token.actions.githubusercontent.com:sub':
                  'repo:KevinBlaue/apple-wallet-customer-card:*',
              },
            },
          }),
        ],
      },
    });
    expect(JSON.stringify(template.toJSON())).not.toContain('repo:another-owner/another-repo:');
    expect(template.toJSON()).toMatchSnapshot();
  });
});
