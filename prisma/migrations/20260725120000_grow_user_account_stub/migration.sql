-- Grow account stub (ADR-0023 amended): drop identity columns from grow_db.User.
-- Credentials / roles stay in auth-service. id remains the ownership key (= jwt.sub).

DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_username_key";

ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
ALTER TABLE "User" DROP COLUMN IF EXISTS "username";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" DROP COLUMN IF EXISTS "updatedAt";

DROP TYPE IF EXISTS "Role";
