import { Match, Template } from 'aws-cdk-lib/assertions';
import { App } from './constructs/app';
import { DatabaseStack } from './database';

describe('DatabaseStack', () => {
  test('creates an ephemeral table and clearly marked demo data for development', () => {
    const app = new App({ context: { environment: 'dev' } });
    const stack = new DatabaseStack(app, 'database', {
      env: { account: '111111111111', region: 'eu-central-1' },
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
    });
    template.hasResourceProperties('Custom::AWS', { InstallLatestAwsSdk: false });
    const synthesizedTemplate = template.toJSON();
    expect(JSON.stringify(synthesizedTemplate)).toContain(
      'DEMO Customer - portfolio-user@example.invalid'
    );
    expect(JSON.stringify(synthesizedTemplate)).toContain('dataClassification');
    expect(synthesizedTemplate).toMatchSnapshot();
  });

  test('retains the production table and does not seed demo data', () => {
    const app = new App({ context: { environment: 'prod' } });
    const stack = new DatabaseStack(app, 'database', {
      env: { account: '111111111111', region: 'eu-central-1' },
    });
    const template = Template.fromStack(stack);

    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Properties: Match.objectLike({
        DeletionProtectionEnabled: true,
        PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      }),
    });
    template.resourceCountIs('Custom::AWS', 0);
  });
});
