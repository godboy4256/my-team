import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';

const tokenLifetimeSeconds = 7 * 24 * 60 * 60;
const playerTokenLifetimeSeconds = 10 * 365 * 24 * 60 * 60;

export type PublicUser = Pick<UserEntity, 'id' | 'name' | 'age' | 'username'>;

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
  role?: 'manager' | 'player';
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async signUp(input: {
    name: string;
    age: number;
    username: string;
    password: string;
  }) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${scryptSync(input.password, salt, 64).toString('hex')}`;
    try {
      const user = await this.users.save(
        this.users.create({ ...input, passwordHash }),
      );
      return this.createToken(user);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('이미 사용 중인 아이디입니다.');
      }
      throw error;
    }
  }

  async logIn(username: string, password: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username })
      .getOne();
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('아이디 또는 비밀번호를 확인해 주세요.');
    }
    return this.createToken(user);
  }

  async findByAccessToken(
    token: string | undefined,
  ): Promise<PublicUser | null> {
    if (!token) return null;
    const payload = this.verifyJwt(token);
    if (!payload || (payload.role && payload.role !== 'manager')) return null;
    const user = await this.users.findOneBy({ id: payload.sub });
    return user ? this.toPublicUser(user) : null;
  }

  createPlayerAccessToken(playerId: string) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((issuedAt + playerTokenLifetimeSeconds) * 1000);
    const token = this.signJwt({
      sub: playerId,
      iat: issuedAt,
      exp: issuedAt + playerTokenLifetimeSeconds,
      role: 'player',
    });
    return { token, expiresAt };
  }

  findPlayerIdByAccessToken(token: string | undefined) {
    if (!token) return null;
    const payload = this.verifyJwt(token);
    return payload?.role === 'player' ? payload.sub : null;
  }

  private createToken(user: UserEntity) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((issuedAt + tokenLifetimeSeconds) * 1000);
    const token = this.signJwt({
      sub: user.id,
      iat: issuedAt,
      exp: issuedAt + tokenLifetimeSeconds,
      role: 'manager',
    });
    return { token, expiresAt, user: this.toPublicUser(user) };
  }

  private signJwt(payload: JwtPayload) {
    const header = encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
    const body = encodeBase64Url(payload);
    const content = `${header}.${body}`;
    const signature = createHmac('sha256', this.jwtSecret())
      .update(content)
      .digest('base64url');
    return `${content}.${signature}`;
  }

  private verifyJwt(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const content = `${encodedHeader}.${encodedPayload}`;
    const expected = createHmac('sha256', this.jwtSecret())
      .update(content)
      .digest();
    const actual = Buffer.from(encodedSignature, 'base64url');
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    try {
      const header: unknown = JSON.parse(
        Buffer.from(encodedHeader, 'base64url').toString('utf8'),
      );
      const payload: unknown = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      );
      if (
        typeof header !== 'object' ||
        header === null ||
        !('alg' in header) ||
        header.alg !== 'HS256' ||
        typeof payload !== 'object' ||
        payload === null ||
        !('sub' in payload) ||
        typeof payload.sub !== 'string' ||
        !('iat' in payload) ||
        typeof payload.iat !== 'number' ||
        !('exp' in payload) ||
        typeof payload.exp !== 'number' ||
        ('role' in payload &&
          payload.role !== 'manager' &&
          payload.role !== 'player') ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        return null;
      }
      return payload as JwtPayload;
    } catch {
      return null;
    }
  }

  private jwtSecret() {
    const secret = process.env['JWT_SECRET'];
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters.');
    }
    return secret;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, expected.length);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private toPublicUser(user: UserEntity): PublicUser {
    return {
      id: user.id,
      name: user.name,
      age: user.age,
      username: user.username,
    };
  }
}

function encodeBase64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function readAccessTokenCookie(header: string | undefined) {
  const cookie = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('myteam_access_token='));
  return cookie
    ? decodeURIComponent(cookie.slice('myteam_access_token='.length))
    : undefined;
}

export function sessionCookie(token: string, expiresAt: Date) {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `myteam_access_token=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function expiredSessionCookie() {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `myteam_access_token=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readPlayerAccessTokenCookie(header: string | undefined) {
  const cookie = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('myteam_player_access='));
  return cookie
    ? decodeURIComponent(cookie.slice('myteam_player_access='.length))
    : undefined;
}

export function playerAccessCookie(token: string, expiresAt: Date) {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  const maxAge = playerTokenLifetimeSeconds;
  return `myteam_player_access=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function expiredPlayerAccessCookie() {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `myteam_player_access=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

@Injectable()
export class AuthGuard {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: import('@nestjs/common').ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<import('express').Request & { user?: PublicUser }>();
    const user = await this.auth.findByAccessToken(
      readAccessTokenCookie(request.headers.cookie),
    );
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');
    request.user = user;
    return true;
  }
}

export type AuthenticatedRequest = import('express').Request & {
  user: PublicUser;
};
