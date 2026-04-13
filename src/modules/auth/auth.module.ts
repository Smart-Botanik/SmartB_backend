import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController, AdminAuthController } from "./auth.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RolesGuard } from "./guards/roles.guard";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController, AdminAuthController, AdminUsersController],
  providers: [AuthService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
