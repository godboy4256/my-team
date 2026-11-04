import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlayerEvaluations1762243200000 implements MigrationInterface {
  name = 'CreatePlayerEvaluations1762243200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `player_evaluations` (`player_id` varchar(36) NOT NULL, `scores` json NOT NULL, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (`player_id`)) ENGINE=InnoDB',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `player_evaluations`');
  }
}
