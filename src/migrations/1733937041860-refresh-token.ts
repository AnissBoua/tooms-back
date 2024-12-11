import { MigrationInterface, QueryRunner } from "typeorm";

export class RefreshToken1733937041860 implements MigrationInterface {
    name = 'RefreshToken1733937041860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` DROP FOREIGN KEY \`FK_5d93fb1843f96fbdefea37dae86\``);
        await queryRunner.query(`CREATE TABLE \`refresh_token\` (\`id\` int NOT NULL AUTO_INCREMENT, \`token\` text NOT NULL, \`jwtid\` varchar(255) NOT NULL COMMENT 'Access Token JWT ID', \`expires_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`used_at\` datetime NULL, \`revoked_at\` datetime NULL COMMENT 'XSS Attacks', \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`userId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`refresh_token\` ADD CONSTRAINT \`FK_8e913e288156c133999341156ad\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` ADD CONSTRAINT \`FK_5d93fb1843f96fbdefea37dae86\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` DROP FOREIGN KEY \`FK_5d93fb1843f96fbdefea37dae86\``);
        await queryRunner.query(`ALTER TABLE \`refresh_token\` DROP FOREIGN KEY \`FK_8e913e288156c133999341156ad\``);
        await queryRunner.query(`DROP TABLE \`refresh_token\``);
        await queryRunner.query(`ALTER TABLE \`conversation_participants_user\` ADD CONSTRAINT \`FK_5d93fb1843f96fbdefea37dae86\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
