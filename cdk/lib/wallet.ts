import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Architecture,
  ApplicationLogLevel,
  LoggingFormat,
  Runtime,
  LayerVersion,
  SystemLogLevel,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  AccessLogFormat,
  ApiDefinition,
  EndpointType,
  LogGroupLogDestination,
  MethodLoggingLevel,
  SpecRestApi,
} from 'aws-cdk-lib/aws-apigateway';
import type { CfnRestApi } from 'aws-cdk-lib/aws-apigateway';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import {
  Canary,
  Cleanup,
  Code,
  Runtime as SyntheticsRuntime,
  Schedule,
  Test,
} from 'aws-cdk-lib/aws-synthetics';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { load } from 'js-yaml';
import { BaseStack } from './constructs/baseStack';
import type { StackProps } from './constructs/baseStack';
import type { App } from './constructs/app';

type OpenApiDocument = Record<string, unknown> & {
  paths: Record<string, Record<string, Record<string, unknown>>>;
};

export class WalletStack extends BaseStack {
  constructor(app: App, id: string, props?: StackProps) {
    super(app, id, props);

    const removalPolicy = this.removalPolicy();
    const cards = new Table(this, 'Cards', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      deletionProtection: this.booleanValue('deletionProtection'),
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: this.booleanValue('pointInTimeRecovery'),
      },
      removalPolicy,
      timeToLiveAttribute: 'expiresAt',
    });

    const certificateSecret = Secret.fromSecretNameV2(
      this,
      'AppleCertificates',
      this.stringValue('certificateSecretName')
    );

    const functionLogGroup = new LogGroup(this, 'WalletFunctionLogs', {
      logGroupName: `/aws/lambda/${Stack.of(this).stackName}-wallet`,
      retention: this.logRetention(),
      removalPolicy,
    });
    const secretsExtension = LayerVersion.fromLayerVersionArn(
      this,
      'ParametersAndSecretsExtension',
      StringParameter.valueForStringParameter(
        this,
        this.stringValue('secretsExtensionLayerParameterName')
      )
    );

    const walletFunction = new NodejsFunction(this, 'WalletFunction', {
      entry: join(
        __dirname,
        '..',
        '..',
        'src',
        'lambda-functions',
        'customer-card',
        'src',
        'index.ts'
      ),
      handler: 'handler',
      functionName: `${Stack.of(this).stackName}-wallet`,
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(15),
      memorySize: 512,
      tracing: Tracing.ACTIVE,
      layers: [secretsExtension],
      logGroup: functionLogGroup,
      loggingFormat: LoggingFormat.JSON,
      applicationLogLevelV2: this.applicationLogLevel(),
      systemLogLevelV2: SystemLogLevel.WARN,
      bundling: {
        minify: this.booleanValue('minify'),
        sourceMap: true,
        target: 'node24',
      },
      environment: {
        CARDS_TABLE_NAME: cards.tableName,
        CERTIFICATE_SECRET_NAME: certificateSecret.secretName,
        CARD_TTL_DAYS: String(this.numberValue('cardTtlDays')),
        SECRETS_EXTENSION_URL: 'http://localhost:2773/secretsmanager/get',
        SECRETS_MANAGER_TTL: String(this.numberValue('secretsCacheTtlSeconds')),
      },
    });
    cards.grantReadWriteData(walletFunction);
    certificateSecret.grantRead(walletFunction);

    const apiRole = new Role(this, 'ApiGatewayInvokeRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    apiRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [walletFunction.functionArn],
      })
    );

    const accessLogs = new LogGroup(this, 'ApiAccessLogs', {
      retention: this.logRetention(),
      removalPolicy,
    });
    const api = new SpecRestApi(this, 'WalletApi', {
      apiDefinition: ApiDefinition.fromInline(
        this.openApiDocument(apiRole.roleArn, walletFunction.functionArn)
      ),
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        stageName: this.stringValue('apiStageName'),
        accessLogDestination: new LogGroupLogDestination(accessLogs),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields({
          ip: true,
          caller: false,
          user: false,
          requestTime: true,
          httpMethod: true,
          resourcePath: true,
          status: true,
          protocol: true,
          responseLength: true,
        }),
        dataTraceEnabled: false,
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
        throttlingBurstLimit: this.numberValue('throttlingBurstLimit'),
        throttlingRateLimit: this.numberValue('throttlingRateLimit'),
      },
    });
    const cfnApi = api.node.defaultChild as CfnRestApi;
    cfnApi.binaryMediaTypes = ['application/vnd.apple.pkpass'];

    if (this.booleanValue('canaryEnabled')) {
      new Canary(this, 'WalletCanary', {
        canaryName: `${this.environmentName}-wallet-api`,
        test: Test.custom({
          code: Code.fromAsset(join(__dirname, '..', '..', 'canary', 'dist')),
          handler: 'canary/index.handler',
        }),
        runtime: SyntheticsRuntime.SYNTHETICS_NODEJS_PUPPETEER_11_0,
        schedule: Schedule.once(),
        cleanup: Cleanup.LAMBDA,
        environmentVariables: { API_URL: api.url },
        startAfterCreation: true,
      });
    }

    new CfnOutput(this, 'ApiUrl', { value: api.url });
    new CfnOutput(this, 'CertificateSecretName', { value: certificateSecret.secretName });
  }

  private applicationLogLevel(): ApplicationLogLevel {
    const configured = this.stringValue('applicationLogLevel');
    if (configured === 'DEBUG') return ApplicationLogLevel.DEBUG;
    if (configured === 'INFO') return ApplicationLogLevel.INFO;
    if (configured === 'WARN') return ApplicationLogLevel.WARN;
    if (configured === 'ERROR') return ApplicationLogLevel.ERROR;
    throw new Error('Configuration value applicationLogLevel is unsupported');
  }

  private openApiDocument(roleArn: string, functionArn: string): OpenApiDocument {
    const parsed = load(
      readFileSync(join(__dirname, '..', '..', 'contract', 'openapi.yaml'), 'utf8')
    );
    if (!isOpenApiDocument(parsed)) {
      throw new Error('The OpenAPI contract must contain a paths object');
    }

    const functionUri = Stack.of(this).formatArn({
      service: 'apigateway',
      account: '',
      resource: 'lambda:path/2015-03-31/functions',
      resourceName: `${functionArn}/invocations`,
    });
    for (const [path, method] of [
      ['/cards', 'post'],
      ['/cards/{cardId}/pass', 'get'],
    ] as const) {
      const integration = parsed.paths[path]?.[method]?.['x-amazon-apigateway-integration'];
      if (!isRecord(integration)) {
        throw new Error(
          `OpenAPI operation ${method.toUpperCase()} ${path} is missing its integration`
        );
      }
      integration.credentials = roleArn;
      integration.uri = functionUri;
    }
    return parsed;
  }
}

function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  return isRecord(value) && isRecord(value.paths);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
