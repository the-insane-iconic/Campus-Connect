import { createAuthClient } from "@neondatabase/auth";

export const NEON_AUTH_URL = "https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth";
export const NEON_JWKS_URL = "https://ep-broad-morning-b30i16bo.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json";

export const authClient = createAuthClient(NEON_AUTH_URL);

export { createAuthClient };
