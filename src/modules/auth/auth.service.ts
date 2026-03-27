import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { JwtPayload } from "./types/jwt-payload.type";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(params: {
    email: string;
    username: string;
    password: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const normalizedUsername = params.username.trim();
    const passwordHash = await this.hashPassword(params.password);

    const user = await this.usersService.createUser({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
    });

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
    });

    return {
      jwt: tokens.accessToken,
      user: {
        id: user.id,
        createdAt: user.createdAt.toISOString(),
        email: user.email,
        username: user.username,
      },
    };
  }

  async login(params: { identifier: string; password: string }) {
    const normalizedIdentifier = params.identifier.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedIdentifier);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await this.verifyPassword(params.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
    });

    return {
      jwt: tokens.accessToken,
      user: {
        id: user.id,
        createdAt: user.createdAt.toISOString(),
        email: user.email,
        username: user.username,
      },
    };
  }

  async issueTokens(params: { userId: string; email: string }) {
    const payload: JwtPayload = {
      sub: params.userId,
      email: params.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      expiresIn:
        this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
    });

    return {
      accessToken,
    };
  }
}
