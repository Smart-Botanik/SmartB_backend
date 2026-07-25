import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
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
import { AuthFacade } from "./auth.facade";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { ListAdminUsersQueryDto } from "./dto/list-admin-users-query.dto";

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
  constructor(private readonly authFacade: AuthFacade) {}

  @Get()
  @ApiOperation({ summary: "List users (admin only)" })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  async list(
    @Query() query: ListAdminUsersQueryDto,
    @Headers("authorization") authorization?: string,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.authFacade.listUsersForAdmin(
      {
        page,
        pageSize,
        search: query.search?.trim() || undefined,
      },
      authorization,
    );
  }

  @Post()
  @ApiOperation({ summary: "Create user with role (admin only)" })
  @ApiCreatedResponse({ type: AdminUserRowDto })
  async create(
    @Body() dto: CreateAdminUserDto,
    @Headers("authorization") authorization?: string,
  ) {
    return this.authFacade.createProvisionedUser(
      {
        email: dto.email,
        username: dto.username,
        password: dto.password,
        role: dto.role,
      },
      authorization,
    );
  }
}
