import { app } from './app.js';
import { env } from './config/env.js';
import { pingDb } from './config/db.js';

async function bootstrap() {
  await pingDb();
  app.listen(env.port, () => {
    console.log(`SyncFlow backend started on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
