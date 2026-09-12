import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConversationCreatedAt1789154157110 implements MigrationInterface {
    name = 'AddConversationCreatedAt1789154157110'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation\` ADD \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation\` DROP COLUMN \`created_at\``);
    }

}
