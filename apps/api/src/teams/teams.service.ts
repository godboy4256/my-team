import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { PlayerEvaluationEntity } from '../player-evaluations/player-evaluation.entity';
import { PositionEntity } from '../positions/position.entity';
import { TeamPlayerPositionEntity } from '../players/team-player-position.entity';
import { TeamPlayerEntity } from '../players/team-player.entity';
import { TeamEntity } from './team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teams: Repository<TeamEntity>,
    @InjectRepository(TeamPlayerEntity)
    private readonly players: Repository<TeamPlayerEntity>,
    @InjectRepository(PositionEntity)
    private readonly positions: Repository<PositionEntity>,
    @InjectRepository(TeamPlayerPositionEntity)
    private readonly playerPositions: Repository<TeamPlayerPositionEntity>,
    @InjectRepository(PlayerEvaluationEntity)
    private readonly evaluations: Repository<PlayerEvaluationEntity>,
  ) {}

  async listForOwner(ownerUserId: string) {
    const teams = await this.teams.find({
      where: { ownerUserId },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(
      teams.map(async (team) => ({
        ...team,
        playerCount: await this.players.countBy({ teamId: team.id }),
      })),
    );
  }

  async create(ownerUserId: string, name: string) {
    const team = await this.teams.save(
      this.teams.create({
        ownerUserId,
        name,
        inviteCode: this.newInviteCode(),
        homeTown: '',
        homeGround: '',
        description: '',
        foundedAt: '',
        activityTime: '',
        kfaRegistered: false,
        competitions: '',
        emblem: '⚽',
        logoDataUrl: null,
      }),
    );
    return { ...team, playerCount: 0 };
  }

  async findOwnedTeam(ownerUserId: string, teamId: string) {
    const team = await this.teams.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    if (team.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('이 팀을 관리할 권한이 없습니다.');
    }
    return team;
  }

  async updateTeam(ownerUserId: string, teamId: string, input: TeamInput) {
    const team = await this.findOwnedTeam(ownerUserId, teamId);
    team.name = input.name.trim();
    team.homeTown = input.homeTown;
    team.homeGround = input.homeGround;
    team.description = input.description;
    team.foundedAt = input.foundedAt;
    team.activityTime = input.activityTime;
    team.kfaRegistered = input.kfaRegistered;
    team.competitions = input.competitions;
    team.emblem = input.emblem;
    team.logoDataUrl = input.logoDataUrl;
    return this.teams.save(team);
  }

  async createPlayer(ownerUserId: string, teamId: string, input: PlayerInput) {
    await this.findOwnedTeam(ownerUserId, teamId);
    await this.validatePlayerInput(input, undefined, teamId);
    const player = await this.players.save(
      this.players.create({
        id: randomUUID(),
        teamId,
        userId: null,
        name: input.name.trim(),
        jerseyNumber: input.jerseyNumber ?? null,
        birthYear: input.birthYear,
        type: input.type,
      }),
    );
    await this.savePlayerPositions(player.id, input.positions);
    return this.getPlayer(player.id, teamId);
  }

  async updatePlayer(
    ownerUserId: string,
    teamId: string,
    playerId: string,
    input: PlayerInput,
  ) {
    await this.findOwnedTeam(ownerUserId, teamId);
    await this.validatePlayerInput(input, playerId, teamId);
    const player = await this.players.findOneBy({ id: playerId, teamId });
    if (!player) throw new NotFoundException('선수를 찾을 수 없습니다.');
    player.name = input.name.trim();
    player.jerseyNumber = input.jerseyNumber ?? null;
    player.birthYear = input.birthYear;
    player.type = input.type;
    await this.players.save(player);
    await this.playerPositions.delete({ teamPlayerId: playerId });
    await this.savePlayerPositions(playerId, input.positions);
    return this.getPlayer(playerId, teamId);
  }

  async listPlayers(ownerUserId: string, teamId: string) {
    await this.findOwnedTeam(ownerUserId, teamId);
    const players = await this.players.find({
      where: { teamId },
      relations: { positionLinks: { position: true } },
      order: { name: 'ASC' },
    });
    return players.map((player) => this.toPlayerResponse(player));
  }

  async deletePlayer(ownerUserId: string, teamId: string, playerId: string) {
    await this.findOwnedTeam(ownerUserId, teamId);
    const player = await this.players.findOneBy({ id: playerId, teamId });
    if (!player) throw new NotFoundException('선수를 찾을 수 없습니다.');
    await this.players.remove(player);
    await this.evaluations.delete({ playerId });
    return { success: true };
  }

  async joinForPlayer(inviteCode: string, jerseyNumber: number) {
    const team = await this.teams.findOneBy({ inviteCode });
    if (!team)
      throw new NotFoundException('초대 코드 또는 등번호를 확인해 주세요.');
    const player = await this.players.findOne({
      where: { teamId: team.id, jerseyNumber },
      relations: { positionLinks: { position: true } },
    });
    if (!player)
      throw new NotFoundException('초대 코드 또는 등번호를 확인해 주세요.');
    const evaluation = await this.evaluations.findOneBy({
      playerId: player.id,
    });
    return {
      team: {
        id: team.id,
        name: team.name,
        homeTown: team.homeTown,
        homeGround: team.homeGround,
        description: team.description,
      },
      player: this.toPlayerResponse(player),
      evaluation: evaluation?.scores ?? null,
    };
  }

  async getPlayerView(playerId: string) {
    const player = await this.players.findOne({
      where: { id: playerId },
      relations: { positionLinks: { position: true } },
    });
    if (!player) throw new NotFoundException('선수 정보를 찾을 수 없습니다.');
    const team = await this.teams.findOneBy({ id: player.teamId });
    if (!team) throw new NotFoundException('팀 정보를 찾을 수 없습니다.');
    const evaluation = await this.evaluations.findOneBy({ playerId });
    return {
      team: {
        id: team.id,
        name: team.name,
        homeTown: team.homeTown,
        homeGround: team.homeGround,
        description: team.description,
      },
      player: this.toPlayerResponse(player),
      evaluation: evaluation?.scores ?? null,
    };
  }

  private async getPlayer(playerId: string, teamId: string) {
    const player = await this.players.findOne({
      where: { id: playerId, teamId },
      relations: { positionLinks: { position: true } },
    });
    if (!player) throw new NotFoundException('선수를 찾을 수 없습니다.');
    return this.toPlayerResponse(player);
  }

  private toPlayerResponse(player: TeamPlayerEntity) {
    const positions = [...(player.positionLinks ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => link.position.label);
    return {
      id: player.id,
      name: player.name,
      jerseyNumber: player.jerseyNumber,
      birthYear: player.birthYear,
      preferredPositions: positions,
      type: player.type,
      userId: player.userId,
    };
  }

  private async validatePlayerInput(
    input: PlayerInput,
    playerId?: string,
    teamId?: string,
  ) {
    if (
      !input.name.trim() ||
      !Number.isInteger(input.birthYear) ||
      input.birthYear < 1900 ||
      input.birthYear > new Date().getFullYear() - 10 ||
      (input.jerseyNumber !== null &&
        input.jerseyNumber !== undefined &&
        (!Number.isInteger(input.jerseyNumber) ||
          input.jerseyNumber < 0 ||
          input.jerseyNumber > 99)) ||
      !Array.isArray(input.positions) ||
      input.positions.length === 0 ||
      (input.type !== 'member' && input.type !== 'guest')
    ) {
      throw new BadRequestException('선수 정보를 확인해 주세요.');
    }
    if (input.jerseyNumber != null && teamId) {
      const existing = await this.players.findOneBy({
        teamId,
        jerseyNumber: input.jerseyNumber,
      });
      if (existing && existing.id !== playerId) {
        throw new BadRequestException('이미 사용 중인 등번호입니다.');
      }
    }
  }

  private async savePlayerPositions(playerId: string, labels: string[]) {
    const catalog = await this.positions.find();
    const byLabel = new Map(
      catalog.map((position) => [position.label, position]),
    );
    const links = labels.flatMap((label, sortOrder) => {
      const position = byLabel.get(label);
      return position
        ? [
            this.playerPositions.create({
              teamPlayerId: playerId,
              positionId: position.id,
              sortOrder,
            }),
          ]
        : [];
    });
    if (links.length !== labels.length) {
      throw new BadRequestException(
        '등록되지 않은 포지션이 포함되어 있습니다.',
      );
    }
    await this.playerPositions.save(links);
  }

  private newInviteCode() {
    return randomBytes(6).toString('base64url').toUpperCase();
  }
}

export type PlayerInput = {
  name: string;
  jerseyNumber?: number | null;
  birthYear: number;
  positions: string[];
  type: 'member' | 'guest';
};

export type TeamInput = {
  name: string;
  homeTown: string;
  homeGround: string;
  description: string;
  foundedAt: string;
  activityTime: string;
  kfaRegistered: boolean;
  competitions: string;
  emblem: string;
  logoDataUrl: string;
};
