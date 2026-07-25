import { Injectable } from "@nestjs/common";
import { Role } from "@growing/contracts";
import { UserProfileRemoteService } from "../profile/user-profile.remote-service";
import { AuthRemoteHttpClient } from "./auth-remote.http-client";
import { GrowAccountService } from "./grow-account.service";

type AuthUserPayload = {
  id: string;
  createdAt: string;
  email: string;
  username: string;
  role: Role | string;
};

type AuthTokensResponse = {
  jwt: string;
  refreshToken?: string;
  user: AuthUserPayload;
};

type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class AuthRemoteService {
  constructor(
    private readonly remote: AuthRemoteHttpClient,
    private readonly growAccount: GrowAccountService,
    private readonly userProfiles: UserProfileRemoteService,
  ) {}

  private async ensureDomainAccounts(user: {
    id: string;
    email: string;
    username: string;
  }) {
    await this.growAccount.ensureGrowAccount(user.id);
    await this.userProfiles.ensureProfile({
      id: user.id,
      email: user.email,
      displayName: user.username,
    });
  }

  async register(params: {
    email: string;
    username: string;
    password: string;
  }) {
    const result = await this.remote.requestJson<AuthTokensResponse>(
      "POST",
      "/auth/register",
      { body: params },
    );
    await this.ensureDomainAccounts(result.user);
    return result;
  }

  async login(params: { identifier: string; password: string }) {
    const result = await this.remote.requestJson<AuthTokensResponse>(
      "POST",
      "/auth/login",
      { body: params },
    );
    await this.ensureDomainAccounts(result.user);
    return result;
  }

  async refresh(refreshToken: string) {
    const result = await this.remote.requestJson<AuthTokensResponse>(
      "POST",
      "/auth/refresh",
      { body: { refreshToken } },
    );
    await this.ensureDomainAccounts(result.user);
    return result;
  }

  createProvisionedUserWithAuth(
    params: {
      email: string;
      username: string;
      password: string;
      role: Role;
    },
    authorization: string,
  ) {
    return this.remote
      .requestJson<AdminUserRow>("POST", "/admin/users", {
        body: params,
        headers: { Authorization: authorization },
      })
      .then(async (result) => {
        await this.ensureDomainAccounts({
          id: result.id,
          email: result.email,
          username: result.username,
        });
        return result;
      });
  }

  async me(authorization: string) {
    const authMe = await this.remote.requestJson<{
      id?: string;
      username?: string;
      email?: string;
      role?: string;
      user?: null;
    }>("GET", "/auth/me", {
      headers: { Authorization: authorization },
    });
    if (!authMe?.id || !authMe.email) {
      return authMe;
    }
    const profile = await this.userProfiles.ensureProfile({
      id: authMe.id,
      email: authMe.email,
      displayName: authMe.username,
    });
    return {
      ...authMe,
      displayName: profile?.displayName ?? authMe.username,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      avatarMediaId: profile?.avatarMediaId ?? null,
    };
  }

  logout(authorization: string, refreshToken?: string) {
    return this.remote.requestJson<{ message: string }>("POST", "/auth/logout", {
      body: { refreshToken },
      headers: { Authorization: authorization },
    });
  }

  listUsersForAdmin(
    params: { page: number; pageSize: number; search?: string },
    authorization: string,
  ) {
    return this.remote.requestJson<{ items: AdminUserRow[]; total: number }>(
      "GET",
      "/admin/users",
      {
        query: {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
        },
        headers: { Authorization: authorization },
      },
    );
  }
}
