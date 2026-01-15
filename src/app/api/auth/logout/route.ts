import { NextResponse } from "next/server";
import { clearTokenCookies, getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const context = await getAuthContext();
    
    if (context) {
      // Clear refresh token from database
      await prisma.user.update({
        where: { id: context.user.userId },
        data: { refreshToken: null },
      });
    }

    // Clear cookies
    await clearTokenCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookies even if DB update fails
    await clearTokenCookies();
    return NextResponse.json({ success: true });
  }
}
