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
    jest.restoreAllMocks();
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

        it('should return 500 if the repository find fail', async () => {
            jest.spyOn(repository, 'find').mockRejectedValue(new Error('Database error'));
            const res = await request(server).get('/api/users');
            expect(res.status).toBe(500);
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

        it('should return 400 if id is not a number', async () => {
            const res = await request(server).get('/api/users/invalid');
            expect(res.status).toBe(400);
        });

        it('should return 500 if the repository findOne fail', async () => {
            jest.spyOn(repository, 'findOne').mockRejectedValue(new Error('Database error'));
            const res = await request(server).get('/api/users/1');
            expect(res.status).toBe(500);
        });

        it('should return 404 if user not found', async () => {
            const res = await request(server).get('/api/users/999');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /', () => {
        let user: any = { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: '' };
        const exec = async () => {
            return await request(server)
                .post('/api/users')
                .send(user);
        };

        beforeEach(() => {
            user = { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: '' };
        });

        it('should return 400 if additional parameters are sent into the request', async () => {
            user = { ...user, hack: 'hack' };
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 500 if the repository save fail', async () => {
            jest.spyOn(repository, 'save').mockRejectedValue(new Error('Database error'));
            const res = await exec();
            expect(res.status).toBe(500);
        });

        it('should return 400 if the email is already in the database', async () => {
            await exec();
            const res = await exec();

            expect(res.status).toBe(400);
        });

        it('should create a new user', async () => {
            const res = await exec();
            const user = await repository.findOne({ where: { id: res.body.id } });

            expect(user).toBeTruthy();
            expect(user?.password).not.toBe('123456789');
        });

        it('should return the user', async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name', 'John');
            expect(res.body).toHaveProperty('lastname', 'Doe');
            expect(res.body).toHaveProperty('email', 'john@test.com');
            expect(res.body).toHaveProperty('avatar', '');
            expect(res.body).toHaveProperty('created_at');
            expect(res.body).toHaveProperty('updated_at');
            expect(res.body.password).toBeFalsy();
        });

        it('should return 400 if email is not sent', async () => {
            let { email, ...data } = user;
            user = { ...data };
            const res = await exec();

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'email');
        });

        it('should return 400 if email is not valid', async () => {
            user = { ...user, email: 'invalid-email' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'email');
        });

        it('should return 400 if password is missing', async () => {
            let { password, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'password');
        });

        it('should return 400 if password is too short', async () => {
            user = { ...user, password: '12' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'password');
        });

        it('should return 400 if password is too long', async () => {
            user = { ...user, password: Array(256).fill('a').join('') };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'password');
        });

        it('should return 400 if name is missing', async () => {
            let { name, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'name');
        });

        it('should return 400 if name is too short', async () => {
            user = { ...user, name: '' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'name');
        });

        it('should return 400 if name is too long', async () => {
            user = { ...user, name: Array(101).fill('a').join('') };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'name');
        });

        it('should return 400 if lastname is missing', async () => {
            let { lastname, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'lastname');
        });

        it('should return 400 if lastname is too short', async () => {
            user = { ...user, lastname: '' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'lastname');
        });

        it('should return 400 if lastname is too long', async () => {
            user = { ...user, lastname: Array(101).fill('a').join('') };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'lastname');
        });

        it('should return 400 if avatar is missing from body (can be null)', async () => {
            let { avatar, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'avatar');
        });
    });

    describe('PUT /:id', () => {
        let user: any;
        let id: number;
        const exec = async () => {
            return await request(server)
                .put('/api/users/' + id)
                .send(user);
        };

        beforeEach(async () => {
            user = { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: '' };
            user = await repository.save(user);
            
            const usr = await repository.findOne({ where: { id: user.id } });
            if (!usr) return;
            
            id = usr.id;
            user = { name: 'Jane', lastname: 'Bo', email: 'jane@test.com', avatar: 'path/to/avatar.jpg' };
        });

        it('should return 400 if id is not a number', async () => {
            const res = await request(server).put('/api/users/invalid');
            expect(res.status).toBe(400);
        });

        it('should return 404 if the user is not found', async () => {
            id = 999;
            const res = await exec();
            expect(res.status).toBe(404);
        });

        it('should return 500 if the repository find fail', async () => {
            jest.spyOn(repository, 'findOneBy').mockRejectedValue(new Error('Database error'));
            const res = await exec();
            expect(res.status).toBe(500);
        });

        it('should return 400 if additional parameters are sent into the request', async () => {
            user = { ...user, password: '987654321', hack: 'hack' };
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should update a user', async () => {
            const res = await exec();
            const updatedUser = await repository.findOne({ where: { id: user.id } });

            expect(updatedUser).toBeTruthy();
            expect(updatedUser?.name).toBe('Jane');
            expect(updatedUser?.lastname).toBe('Bo');
            expect(updatedUser?.email).toBe('jane@test.com');
            expect(updatedUser?.password).not.toBe('987654321');
            expect(updatedUser?.avatar).toBe('path/to/avatar.jpg');
        });

        it('should return the updated user', async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', id);
            expect(res.body).toHaveProperty('name', 'Jane');
            expect(res.body).toHaveProperty('lastname', 'Bo');
            expect(res.body).toHaveProperty('email', 'jane@test.com');
            expect(res.body).toHaveProperty('avatar', 'path/to/avatar.jpg');
            expect(res.body).toHaveProperty('created_at');
            expect(res.body).toHaveProperty('updated_at');
            expect(res.body.password).toBeFalsy();
        });

        it('should return 400 if email is not sent', async () => {
            let { email, ...data } = user;
            user = { ...data };
            const res = await exec();

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'email');
        });

        it('should return 400 if email is not valid', async () => {
            user = { ...user, email: 'invalid-email' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'email');
        });

        it('should return 400 if name is missing', async () => {
            let { name, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'name');
        });

        it('should return 400 if name is too short', async () => {
            user = { ...user, name: '' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'name');
        });

        it('should return 400 if name is too long', async () => {
            user = { ...user, name: Array(101).fill('a').join('') };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'name');
        });

        it('should return 400 if lastname is missing', async () => {
            let { lastname, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'lastname');
        });

        it('should return 400 if lastname is too short', async () => {
            user = { ...user, lastname: '' };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'lastname');
        });

        it('should return 400 if lastname is too long', async () => {
            user = { ...user, lastname: Array(101).fill('a').join('') };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'lastname');
        });

        it('should return 400 if avatar is missing from body (can be null)', async () => {
            let { avatar, ...data } = user;
            user = { ...data };
            const res = await exec();
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error[0]).toHaveProperty('field', 'avatar');
        });
    });

    describe('DELETE /:id', ()  => {
        let user: any = { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: '' };

        const exec = async () => {
            return await request(server)
                .delete('/api/users/' + user.id)
                .send(user);
        };

        beforeEach(async () => {
            user = { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789', avatar: '' };
            user = await repository.save(user);
        });

        it('should return 400 if id is not a number', async () => {
            const res = await request(server).delete('/api/users/invalid');
            expect(res.status).toBe(400);
        });

        it('should return 404 if the user is not found', async () => {
            user = { ...user, id: 999 };
            const res = await exec();
            expect(res.status).toBe(404);
        });

        it('should return 500 if the repository delete fail', async () => {
            jest.spyOn(repository, 'delete').mockRejectedValue(new Error('Database error'));
            const res = await exec();
            expect(res.status).toBe(500);
        });

        it('should delete a user', async () => {
            const res = await exec();
            const deletedUser = await repository.findOne({ where: { id: user.id } });
            expect(deletedUser).toBeFalsy();
        });

        it('should return 204 if user is deleted', async () => {
            const res = await exec();
            expect(res.status).toBe(204);
        });
    });
});