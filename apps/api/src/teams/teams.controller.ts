import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
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
      !value['inviteCode'].trim()
    ) {
      throw new BadRequestException('초대 코드를 입력해 주세요.');
    }
    const memberView = await this.teams.joinWithInviteCode(
      value['inviteCode'].trim().toUpperCase(),
    );
    const token = this.auth.createTeamViewerAccessToken(memberView.team.id);
    response.setHeader(
      'Set-Cookie',
      playerAccessCookie(token.token, token.expiresAt),
    );
    return memberView;
  }

  @Get('viewer/me')
  async getTeamView(@Req() request: Request) {
    const teamId = this.auth.findTeamIdByViewerAccessToken(
      readPlayerAccessTokenCookie(request.headers.cookie),
    );
    if (!teamId) {
      throw new UnauthorizedException('팀 초대 정보가 만료되었습니다.');
    }
    return this.teams.getTeamViewerView(teamId);
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

  @Post(':teamId/invite-code')
  @UseGuards(AuthGuard)
  regenerateInviteCode(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.teams.regenerateInviteCode(request.user.id, teamId);
  }

  @Get(':teamId/tactics')
  @UseGuards(AuthGuard)
  listTactics(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.teams.listTactics(request.user.id, teamId);
  }

  @Post(':teamId/tactics')
  @UseGuards(AuthGuard)
  saveTactic(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    if (
      typeof value['name'] !== 'string' ||
      !value['name'].trim() ||
      typeof value['data'] !== 'object' ||
      value['data'] === null ||
      Array.isArray(value['data'])
    ) {
      throw new BadRequestException('전술 이름과 배치 정보를 확인해 주세요.');
    }
    return this.teams.saveTactic(
      request.user.id,
      teamId,
      value['name'],
      value['data'] as Record<string, unknown>,
    );
  }

  @Patch(':teamId/tactics/:tacticId')
  @UseGuards(AuthGuard)
  updateTactic(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Param('tacticId') tacticId: string,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const input: {
      name?: string;
      data?: Record<string, unknown>;
      isShared?: boolean;
    } = {};
    if (typeof value['name'] === 'string' && value['name'].trim())
      input.name = value['name'];
    if (typeof value['isShared'] === 'boolean')
      input.isShared = value['isShared'];
    if (
      typeof value['data'] === 'object' &&
      value['data'] !== null &&
      !Array.isArray(value['data'])
    )
      input.data = value['data'] as Record<string, unknown>;
    return this.teams.updateTactic(request.user.id, teamId, tacticId, input);
  }

  @Delete(':teamId/tactics/:tacticId')
  @UseGuards(AuthGuard)
  deleteTactic(
    @Req() request: AuthenticatedRequest,
    @Param('teamId') teamId: string,
    @Param('tacticId') tacticId: string,
  ) {
    return this.teams.deleteTactic(request.user.id, teamId, tacticId);
  }
}
