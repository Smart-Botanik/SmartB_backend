import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { UsersService } from "../users/users.service";

class AuthUserResponseDto {
  jwt!: string;

  user!: {
    id: string;
    createdAt: string;
    email: string;
    username: string;
  };
}

class MeResponseDto {
  id!: string;
  username!: string;
  email!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: "Register a new user" })
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register({
      email: dto.email,
      username: dto.username,
      password: dto.password,
    });
  }

  @ApiOperation({ summary: "Login (identifier + password)" })
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login({
      identifier: dto.identifier,
      password: dto.password,
    });
  }

  @ApiOperation({ summary: "Get current user by access token" })
  @ApiBearerAuth("access-token")
  @ApiOkResponse({ type: MeResponseDto })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: Request) {
    const userId = (req.user as any)?.userId as string | undefined;
    if (!userId) {
      return { user: null };
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      return { user: null };
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }
}
