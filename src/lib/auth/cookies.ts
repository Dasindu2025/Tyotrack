import { cookies } from "next/headers";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

const ACCESS_TOKEN_NAME = "tyotrack_access_token";
const REFRESH_TOKEN_NAME = "tyotrack_refresh_token";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export async function setTokenCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  cookieStore.set(ACCESS_TOKEN_NAME, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60, // 15 minutes
  });
  
  cookieStore.set(REFRESH_TOKEN_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_NAME)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_NAME)?.value;
}

export async function clearTokenCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_NAME);
  cookieStore.delete(REFRESH_TOKEN_NAME);
}
