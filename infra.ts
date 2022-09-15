import { App } from 'cdktf';

import { FrontendStack } from './stacks/frontend.stack';
import { BackendStack } from './stacks/backend.stack';

// Constants
const STAGE = 'dev';

// Setup stacks
(async () => {
  const app = new App();

  const frontend = new FrontendStack(app, 'frontend', { stage: STAGE });

  await BackendStack(app, 'backend', {
    stage: STAGE,
    frontendUrl: frontend.url.value,
  });

  app.synth();
})();
