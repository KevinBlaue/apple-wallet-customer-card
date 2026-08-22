import { RemovalPolicy } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { App } from './app';
import { BaseStack } from './baseStack';

class InspectableStack extends BaseStack {
  constructor(app: App) {
    super(app, 'walletApi');
  }

  inspect(): void {
    expect(this.stringValue('apiStageName')).toBe('v1');
    expect(this.numberValue('cardTtlDays')).toBeGreaterThan(0);
    expect(this.booleanValue('canaryEnabled')).toBe(false);
  }

  policies(): { removal: RemovalPolicy; retention: RetentionDays } {
    return { removal: this.removalPolicy(), retention: this.logRetention() };
  }

  invalidValues(): void {
    expect(() => this.stringValue('cardTtlDays')).toThrow('non-empty string');
    expect(() => this.numberValue('apiStageName')).toThrow('must be a number');
    expect(() => this.booleanValue('apiStageName')).toThrow('must be a boolean');
    expect(() => this.removalPolicy('apiStageName')).toThrow('destroy or retain');
    expect(() => this.logRetention('throttlingBurstLimit')).toThrow('must be 7 or 30 days');
  }
}

describe('BaseStack', () => {
  test.each([
    ['dev', RemovalPolicy.DESTROY, RetentionDays.ONE_WEEK],
    ['prod', RemovalPolicy.RETAIN, RetentionDays.ONE_MONTH],
  ])('loads defaults and %s overrides', (environmentName, removal, retention) => {
    const app = new App({ context: { environment: environmentName } });
    const stack = new InspectableStack(app);
    stack.inspect();
    expect(stack.policies()).toEqual({ removal, retention });
    stack.invalidValues();
  });
});
