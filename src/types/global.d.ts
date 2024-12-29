export {}; // This makes the file an external module

declare global {
    namespace Express {
        interface Request {
            user?: {sub: number}; // Add your User type here
        }
    }
}