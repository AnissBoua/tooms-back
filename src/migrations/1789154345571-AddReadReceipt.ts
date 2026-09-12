import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReadReceipt1789154345571 implements MigrationInterface {
    name = 'AddReadReceipt1789154345571'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`read_receipt\` (\`id\` int NOT NULL AUTO_INCREMENT, \`last_read_at\` datetime NOT NULL, \`userId\` int NULL, \`conversationId\` int NULL, UNIQUE INDEX \`IDX_8859abda80802453f0f7c86777\` (\`userId\`, \`conversationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` ADD CONSTRAINT \`FK_d03a5e0564d3d6e3af4cf28af95\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` ADD CONSTRAINT \`FK_ab9ac09f46c2c4df254aaae28f3\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`read_receipt\` DROP FOREIGN KEY \`FK_ab9ac09f46c2c4df254aaae28f3\``);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` DROP FOREIGN KEY \`FK_d03a5e0564d3d6e3af4cf28af95\``);
        await queryRunner.query(`DROP INDEX \`IDX_8859abda80802453f0f7c86777\` ON \`read_receipt\``);
        await queryRunner.query(`DROP TABLE \`read_receipt\``);
    }

}
