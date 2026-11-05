import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTeamPlayerSchema1762320000000 implements MigrationInterface {
  name = 'CreateUserTeamPlayerSchema1762320000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `users` (`id` varchar(36) NOT NULL, `name` varchar(80) NOT NULL, `age` smallint unsigned NOT NULL, `username` varchar(40) NOT NULL, `password_hash` varchar(255) NOT NULL, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX `UQ_users_username` (`username`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      "CREATE TABLE IF NOT EXISTS `teams` (`id` varchar(36) NOT NULL, `owner_user_id` varchar(36) NOT NULL, `name` varchar(100) NOT NULL, `invite_code` varchar(16) NOT NULL, `home_town` varchar(100) NOT NULL DEFAULT '', `home_ground` varchar(150) NOT NULL DEFAULT '', `description` text NOT NULL, `founded_at` varchar(10) NOT NULL DEFAULT '', `activity_time` varchar(100) NOT NULL DEFAULT '', `kfa_registered` tinyint NOT NULL DEFAULT 0, `competitions` text NOT NULL, `emblem` varchar(16) NOT NULL DEFAULT '⚽', `logo_data_url` longtext NULL, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX `UQ_teams_invite_code` (`invite_code`), INDEX `IDX_teams_owner` (`owner_user_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_teams_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `positions` (`id` int unsigned NOT NULL AUTO_INCREMENT, `code` varchar(50) NOT NULL, `label` varchar(80) NOT NULL, `category` varchar(20) NOT NULL, `sort_order` smallint unsigned NOT NULL, UNIQUE INDEX `UQ_positions_code` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      "CREATE TABLE IF NOT EXISTS `team_players` (`id` varchar(36) NOT NULL, `team_id` varchar(36) NOT NULL, `user_id` varchar(36) NULL, `name` varchar(80) NOT NULL, `jersey_number` tinyint unsigned NULL, `birth_year` smallint unsigned NOT NULL, `type` varchar(10) NOT NULL DEFAULT 'member', `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `IDX_team_players_team` (`team_id`), INDEX `IDX_team_players_user` (`user_id`), UNIQUE INDEX `UQ_team_players_jersey` (`team_id`, `jersey_number`), PRIMARY KEY (`id`), CONSTRAINT `FK_team_players_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE, CONSTRAINT `FK_team_players_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `team_player_positions` (`team_player_id` varchar(36) NOT NULL, `position_id` int unsigned NOT NULL, `sort_order` smallint unsigned NOT NULL, INDEX `IDX_player_positions_position` (`position_id`), PRIMARY KEY (`team_player_id`, `position_id`, `sort_order`), CONSTRAINT `FK_player_positions_player` FOREIGN KEY (`team_player_id`) REFERENCES `team_players` (`id`) ON DELETE CASCADE, CONSTRAINT `FK_player_positions_position` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`) ON DELETE RESTRICT) ENGINE=InnoDB',
    );
    await queryRunner.query(
      "INSERT IGNORE INTO `positions` (`code`, `label`, `category`, `sort_order`) VALUES ('goalkeeper','골키퍼','goalkeeper',1),('left_center_back','왼쪽 센터백','defender',2),('right_center_back','오른쪽 센터백','defender',3),('right_wing','오른쪽 윙','forward',4),('left_wing','왼쪽 윙','forward',5),('right_defensive_midfielder','오른쪽 수비형 미드필더','midfield',6),('left_defensive_midfielder','왼쪽 수비형 미드필더','midfield',7),('central_defensive_midfielder','중앙 수비형 미드필더','midfield',8),('central_midfielder','중앙 미드필더','midfield',9),('left_midfielder','왼쪽 미드필더','midfield',10),('right_midfielder','오른쪽 미드필더','midfield',11),('right_attacking_midfielder','오른쪽 공격형 미드필더','midfield',12),('left_attacking_midfielder','왼쪽 공격형 미드필더','midfield',13),('central_attacking_midfielder','중앙 공격형 미드필더','midfield',14),('right_fullback','오른쪽 사이드백','defender',15),('left_fullback','왼쪽 사이드백','defender',16),('striker','원톱','forward',17),('left_second_striker','왼쪽 투톱','forward',18),('right_second_striker','오른쪽 투톱','forward',19),('any_position','포지션 상관없음','utility',20)",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `team_player_positions`');
    await queryRunner.query('DROP TABLE IF EXISTS `team_players`');
    await queryRunner.query('DROP TABLE IF EXISTS `teams`');
    await queryRunner.query('DROP TABLE IF EXISTS `positions`');
    await queryRunner.query('DROP TABLE IF EXISTS `users`');
  }
}
