import { Module, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ProfileModule } from "../profile/profile.module";
import { UsersModule } from "../users/users.module";
import { AdminUsersController } from "./admin-users.controller";
import { AuthController, AdminAuthController } from "./auth.controller";
import { AuthFacade } from "./auth.facade";
import { AuthRemoteHttpClient } from "./auth-remote.http-client";
import { AuthRemoteService } from "./auth.remote-service";
import { AuthService } from "./auth.service";
import { GrowAccountService } from "./grow-account.service";
import { RolesGuard } from "./guards/roles.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    UsersModule,
    ProfileModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController, AdminAuthController, AdminUsersController],
  providers: [
    AuthService,
    AuthRemoteHttpClient,
    AuthRemoteService,
    GrowAccountService,
    AuthFacade,
    JwtStrategy,
    RolesGuard,
  ],
  exports: [GrowAccountService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cutover = this.config.get<string>("AUTH_CUTOVER")?.trim() !== "false";
    const url = this.config.get<string>("AUTH_SERVICE_URL")?.trim();
    if (cutover && !url) {
      throw new ServiceUnavailableException(
        "AUTH_CUTOVER requires AUTH_SERVICE_URL (auth-service)",
      );
    }
  }
}
