import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AuthGuard,
  AuthService,
  expiredSessionCookie,
  sessionCookie,
} from './auth.service';
import type { AuthenticatedRequest } from './auth.service';

function readCredentials(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('입력 정보를 확인해 주세요.');
  }
  const value = body as Record<string, unknown>;
  const username =
    typeof value['username'] === 'string'
      ? value['username'].trim().toLowerCase()
      : '';
  const password =
    typeof value['password'] === 'string' ? value['password'] : '';
  if (
    !/^[a-z0-9_.-]{3,30}$/.test(username) ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw new BadRequestException(
      '아이디는 영문·숫자 3~30자, 비밀번호는 8~128자로 입력해 주세요.',
    );
  }
  return { username, password };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signUp(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException('가입 정보를 입력해 주세요.');
    }
    const value = body as Record<string, unknown>;
    const name = typeof value['name'] === 'string' ? value['name'].trim() : '';
    const age = value['age'];
    const credentials = readCredentials(body);
    if (
      name.length < 1 ||
      name.length > 80 ||
      !Number.isInteger(age) ||
      Number(age) < 13 ||
      Number(age) > 100
    ) {
      throw new BadRequestException(
        '이름과 13~100세 사이 나이를 확인해 주세요.',
      );
    }
    const session = await this.auth.signUp({
      name,
      age: Number(age),
      ...credentials,
    });
    response.setHeader(
      'Set-Cookie',
      sessionCookie(session.token, session.expiresAt),
    );
    return { user: session.user };
  }

  @Post('login')
  async logIn(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { username, password } = readCredentials(body);
    const session = await this.auth.logIn(username, password);
    response.setHeader(
      'Set-Cookie',
      sessionCookie(session.token, session.expiresAt),
    );
    return { user: session.user };
  }

  @Post('logout')
  async logOut(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', expiredSessionCookie());
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
