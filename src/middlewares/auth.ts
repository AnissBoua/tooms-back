import { NextFunction, Request, Response } from "express";
import { JWT } from "@/services/jwt";

const auth = (req: any, res: any, next: NextFunction) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = JWT.verify(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid token.' });
    }
}

export { auth };