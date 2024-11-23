import { MigrationInterface, QueryRunner } from "typeorm";

export class Message1732357120155 implements MigrationInterface {
    name = 'Message1732357120155'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`message\` (\`id\` int NOT NULL AUTO_INCREMENT, \`content\` text NOT NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`userId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_contacts_user\` (\`userId_1\` int NOT NULL, \`userId_2\` int NOT NULL, INDEX \`IDX_7476f44166ea089024ca3dd271\` (\`userId_1\`), INDEX \`IDX_90d50e9eaf2ba430c86acb7631\` (\`userId_2\`), PRIMARY KEY (\`userId_1\`, \`userId_2\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`message\` ADD CONSTRAINT \`FK_446251f8ceb2132af01b68eb593\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_contacts_user\` ADD CONSTRAINT \`FK_7476f44166ea089024ca3dd2719\` FOREIGN KEY (\`userId_1\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`user_contacts_user\` ADD CONSTRAINT \`FK_90d50e9eaf2ba430c86acb76315\` FOREIGN KEY (\`userId_2\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_contacts_user\` DROP FOREIGN KEY \`FK_90d50e9eaf2ba430c86acb76315\``);
        await queryRunner.query(`ALTER TABLE \`user_contacts_user\` DROP FOREIGN KEY \`FK_7476f44166ea089024ca3dd2719\``);
        await queryRunner.query(`ALTER TABLE \`message\` DROP FOREIGN KEY \`FK_446251f8ceb2132af01b68eb593\``);
        await queryRunner.query(`DROP INDEX \`IDX_90d50e9eaf2ba430c86acb7631\` ON \`user_contacts_user\``);
        await queryRunner.query(`DROP INDEX \`IDX_7476f44166ea089024ca3dd271\` ON \`user_contacts_user\``);
        await queryRunner.query(`DROP TABLE \`user_contacts_user\``);
        await queryRunner.query(`DROP TABLE \`message\``);
    }

}
