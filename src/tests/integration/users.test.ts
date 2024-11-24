import request from "supertest";
import app from "@/app";
import AppDataSource from "@/config/typeorm";
import { User } from "@/models/user";

let server: any;
const repository = AppDataSource.getRepository(User);
beforeAll(async () => {
    await AppDataSource.initialize();
    console.log('Connected to database: ' + AppDataSource.options.database);
    await AppDataSource.runMigrations();

    server = app.listen(process.env.APP_PORT || 4000, () => {
        console.log('Test server started');
    });
});

afterEach(async () => {
    await repository.delete({});
});
  
afterAll(async () => {
    await AppDataSource.destroy();
    server.close();
});

describe('/api/users', () => {
    describe('GET /', () => {
        it('should return a list of users', async () => {
            await repository.save([
                { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: 'photo.jpg' },
                { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', password: '123456789', avatar: 'photo.png' },
            ]);
            const res = await request(server).get('/api/users')
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body.some((u: any) => u.name === 'John')).toBeTruthy();
            expect(res.body.some((u: any) => u.name === 'Jane')).toBeTruthy();

            expect(res.body.some((u: any) => u.lastname === 'Doe')).toBeTruthy();

            expect(res.body.some((u: any) => u.email === 'jane@test.com')).toBeTruthy();
            expect(res.body.some((u: any) => u.email === 'jane@test.com')).toBeTruthy();

            expect(res.body.some((u: any) => u.avatar === 'photo.jpg')).toBeTruthy();
            expect(res.body.some((u: any) => u.avatar === 'photo.png')).toBeTruthy();

            expect(res.body.some((u: any) => u.password)).toBeFalsy();
        });
    });

    describe('GET /:id', () => {
        it('should return a user by id', async () => {
            const user = await repository.save({ name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: 'photo.jpg' });
            const res = await request(server).get(`/api/users/${user.id}`);
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', user.id);
            expect(res.body).toHaveProperty('name', user.name);
            expect(res.body).toHaveProperty('lastname', user.lastname);
            expect(res.body).toHaveProperty('email', user.email);
            expect(res.body).toHaveProperty('avatar', user.avatar);
            expect(res.body).toHaveProperty('created_at');
            expect(res.body).toHaveProperty('updated_at');
            expect(res.body.password).toBeFalsy();
        });

        it('should return 404 if user not found', async () => {
            const res = await request(server).get('/api/users/999');
            expect(res.status).toBe(404);
        });
    });
});