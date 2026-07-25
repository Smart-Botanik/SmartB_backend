import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";

/** Thin auth-module facade over UsersService.ensureGrowAccount. */
@Injectable()
export class GrowAccountService {
  constructor(private readonly usersService: UsersService) {}

  ensureGrowAccount(userId: string) {
    return this.usersService.ensureGrowAccount(userId);
  }
}
