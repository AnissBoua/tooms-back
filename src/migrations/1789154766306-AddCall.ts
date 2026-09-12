import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCall1789154766306 implements MigrationInterface {
    name = 'AddCall1789154766306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`call\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('audio', 'video') NOT NULL, \`connected\` tinyint NOT NULL DEFAULT 0, \`started_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`ended_at\` datetime NULL, \`conversationId\` int NULL, \`initiatorId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`call\` ADD CONSTRAINT \`FK_bdd6b155a101cb4ca575322c2ac\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`call\` ADD CONSTRAINT \`FK_d6f18354848d84171723be89410\` FOREIGN KEY (\`initiatorId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`call\` DROP FOREIGN KEY \`FK_d6f18354848d84171723be89410\``);
        await queryRunner.query(`ALTER TABLE \`call\` DROP FOREIGN KEY \`FK_bdd6b155a101cb4ca575322c2ac\``);
        await queryRunner.query(`DROP TABLE \`call\``);
    }

}
