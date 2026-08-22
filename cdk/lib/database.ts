import { CfnOutput } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { BaseStack } from './constructs/baseStack';
import type { StackProps } from './constructs/baseStack';
import type { App } from './constructs/app';

export class DatabaseStack extends BaseStack {
  readonly cardsTable: Table;

  constructor(app: App, id: string, props?: StackProps) {
    super(app, id, props);

    this.cardsTable = new Table(this, 'Cards', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      deletionProtection: this.booleanValue('deletionProtection'),
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: this.booleanValue('pointInTimeRecovery'),
      },
      removalPolicy: this.removalPolicy(),
      timeToLiveAttribute: 'expiresAt',
    });

    if (this.booleanValue('seedDemoData')) {
      this.seedDemoCard();
    }

    new CfnOutput(this, 'CardsTableName', { value: this.cardsTable.tableName });
  }

  private seedDemoCard(): void {
    new AwsCustomResource(this, 'DemoCard', {
      installLatestAwsSdk: false,
      onCreate: {
        service: 'DynamoDB',
        action: 'putItem',
        parameters: {
          TableName: this.cardsTable.tableName,
          Item: {
            id: { S: '00000000-0000-4000-8000-000000000001' },
            name: { S: 'DEMO Customer - portfolio-user@example.invalid' },
            createdAt: { S: '2026-01-01T00:00:00.000Z' },
            expiresAt: { N: '4102444800' },
            dataClassification: { S: 'synthetic' },
          },
          ConditionExpression: 'attribute_not_exists(id)',
        },
        physicalResourceId: PhysicalResourceId.of('DEMO-CARD-001'),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [this.cardsTable.tableArn] }),
    });
  }
}
