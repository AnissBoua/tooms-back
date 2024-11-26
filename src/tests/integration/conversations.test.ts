import app from "@/app";
import request from "supertest";
import AppDataSource from "@/config/typeorm";
import { Conversation } from "@/models/conversation";
import { JWT } from "@/services/jwt";
import { User } from "@/models/user";
import { In } from "typeorm";

const repository = AppDataSource.getRepository(Conversation);
const UserRepo = AppDataSource.getRepository(User);

describe('/api/conversations', () => {
    beforeAll(async () => {
        await AppDataSource.initialize();
        console.log('Connected to database: ' + AppDataSource.options.database);
        await AppDataSource.runMigrations();
    });
    
    afterEach(async () => {
        jest.restoreAllMocks();
        await repository.delete({});
        await UserRepo.delete({});
    });
      
    afterAll(async () => {
        await AppDataSource.destroy();
    });

    describe('GET /', () => {
        let token: string;
        let user: User;
        let users: User[];

        const exec = async () => {
            return request(app)
                .get('/api/conversations')
                .set('Authorization', 'Bearer ' + token);
        }
        beforeEach(async () => {
            users = await UserRepo.save([
                { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789' },
                { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', password: '123456789' },
                { name: 'Alice', lastname: 'Doe', email: 'alice@test.com', password: '123456789' },
            ]);
            user = users[0];
            token = JWT.sign(user);
        });

        it('should return an empty array', async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('should return a list of conversations', async () => {
            const tmp = await UserRepo.find({ where: { id: In(users.slice(0, 2).map(u => u.id)) } });
            const conversation = await repository.save({ participants: tmp });

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id).toBe(conversation.id);
            expect(res.body[0].participants).toHaveLength(2);

            // Check if each expected participant ID is in the response
            users.slice(0, 2).forEach(user =>
                expect(res.body[0].participants).toContainEqual(expect.objectContaining({ id: user.id }))
            );

            // Last participant should not be in the response
            expect(res.body[0].participants).not.toContainEqual(expect.objectContaining({ id: users[2].id }));
        });

        it('should return 404 if user is not found', async () => {
            await UserRepo.delete({});
            const res = await exec();
            expect(res.status).toBe(404);
        });

        it('should return 500 if findOne goes wrong', async () => {
            jest.spyOn(UserRepo, 'findOne').mockRejectedValue(new Error('Something went wrong'));
            const res = await exec();
            expect(res.status).toBe(500);
        });
    });

    describe('POST /', () => {
        let token: string;
        let user: User;
        let users: User[];
        let data: any = { users: [] };

        const exec = async () => {
            return request(app)
                .post('/api/conversations')
                .set('Authorization', 'Bearer ' + token)
                .send(data);
        }

        const setData = async () => {
            data.users = users.slice(0, 2).map(u => u.id);
        } 
        
        beforeEach(async () => {
            users = await UserRepo.save([
                { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789' },
                { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', password: '123456789' },
                { name: 'Alice', lastname: 'Doe', email: 'alice@test.com', password: '123456789' },
            ]);
            user = users[0];
            token = JWT.sign(user);
            setData();
        });

        it('should return 400 if some users are not found', async () => {
            users.map(u => u.id = u.id + 10);
            setData();
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 400 if no users are sent', async () => {
            data = {};
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 400 if objects are sent instead of integers', async () => {
            data = { users: [users[0], users[1]] };
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return a conversation', async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body.participants).toHaveLength(2);

            // Check if each expected participant ID is in the response
            users.slice(0, 2).forEach(user =>
                expect(res.body.participants).toContainEqual(expect.objectContaining({ id: user.id }))
            );

            // Last participant should not be in the response
            expect(res.body.participants).not.toContainEqual(expect.objectContaining({ id: users[2].id }));
        });

        it('should return 500 if save goes wrong', async () => {
            jest.spyOn(repository, 'save').mockRejectedValue(new Error('Something went wrong'));
            const res = await exec();
            expect(res.status).toBe(500);
        });
    });

    describe('PUT /:id/add', () => {
        let token: string;
        let user: User;
        let users: User[];
        let conversation: Conversation;
        let data: any = { users: [] };

        const exec = async () => {
            return request(app)
                .put('/api/conversations/' + conversation.id + '/add')
                .set('Authorization', 'Bearer ' + token)
                .send(data);
        }

        const setData = async () => {
            data.users = users.slice(2, 3).map(u => u.id);
        }
        
        beforeEach(async () => {
            users = await UserRepo.save([
                { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789' },
                { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', password: '123456789' },
                { name: 'Alice', lastname: 'Doe', email: 'alice@test.com', password: '123456789' },
            ]);
            conversation = await repository.save({ participants: users.slice(0, 2) });
            user = users[0];
            token = JWT.sign(user);
        });

        it('should return 400 if some users are not found', async () => {
            users.map(u => u.id = u.id + 10);
            setData();
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 400 if no users are sent', async () => {
            data = {};
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 400 if objects are sent instead of integers', async () => {
            data = { users: [users[2]] };
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 404 if conversation is not found', async () => {
            conversation.id = conversation.id + 10;
            setData();
            const res = await exec();
            expect(res.status).toBe(404);
        });

        it('should return 403 if user is not a participant', async () => {
            user = users[2];
            token = JWT.sign(user);
            await repository.save(conversation);
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it('should return a conversation', async () => {
            setData();
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.participants).toHaveLength(3);

            // Check if each expected participant ID is in the response
            users.forEach(user =>
                expect(res.body.participants).toContainEqual(expect.objectContaining({ id: user.id }))
            );
        });

        it('should return 500 if save goes wrong', async () => {
            setData();
            jest.spyOn(repository, 'save').mockRejectedValue(new Error('Something went wrong'));
            const res = await exec();
            expect(res.status).toBe(500);
        });
    });

    describe('PUT /:id/remove', () => {
        let token: string;
        let user: User;
        let users: User[];
        let conversation: Conversation;
        let data: any = { users: [] };

        const exec = async () => {
            return request(app)
                .put('/api/conversations/' + conversation.id + '/remove')
                .set('Authorization', 'Bearer ' + token)
                .send(data);
        }

        const setData = async () => {
            data.users = users.slice(2, 3).map(u => u.id);
        }
        
        beforeEach(async () => {
            users = await UserRepo.save([
                { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789' },
                { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', password: '123456789' },
                { name: 'Alice', lastname: 'Doe', email: 'alice@test.com', password: '123456789' },
                { name: 'Bob', lastname: 'Doe', email: 'bob@test.com', password: '123456789' },
            ]);
            conversation = await repository.save({ participants: users.slice(0, 3) });
            user = users[0];
            token = JWT.sign(user);
        });

        it('should return 400 if some users are not found', async () => {
            users.map(u => u.id = u.id + 10);
            setData();
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 400 if no users are sent', async () => {
            data = {};
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 400 if objects are sent instead of integers', async () => {
            data = { users: [users[2]] };
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it('should return 404 if conversation is not found', async () => {
            conversation.id = conversation.id + 10;
            setData();
            const res = await exec();
            expect(res.status).toBe(404);
        });

        it('should return 403 if user is not a participant', async () => {
            user = users[3];
            token = JWT.sign(user);
            await repository.save(conversation);
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it('should return a conversation', async () => {
            setData();
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.participants).toHaveLength(2);

            // Check if each expected participant ID is in the response
            users.slice(0, 2).forEach(user =>
                expect(res.body.participants).toContainEqual(expect.objectContaining({ id: user.id }))
            );

            // Last participant should not be in the response
            expect(res.body.participants).not.toContainEqual(expect.objectContaining({ id: users[2].id }));
        });

        it('should return 500 if save goes wrong', async () => {
            setData();
            jest.spyOn(repository, 'save').mockRejectedValue(new Error('Something went wrong'));
            const res = await exec();
            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /:id', () => {
        let token: string;
        let user: User;
        let users: User[];
        let conversation: Conversation;

        const exec = async () => {
            return request(app)
                .delete('/api/conversations/' + conversation.id)
                .set('Authorization', 'Bearer ' + token);
        }

        beforeEach(async () => {
            users = await UserRepo.save([
                { name: 'John', lastname: 'Doe', email: 'john@test.com', password: '123456789' },
                { name: 'Jane', lastname: 'Doe', email: 'jane@test.com', password: '123456789' },
                { name: 'Alice', lastname: 'Doe', email: 'alice@test.com', password: '123456789' },
            ]);
            conversation = await repository.save({ participants: users.slice(0, 2) });
            user = users[0];
            token = JWT.sign(user);
        });

        it('should return 404 if conversation is not found', async () => {
            conversation.id = conversation.id + 10;
            const res = await exec();
            expect(res.status).toBe(404);
        });

        it('should return 403 if user is not a participant', async () => {
            user = users[2];
            token = JWT.sign(user);
            await repository.save(conversation);
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it('should return a message', async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Conversation deleted' });
        });

        it('should return 500 if delete goes wrong', async () => {
            jest.spyOn(repository, 'delete').mockRejectedValue(new Error('Something went wrong'));
            const res = await exec();
            expect(res.status).toBe(500);
        });
    });
});