import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AuthGuard,
  AuthService,
  expiredPlayerAccessCookie,
  playerAccessCookie,
  readPlayerAccessTokenCookie,
} from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.service';
import { TeamsService } from './teams.service';
import type { PlayerInput, TeamInput } from './teams.service';

function objectBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('요청 정보를 확인해 주세요.');
  }
  return value as Record<string, unknown>;
}

function readPlayerInput(body: unknown): PlayerInput {
  const value = objectBody(body);
  const name = value['name'];
  const birthYear = value['birthYear'];
  const positions = value['positions'];
  const type = value['type'];
  const jerseyNumber = value['jerseyNumber'];
  if (
    typeof name !== 'string' ||
    typeof birthYear !== 'number' ||
    !Array.isArray(positions) ||
    !positions.every((position) => typeof position === 'string') ||
    (type !== 'member' && type !== 'guest') ||
    (jerseyNumber !== undefined &&
      jerseyNumber !== null &&
      typeof jerseyNumber !== 'number')
  ) {
    throw new BadRequestException('선수 정보를 확인해 주세요.');
  }
  return {
    name,
    birthYear,
    jerseyNumber: jerseyNumber as number | null | undefined,
    positions,
    type,
  };
}

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teams: TeamsService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const value = objectBody(body);
    if (typeof value['name'] !== 'string' || !value['name'].trim()) {
      throw new BadRequestException('팀 이름을 입력해 주세요.');
    }
    return this.teams.create(request.user.id, value['name'].trim());
  }

  @Get()
  @UseGuards(AuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.teams.listForOwner(request.user.id);
  }

  @Put(':teamId')
  @UseGuards(AuthGuard)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const fields = [
      'name',
      'homeTown',
      'homeGround',
      'description',
      'foundedAt',
      'activityTime',
      'competitions',
      'emblem',
      'logoDataUrl',
    ] as const;
    if (
      fields.some((field) => typeof value[field] !== 'string') ||
      typeof value['kfaRegistered'] !== 'boolean'
    ) {
      throw new BadRequestException('팀 정보를 확인해 주세요.');
    }
    return this.teams.updateTeam(
      request.user.id,
      teamId,
      value as unknown as TeamInput,
    );
  }

  @Post('join')
  async join(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const value = objectBody(body);
    if (
      typeof value['inviteCode'] !== 'string' ||
      typeof value['jerseyNumber'] !== 'number' ||
      !Number.isInteger(value['jerseyNumber']) ||
      value['jerseyNumber'] < 0 ||
      value['jerseyNumber'] > 99
    ) {
      throw new BadRequestException('초대 코드와 등번호를 입력해 주세요.');
    }
    const memberView = await this.teams.joinForPlayer(
      value['inviteCode'].trim().toUpperCase(),
      value['jerseyNumber'],
    );
    const token = this.auth.createPlayerAccessToken(memberView.player.id);
    response.setHeader(
      'Set-Cookie',
      playerAccessCookie(token.token, token.expiresAt),
    );
    return memberView;
  }

  @Get('member/me')
  async getPlayerView(@Req() request: Request) {
    const playerId = this.auth.findPlayerIdByAccessToken(
      readPlayerAccessTokenCookie(request.headers.cookie),
    );
    if (!playerId) {
      throw new UnauthorizedException('팀 조회 정보가 만료되었습니다.');
    }
    return this.teams.getPlayerView(playerId);
  }

  @Post('member/logout')
  clearPlayerView(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', expiredPlayerAccessCookie());
    return { success: true };
  }

  @Get(':teamId/players')
  @UseGuards(AuthGuard)
  findPlayers(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.teams.listPlayers(request.user.id, teamId);
  }

  @Post(':teamId/players')
  @UseGuards(AuthGuard)
  createPlayer(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Body() body: unknown,
  ) {
    return this.teams.createPlayer(
      request.user.id,
      teamId,
      readPlayerInput(body),
    );
  }

  @Put(':teamId/players/:playerId')
  @UseGuards(AuthGuard)
  updatePlayer(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
    @Body() body: unknown,
  ) {
    return this.teams.updatePlayer(
      request.user.id,
      teamId,
      playerId,
      readPlayerInput(body),
    );
  }

  @Delete(':teamId/players/:playerId')
  @UseGuards(AuthGuard)
  deletePlayer(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.teams.deletePlayer(request.user.id, teamId, playerId);
  }

  @Get(':teamId')
  @UseGuards(AuthGuard)
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.teams.findOwnedTeam(request.user.id, teamId);
  }
}
