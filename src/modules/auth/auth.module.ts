import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController, AdminAuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
