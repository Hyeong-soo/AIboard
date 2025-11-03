const http = require('http');
const app = require('./app');
const { port } = require('./config/env');
const prisma = require('./db/prisma');

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const gracefulShutdown = async () => {
  console.log('Received termination signal, shutting down gracefully...');
  server.close(async (error) => {
    if (error) {
      console.error('Error during HTTP server shutdown', error);
      process.exit(1);
    }

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting Prisma client', disconnectError);
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
