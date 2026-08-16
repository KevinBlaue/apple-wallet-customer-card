#!/usr/bin/env node
import { App } from '../lib/constructs/app';
import { WalletStack } from '../lib/wallet';

const app = new App();
new WalletStack(app, 'wallet');
