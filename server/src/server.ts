import 'reflect-metadata';
import http from 'http';
import dotenv from 'dotenv';
import app, { allowedOrigins } from './app';
import { connectDatabase } from './config/database';
import { initSocket } from './socket';

dotenv.config();

const port = process.env.PORT || 3000;

const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

const startServer = async () => {
  try {
    await connectDatabase();
    httpServer.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();