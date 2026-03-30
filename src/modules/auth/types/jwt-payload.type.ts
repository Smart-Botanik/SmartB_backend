import { Role } from "@growing/contracts";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};
