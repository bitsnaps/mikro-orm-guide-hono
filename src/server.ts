import { serve } from '@hono/node-server';
import { bootstrap }  from './app.js';

try {
  const { app, port, db } = await bootstrap();
  
  console.log(`server started at http://localhost:${port}`);
  
  const server = serve({
    fetch: app.fetch,
    port
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await db.orm.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

} catch (e) {
  console.error(e);
}