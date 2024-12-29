import { Request, Response, NextFunction } from 'express';

// Global Error-Handling Middleware
const error = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the error stack for debugging

  res.status(500).json({
    message: err.message || 'Internal Server Error',
    success: false,
  });
};

export default error;
