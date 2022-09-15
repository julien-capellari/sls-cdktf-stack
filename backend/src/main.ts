import 'dotenv/config';

import { bootstrap } from './bootstrap';

// Init
async function init() {
  const app = await bootstrap();
  await app.listen(4000);
}
