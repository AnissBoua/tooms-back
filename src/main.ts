import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import AppDataSource from '@/config/typeorm';
import { users } from './routes/users';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();
const app = express();
const port = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(helmet());
if (process.env.NODE_ENV === 'dev') {
  app.use(morgan('dev'));
}

app.use('/api/users', users);

const DBConection = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
  } catch (error) {
    console.log('Database connection error:', error);
  }
}


const init = async () => {
  await DBConection();

  app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
  });

  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  })
}

init();