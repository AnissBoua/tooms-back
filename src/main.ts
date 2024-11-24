import app from './app';
import AppDataSource from '@/config/typeorm';

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

    return server;
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
};

export const server = start();