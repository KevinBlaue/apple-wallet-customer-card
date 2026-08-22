import { CfnOutput, Stack } from 'aws-cdk-lib';
import {
  OpenIdConnectProvider,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import type { IOpenIdConnectProvider } from 'aws-cdk-lib/aws-iam';
import { BaseStack } from './constructs/baseStack';
import type { StackProps } from './constructs/baseStack';
import type { App } from './constructs/app';

const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com';

export class IamRoleGitHubStack extends BaseStack {
  constructor(app: App, id: string, props?: StackProps) {
    super(app, id, props);

    const provider = this.githubProvider();
    const repository = `${this.stringValue('githubOwner')}/${this.stringValue('githubRepository')}`;
    const role = new Role(this, 'DeployRole', {
      assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { [`${GITHUB_OIDC_HOST}:aud`]: 'sts.amazonaws.com' },
        StringLike: { [`${GITHUB_OIDC_HOST}:sub`]: `repo:${repository}:*` },
      }),
      description: `GitHub Actions deployment role for ${repository}`,
      inlinePolicies: {
        CdkDeploymentAccess: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['sts:AssumeRole', 'sts:TagSession'],
              resources: [
                `arn:aws:iam::${this.account}:role/cdk-hnb659fds-*-${this.account}-${this.region}`,
              ],
            }),
            new PolicyStatement({
              actions: ['cloudformation:DescribeStacks'],
              resources: ['*'],
            }),
            new PolicyStatement({
              actions: ['ssm:GetParameter'],
              resources: [
                `arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/hnb659fds/version`,
              ],
            }),
          ],
        }),
      },
    });

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }

  private githubProvider(): IOpenIdConnectProvider {
    if (this.booleanValue('createOidcProvider')) {
      return new OpenIdConnectProvider(this, 'GitHubOidcProvider', {
        clientIds: ['sts.amazonaws.com'],
        url: `https://${GITHUB_OIDC_HOST}`,
      });
    }

    const providerArn = Stack.of(this).formatArn({
      service: 'iam',
      region: '',
      resource: 'oidc-provider',
      resourceName: GITHUB_OIDC_HOST,
    });
    return OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidcProvider',
      providerArn
    );
  }
}
