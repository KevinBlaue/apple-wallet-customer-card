import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  CustomerCard,
  CustomerCardRepository as Repository,
} from '../business/customerCardService';

export class CustomerCardRepository implements Repository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async create(card: CustomerCard): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: card,
        ConditionExpression: 'attribute_not_exists(id)',
      })
    );
  }

  async get(id: string): Promise<CustomerCard | undefined> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
        ConsistentRead: true,
      })
    );
    return response.Item as CustomerCard | undefined;
  }
}
