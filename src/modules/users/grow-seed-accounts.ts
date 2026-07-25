/**
 * Grow seed account ids — re-export platform canonical ids (ADR-0024).
 * @deprecated Prefer PLATFORM_SEED_ACCOUNT_IDS from @growing/contracts
 */
export {
  PLATFORM_SEED_ACCOUNT_IDS as GROW_SEED_ACCOUNT_IDS,
  PLATFORM_SEED_ACCOUNTS,
  type PlatformSeedAccountKey as GrowSeedAccountKey,
} from "@growing/contracts";
