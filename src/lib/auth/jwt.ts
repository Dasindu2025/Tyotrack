import * as jose from "jose";
import { Role } from "@prisma/client";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "default-access-secret-key-32chars!!"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key-32char!!"
);

export interface JWTPayload {
  userId: string;
  email: string;
  companyId: string | null;
  roles: Role[];
}

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  const token = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRY || "15m")
    .sign(ACCESS_SECRET);
  return token;
}

export async function signRefreshToken(payload: JWTPayload): Promise<string> {
  const token = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRY || "7d")
    .sign(REFRESH_SECRET);
  return token;
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, ACCESS_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      companyId: payload.companyId as string | null,
      roles: payload.roles as Role[],
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, REFRESH_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      companyId: payload.companyId as string | null,
      roles: payload.roles as Role[],
    };
  } catch {
    return null;
  }
}
