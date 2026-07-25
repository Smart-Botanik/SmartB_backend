import { Injectable, Logger } from "@nestjs/common";
import { UserRemoteGraphqlClient } from "./user-remote.graphql-client";
import {
  MUTATION_ENSURE_USER_PROFILE,
  MUTATION_UPDATE_USER_PROFILE,
  QUERY_USER_PROFILE,
} from "./user-remote.operations";

export type UserProfileRemote = {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarMediaId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

@Injectable()
export class UserProfileRemoteService {
  private readonly logger = new Logger(UserProfileRemoteService.name);

  constructor(private readonly remote: UserRemoteGraphqlClient) {}

  async getProfile(id: string): Promise<UserProfileRemote | null> {
    if (!this.remote.isEnabled()) return null;
    const data = await this.remote.execute<{
      userProfile: UserProfileRemote | null;
    }>(QUERY_USER_PROFILE, { id });
    return data.userProfile;
  }

  async ensureProfile(input: {
    id: string;
    email: string;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<UserProfileRemote | null> {
    if (!this.remote.isEnabled()) {
      this.logger.warn(
        "USER_SERVICE_URL not set — skip ensureUserProfile",
      );
      return null;
    }
    const data = await this.remote.execute<{
      ensureUserProfile: UserProfileRemote;
    }>(MUTATION_ENSURE_USER_PROFILE, { input });
    return data.ensureUserProfile;
  }

  async updateProfile(
    id: string,
    input: {
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      avatarMediaId?: string | null;
    },
  ): Promise<UserProfileRemote> {
    const data = await this.remote.execute<{
      updateUserProfile: UserProfileRemote;
    }>(MUTATION_UPDATE_USER_PROFILE, { id, input });
    return data.updateUserProfile;
  }
}
