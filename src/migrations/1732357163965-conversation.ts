import { MigrationInterface, QueryRunner } from "typeorm";

export class Conversation1732357163965 implements MigrationInterface {
    name = 'Conversation1732357163965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`conversation\` (\`id\` int NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`conversation_participants_user\` (\`conversationId\` int NOT NULL, \`userId\` int NOT NULL, INDEX \`IDX_4928ef292e3fb48783034b82f7\` (\`conversationId\`), INDEX \`IDX_5d93fb1843f96fbdefea37dae8\` (\`userId\`), PRIMARY KEY (\`conversationId\`, \`userId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`message\` ADD \`conversationId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`message\` ADD CONSTRAINT \`FK_7cf4a4df1f2627f72bf6231635f\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` ADD CONSTRAINT \`FK_4928ef292e3fb48783034b82f7a\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` ADD CONSTRAINT \`FK_5d93fb1843f96fbdefea37dae86\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` DROP FOREIGN KEY \`FK_5d93fb1843f96fbdefea37dae86\``);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` DROP FOREIGN KEY \`FK_4928ef292e3fb48783034b82f7a\``);
        await queryRunner.query(`ALTER TABLE \`message\` DROP FOREIGN KEY \`FK_7cf4a4df1f2627f72bf6231635f\``);
        await queryRunner.query(`ALTER TABLE \`message\` DROP COLUMN \`conversationId\``);
        await queryRunner.query(`DROP INDEX \`IDX_5d93fb1843f96fbdefea37dae8\` ON \`conversation_participants_user\``);
        await queryRunner.query(`DROP INDEX \`IDX_4928ef292e3fb48783034b82f7\` ON \`conversation_participants_user\``);
        await queryRunner.query(`DROP TABLE \`conversation_participants_user\``);
        await queryRunner.query(`DROP TABLE \`conversation\``);
    }

}
