import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCascadeDeletes1789241655177 implements MigrationInterface {
    name = 'FixCascadeDeletes1789241655177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // conversation_participants_user.userId was left as NO ACTION by an earlier migration,
        // unlike its conversationId sibling and the equivalent user_contacts_user FKs (both CASCADE).
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` DROP FOREIGN KEY \`FK_5d93fb1843f96fbdefea37dae86\``);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` ADD CONSTRAINT \`FK_5d93fb1843f96fbdefea37dae86\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`message\` DROP FOREIGN KEY \`FK_446251f8ceb2132af01b68eb593\``);
        await queryRunner.query(`ALTER TABLE \`message\` DROP FOREIGN KEY \`FK_7cf4a4df1f2627f72bf6231635f\``);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` DROP FOREIGN KEY \`FK_ab9ac09f46c2c4df254aaae28f3\``);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` DROP FOREIGN KEY \`FK_d03a5e0564d3d6e3af4cf28af95\``);
        await queryRunner.query(`ALTER TABLE \`call\` DROP FOREIGN KEY \`FK_bdd6b155a101cb4ca575322c2ac\``);
        await queryRunner.query(`ALTER TABLE \`call\` DROP FOREIGN KEY \`FK_d6f18354848d84171723be89410\``);
        await queryRunner.query(`ALTER TABLE \`refresh_token\` DROP FOREIGN KEY \`FK_8e913e288156c133999341156ad\``);
        await queryRunner.query(`ALTER TABLE \`message\` ADD CONSTRAINT \`FK_446251f8ceb2132af01b68eb593\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`message\` ADD CONSTRAINT \`FK_7cf4a4df1f2627f72bf6231635f\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` ADD CONSTRAINT \`FK_d03a5e0564d3d6e3af4cf28af95\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` ADD CONSTRAINT \`FK_ab9ac09f46c2c4df254aaae28f3\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`call\` ADD CONSTRAINT \`FK_bdd6b155a101cb4ca575322c2ac\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`call\` ADD CONSTRAINT \`FK_d6f18354848d84171723be89410\` FOREIGN KEY (\`initiatorId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refresh_token\` ADD CONSTRAINT \`FK_8e913e288156c133999341156ad\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` DROP FOREIGN KEY \`FK_5d93fb1843f96fbdefea37dae86\``);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` ADD CONSTRAINT \`FK_5d93fb1843f96fbdefea37dae86\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refresh_token\` DROP FOREIGN KEY \`FK_8e913e288156c133999341156ad\``);
        await queryRunner.query(`ALTER TABLE \`call\` DROP FOREIGN KEY \`FK_d6f18354848d84171723be89410\``);
        await queryRunner.query(`ALTER TABLE \`call\` DROP FOREIGN KEY \`FK_bdd6b155a101cb4ca575322c2ac\``);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` DROP FOREIGN KEY \`FK_ab9ac09f46c2c4df254aaae28f3\``);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` DROP FOREIGN KEY \`FK_d03a5e0564d3d6e3af4cf28af95\``);
        await queryRunner.query(`ALTER TABLE \`message\` DROP FOREIGN KEY \`FK_7cf4a4df1f2627f72bf6231635f\``);
        await queryRunner.query(`ALTER TABLE \`message\` DROP FOREIGN KEY \`FK_446251f8ceb2132af01b68eb593\``);
        await queryRunner.query(`ALTER TABLE \`refresh_token\` ADD CONSTRAINT \`FK_8e913e288156c133999341156ad\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`call\` ADD CONSTRAINT \`FK_d6f18354848d84171723be89410\` FOREIGN KEY (\`initiatorId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`call\` ADD CONSTRAINT \`FK_bdd6b155a101cb4ca575322c2ac\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` ADD CONSTRAINT \`FK_d03a5e0564d3d6e3af4cf28af95\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`read_receipt\` ADD CONSTRAINT \`FK_ab9ac09f46c2c4df254aaae28f3\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`message\` ADD CONSTRAINT \`FK_7cf4a4df1f2627f72bf6231635f\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversation\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`message\` ADD CONSTRAINT \`FK_446251f8ceb2132af01b68eb593\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
