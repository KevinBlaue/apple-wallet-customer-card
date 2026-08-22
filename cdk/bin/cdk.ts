#!/usr/bin/env node
import { App } from '../lib/constructs/app';
import { DatabaseStack } from '../lib/database';
import { IamRoleGitHubStack } from '../lib/iamRoleGitHub';
import { WalletApiStack } from '../lib/walletApi';

const app = new App();

if (app.iamGitHubEnabled) {
  new IamRoleGitHubStack(app, 'iamGitHub');
}

const database = new DatabaseStack(app, 'database');
const walletApi = new WalletApiStack(app, 'walletApi', {
  cardsTable: database.cardsTable,
});
walletApi.addStackDependency(database);
