import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { AuthFacade } from "./auth.facade";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

class AuthUserResponseDto {
  jwt!: string;
  refreshToken?: string;

  user!: {
    id: string;
    createdAt: string;
    email: string;
    username: string;
    role: string;
  };
}

class MeResponseDto {
  id!: string;
  username!: string;
  email!: string;
  role!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authFacade: AuthFacade) {}

  @ApiOperation({ summary: "Register a new user" })
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authFacade.register({
      email: dto.email,
      username: dto.username,
      password: dto.password,
    });
  }

  @ApiOperation({ summary: "Login (identifier + password)" })
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authFacade.login({
      identifier: dto.identifier,
      password: dto.password,
    });
  }

  @ApiOperation({ summary: "Refresh access token" })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authFacade.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: "Get current user by access token" })
  @ApiBearerAuth("access-token")
  @ApiOkResponse({ type: MeResponseDto })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(
    @Req() req: Request,
    @Headers("authorization") authorization?: string,
  ) {
    const userId = (req.user as { userId?: string } | undefined)?.userId;
    return this.authFacade.me(userId, authorization);
  }

  @ApiOperation({ summary: "Logout user" })
  @ApiBearerAuth("access-token")
  @ApiOkResponse({ description: "Successfully logged out" })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(
    @Headers("authorization") authorization?: string,
    @Body() body?: { refreshToken?: string },
  ) {
    return this.authFacade.logout(authorization, body?.refreshToken);
  }
}

@ApiTags("admin-auth")
@Controller("admin/auth")
export class AdminAuthController {}
