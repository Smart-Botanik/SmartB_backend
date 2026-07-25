import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@growing/contracts";
import { AuthRemoteService } from "./auth.remote-service";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthFacade {
  constructor(
    private readonly config: ConfigService,
    private readonly local: AuthService,
    private readonly remote: AuthRemoteService,
  ) {}

  private useRemote(): boolean {
    return this.config.get<string>("AUTH_CUTOVER")?.trim() !== "false";
  }

  private requireRemote(): void {
    if (!this.useRemote()) {
      throw new ServiceUnavailableException(
        "AUTH_CUTOVER must be enabled — grow User is an account stub; identity is in auth-service",
      );
    }
  }

  register(params: { email: string; username: string; password: string }) {
    this.requireRemote();
    return this.remote.register(params);
  }

  login(params: { identifier: string; password: string }) {
    this.requireRemote();
    return this.remote.login(params);
  }

  refresh(refreshToken: string) {
    this.requireRemote();
    return this.remote.refresh(refreshToken);
  }

  createProvisionedUser(
    params: {
      email: string;
      username: string;
      password: string;
      role: Role;
    },
    authorization?: string,
  ) {
    this.requireRemote();
    if (!authorization) {
      throw new UnauthorizedException(
        "Authorization header required for remote admin create",
      );
    }
    return this.remote.createProvisionedUserWithAuth(params, authorization);
  }

  me(_userId: string | undefined, authorization?: string) {
    this.requireRemote();
    if (!authorization) {
      return { user: null };
    }
    return this.remote.me(authorization);
  }

  logout(authorization?: string, refreshToken?: string) {
    if (!this.useRemote()) {
      return { message: "Successfully logged out" };
    }
    if (!authorization) {
      return { message: "Successfully logged out" };
    }
    return this.remote.logout(authorization, refreshToken);
  }

  listUsersForAdmin(
    params: { page: number; pageSize: number; search?: string },
    authorization?: string,
  ) {
    this.requireRemote();
    if (!authorization) {
      throw new UnauthorizedException(
        "Authorization header required for remote admin list",
      );
    }
    return this.remote.listUsersForAdmin(params, authorization);
  }
}
