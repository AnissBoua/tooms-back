import dotenv from 'dotenv';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { users } from '@/routes/users';
import { auth } from '@/routes/auth';
import { conversations } from '@/routes/conversation';
import { messages } from '@/routes/message';
import cors from 'cors';
import error from '@/middlewares/error';
import 'express-async-errors';

// Configure environment
const env = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: env });

// Initialize the app
const app: Application = express();
app.use(express.json());
app.use(helmet());
app.use(cors());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('development'));
}

// Routes
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/conversations', conversations);
app.use('/api/messages', messages);

app.use(error);

// Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

// Unhandled Rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});


export default app;
