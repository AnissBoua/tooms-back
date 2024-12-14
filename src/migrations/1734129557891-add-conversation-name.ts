import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConversationName1734129557891 implements MigrationInterface {
    name = 'AddConversationName1734129557891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation\` ADD \`name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`token_blacklist\` ADD UNIQUE INDEX \`IDX_4105032d90cf6e1b532ed181a8\` (\`jwtid\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`token_blacklist\` DROP INDEX \`IDX_4105032d90cf6e1b532ed181a8\``);
        await queryRunner.query(`ALTER TABLE \`conversation\` DROP COLUMN \`name\``);
    }

}
