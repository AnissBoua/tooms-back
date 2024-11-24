import jwt from "jsonwebtoken";
import fs from "fs";
import { User } from "@/models/user";

class JWT {
    static sign(user: User) : string {
        const key = fs.readFileSync("jwt/private.pem", "utf8");
        return jwt.sign({ id: user.id }, key, { algorithm: 'RS256', expiresIn: '1h' });
    }

    static verify(token: string) : any {
        if (token.startsWith("Bearer ")) token = token.split(" ")[1]; // Extract the token after "Bearer"
        const key = fs.readFileSync("jwt/public.pem", "utf8");
        return jwt.verify(token, key);
    }
}

export { JWT };