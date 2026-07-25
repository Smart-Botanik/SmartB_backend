import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@growing/contracts";
import { JwtPayload } from "./types/jwt-payload.type";

/**
 * Local JWT helpers + cutover-off stubs.
 * Identity CRUD lives in auth-service when AUTH_CUTOVER is on (default).
 * Grow `User` is an account stub — no credentials here.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private cutoverRequired(): never {
    throw new ServiceUnavailableException(
      "Grow User is an account stub (ADR-0023). Set AUTH_CUTOVER=true and use auth-service for login/register/roles.",
    );
  }

  register(_params: {
    email: string;
    username: string;
    password: string;
  }): never {
    return this.cutoverRequired();
  }

  createProvisionedUser(_params: {
    email: string;
    username: string;
    password: string;
    role: Role;
  }): never {
    return this.cutoverRequired();
  }

  login(_params: { identifier: string; password: string }): never {
    return this.cutoverRequired();
  }

  async issueTokens(params: { userId: string; email: string; role: Role }) {
    const payload: JwtPayload = {
      sub: params.userId,
      email: params.email,
      role: params.role,
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

  async refresh(_refreshToken: string): Promise<never> {
    throw new UnauthorizedException(
      "Refresh tokens require auth-service (set AUTH_CUTOVER=true)",
    );
  }
}
