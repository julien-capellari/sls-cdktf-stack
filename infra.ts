import { App } from 'cdktf';

import { FrontendStack } from './stacks/frontend.stack';

// Constants
const STAGE = 'dev';

// Setup stacks
const app = new App();

new FrontendStack(app, 'frontend', { stage: STAGE });

app.synth();
