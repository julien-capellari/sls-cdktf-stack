import serverlessExpress from '@vendia/serverless-express';
import { APIGatewayProxyHandlerV2, Handler } from 'aws-lambda';

import { bootstrap } from './bootstrap';

// Handler
let server: Handler;

async function init() {
  if (!server) {
    const app = await bootstrap();
    await app.init();

    server = serverlessExpress({
      app: app.getHttpAdapter().getInstance()
    });
  }

  return server;
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context, callback) => {
  const server = await init();
  return server(event, context, callback);
}
