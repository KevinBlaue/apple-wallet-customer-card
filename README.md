# Apple Wallet Customer Card

This sample application exposes an OpenAPI-defined Amazon API Gateway endpoint backed by AWS Lambda to generate a simple Apple Wallet customer card.

The service runs entirely as serverless code on AWS, with its architecture defined through the AWS CDK for repeatable infrastructure deployments.

A CloudWatch Synthetics canary verifies the deployed API end to end by creating a customer card and downloading the generated Apple Wallet pass.

In production projects, I have also implemented the complete Apple Wallet lifecycle, including pass updates and device-registration handling for deleted passes.

## Architecture

The CDK application separates resources with different lifecycles into three stacks:

```text
<environment>-iamGitHub    GitHub OIDC provider and repository deployment role
<environment>-database     DynamoDB customer-card table and optional demo seed
<environment>-walletApi    Lambda, API Gateway, logs, secret reference and canary
```

`walletApi` receives the DynamoDB table through typed stack properties. This creates an explicit CloudFormation dependency on `database` while keeping persistent data independent from application deployments. The IAM stack is enabled only for the persistent `dev`, `qa`, and `prod` environments.

## Environments

`environment` is both the configuration selector and the namespace for stacks and resources:

```bash
npm run cdk -- deploy --all -c environment=pr-123 --require-approval never
```

The command creates `pr-123-database` and `pr-123-walletApi`. Configuration starts with `cdk/environments/default`; an environment-specific directory overrides those defaults when it exists. Dynamic environments such as `pr-123` therefore need no committed configuration directory.

The defaults are intentionally ephemeral. Production enables table deletion protection and retention and disables demo seeding.

## Synthetic demo data

All included seed data is synthetic and visibly marked. The development and pull-request table contains a single `DEMO` card using `portfolio-user@example.invalid`; the `.invalid` top-level domain cannot resolve as a real email domain. Production never receives seed data.

The repository contains no Apple certificates, private keys, real customer data, AWS account IDs, or deployment-role ARNs. The Wallet Lambda expects an externally managed Secrets Manager secret named by the pattern `/apple-wallet-customer-card/{environment}/certificates`. A deployment can succeed without secret contents, but pass generation requires valid Apple credentials.

## GitHub OIDC bootstrap

The `iamGitHub` stack restricts its trust policy to this repository and requires the `sts.amazonaws.com` audience. Its AWS permissions are deliberately pragmatic for a working probe: the role can assume only the standard CDK bootstrap roles in its account and region, plus read the bootstrap version and CloudFormation stack state. A production organization should review and further constrain these permissions for its own bootstrap model.

The role must be bootstrapped once using an administrator or AWS SSO session before GitHub Actions can assume it:

```bash
cd cdk
npx cdk bootstrap -c environment=dev
npx cdk deploy dev-iamGitHub -c environment=dev --require-approval never
```

By default, the stack creates the account's GitHub OIDC provider. If the provider already exists, set `createOidcProvider: false` in the environment's `iamGitHub.yaml`; the stack then imports the conventional provider ARN and creates only the repository role.

Store the resulting `DeployRoleArn` output in GitHub repository variables:

- `ENABLE_AWS_DEPLOYMENT=true`
- `AWS_DEV_DEPLOY_ROLE_ARN`
- `AWS_QA_DEPLOY_ROLE_ARN`
- `AWS_PROD_DEPLOY_ROLE_ARN`
- optionally `AWS_REGION` (defaults to `eu-central-1`)

## Deployment workflows

- Pull requests from branches in this repository deploy `pr-<number>` automatically when AWS deployment is enabled. Forks never receive an OIDC deployment job.
- Closing a pull request destroys all matching `pr-<number>-*` stacks.
- A push to `main` deploys `dev`.
- `qa` and `prod` are manual workflow-dispatch targets, providing an explicit promotion gate.

Every deployment runs formatting, linting, builds, unit tests, coverage, and CDK synthesis before assuming the AWS role.
