import type { App } from './constructs/app';
import { DatabaseStack } from './database';
import { IamRoleGitHubStack } from './iamRoleGitHub';
import { WalletApiStack } from './walletApi';

export interface WalletStacks {
  readonly database: DatabaseStack;
  readonly iamGitHub?: IamRoleGitHubStack;
  readonly walletApi: WalletApiStack;
}

export function createStacks(app: App): WalletStacks {
  const iamGitHub = app.iamGitHubEnabled ? new IamRoleGitHubStack(app, 'iamGitHub') : undefined;
  const database = new DatabaseStack(app, 'database');
  const walletApi = new WalletApiStack(app, 'walletApi', {
    cardsTable: database.cardsTable,
  });
  walletApi.addStackDependency(database);

  return { database, iamGitHub, walletApi };
}
