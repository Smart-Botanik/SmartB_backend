import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@growing/contracts";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { AuthService } from "./auth.service";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { ListAdminUsersQueryDto } from "./dto/list-admin-users-query.dto";
import { UsersService } from "../users/users.service";

class AdminUserRowDto {
  id!: string;
  email!: string;
  username!: string;
  role!: string;
  createdAt!: string;
  updatedAt!: string;
}

class AdminUserListResponseDto {
  items!: AdminUserRowDto[];
  total!: number;
}

@ApiTags("admin-users")
@ApiBearerAuth("access-token")
@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List users (admin only)" })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  async list(@Query() query: ListAdminUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    return this.usersService.findManyForAdmin({
      skip,
      take: pageSize,
      search: query.search?.trim() || undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: "Create user with role (admin only)" })
  @ApiCreatedResponse({ type: AdminUserRowDto })
  async create(@Body() dto: CreateAdminUserDto) {
    return this.authService.createProvisionedUser({
      email: dto.email,
      username: dto.username,
      password: dto.password,
      role: dto.role,
    });
  }
}
