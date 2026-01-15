import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken, signAccessToken, JWTPayload } from "./jwt";
import { getAccessToken, getRefreshToken, setTokenCookies } from "./cookies";
import { Role } from "@prisma/client";

export interface AuthContext {
  user: JWTPayload;
  companyId: string;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

export type RoleHandler = (
  req: NextRequest,
  context: AuthContext,
  params?: unknown
) => Promise<NextResponse>;

// Rate limiting storage (in-memory for simplicity)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);

  if (!attempts || now - attempts.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const accessToken = await getAccessToken();
  
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      return {
        user: payload,
        companyId: payload.companyId || "",
      };
    }
  }

  // Try to refresh the token
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload) {
      // Issue new access token
      const newAccessToken = await signAccessToken(payload);
      await setTokenCookies(newAccessToken, refreshToken);
      return {
        user: payload,
        companyId: payload.companyId || "",
      };
    }
  }

  return null;
}

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(req, context);
  };
}

export function withRoles(roles: Role[], handler: RoleHandler) {
  return async (req: NextRequest, params?: unknown): Promise<NextResponse> => {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const hasRole = context.user.roles.some((role) => roles.includes(role));
    if (!hasRole) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(req, context, params);
  };
}

export function withTenant(handler: RoleHandler) {
  return async (req: NextRequest, params?: unknown): Promise<NextResponse> => {
    const context = await getAuthContext();
    
    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // SUPER_ADMIN can access without tenant
    if (context.user.roles.includes(Role.SUPER_ADMIN)) {
      return handler(req, context, params);
    }

    // Regular users must have a companyId
    if (!context.companyId) {
      return NextResponse.json(
        { error: "No company associated with this user" },
        { status: 403 }
      );
    }

    return handler(req, context, params);
  };
}
