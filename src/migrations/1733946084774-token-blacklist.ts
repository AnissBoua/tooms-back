import { MigrationInterface, QueryRunner } from "typeorm";

export class TokenBlacklist1733946084774 implements MigrationInterface {
    name = 'TokenBlacklist1733946084774'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`token_blacklist\` (\`id\` int NOT NULL AUTO_INCREMENT, \`jwtid\` varchar(255) NOT NULL, \`expires_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`token_blacklist\``);
    }

}
