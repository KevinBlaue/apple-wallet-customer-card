#!/usr/bin/env node
import { App } from '../lib/constructs/app';
import { createStacks } from '../lib/stacks';

const app = new App();
createStacks(app);
