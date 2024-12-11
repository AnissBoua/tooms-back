import jwt from "jsonwebtoken";
import fs from "fs";
import { User } from "@/models/user";
import crypto from "crypto";

class JWT {
    static sign(user: User, expires: number = 60 * 60 * 24, data?: object ) : string {
        const key = fs.readFileSync("jwt/private.pem", "utf8");
        const jwtid = crypto.randomBytes(16).toString('hex');
        return jwt.sign({ ...data }, key, { algorithm: 'RS256', expiresIn: expires, jwtid: jwtid, subject: user.id.toString() });
    }

    static verify(token: string) : any {
        if (token.startsWith("Bearer ")) token = token.split(" ")[1]; // Extract the token after "Bearer"
        const key = fs.readFileSync("jwt/public.pem", "utf8");
        return jwt.verify(token, key);
    }

    static expires(date: Date) : number {
        return Math.floor((date.getTime() - new Date().getTime()) / 1000);
    }
}

export { JWT };