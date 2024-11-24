import dotenv from 'dotenv';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { users } from '@/routes/users';

// Configure environment
const env = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: env });

// Initialize the app
const app: Application = express();
app.use(express.json());
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('development'));
}

// Routes
app.use('/api/users', users);

export default app;
