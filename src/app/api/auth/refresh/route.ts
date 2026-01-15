import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  getRefreshToken, 
  verifyRefreshToken, 
  signAccessToken,
  setTokenCookies 
} from "@/lib/auth";

export async function POST() {
  try {
    const refreshToken = await getRefreshToken();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token" },
        { status: 401 }
      );
    }

    // Verify the refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Check if token matches the one in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Generate new access token
    const newPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles,
    };

    const newAccessToken = await signAccessToken(newPayload);
    
    // Set the new token
    await setTokenCookies(newAccessToken, refreshToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
