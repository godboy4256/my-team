import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLegacyUserSessions1762406400000 implements MigrationInterface {
  name = 'RemoveLegacyUserSessions1762406400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `user_sessions`');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `user_sessions` (`id` varchar(36) NOT NULL, `user_id` varchar(36) NOT NULL, `token_hash` char(64) NOT NULL, `expires_at` datetime NOT NULL, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX `UQ_sessions_token_hash` (`token_hash`), INDEX `IDX_sessions_user` (`user_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
  }
}
