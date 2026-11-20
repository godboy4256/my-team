import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamTactics1763337600000 implements MigrationInterface {
  name = 'CreateTeamTactics1763337600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `team_tactics` (`id` varchar(36) NOT NULL, `team_id` varchar(36) NOT NULL, `name` varchar(120) NOT NULL, `data` json NOT NULL, `is_shared` tinyint NOT NULL DEFAULT 0, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX `IDX_team_tactics_team_shared` (`team_id`, `is_shared`), PRIMARY KEY (`id`), CONSTRAINT `FK_team_tactics_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `team_tactics`');
  }
}
