import app from './app';
import AppDataSource from '@/config/typeorm';
import { Server } from 'socket.io';
import WS from './websocket';
import '@/crons/refreshtoken';
import '@/crons/demoreset';

const port = process.env.APP_PORT || 3000;

const start = async () => {
  try {
    // Initialize database
    await AppDataSource.initialize();
    console.log('Connected to database: ' + AppDataSource.options.database);

    // Start server
    const server = app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });

    // Initialize socket.io
    const io = new Server(server, {
      cors: {
        origin: '*', // TODO: Change this to the frontend URL
      },
    });
    WS.init(io);

    return {server, io};
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
};

const servers = start();