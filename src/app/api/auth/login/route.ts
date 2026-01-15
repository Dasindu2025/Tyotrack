import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  verifyPassword, 
  signAccessToken, 
  signRefreshToken, 
  setTokenCookies,
  checkRateLimit,
  resetRateLimit 
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    
    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        employeeProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check user status
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    resetRateLimit(ip);

    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles,
    };

    // Generate tokens
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    // Save refresh token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        lastLoginAt: new Date(),
      },
    });

    // Set cookies
    await setTokenCookies(accessToken, refreshToken);

    // Return user data (without sensitive fields)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        companyId: user.companyId,
        company: user.company ? {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug,
        } : null,
        employeeProfile: user.employeeProfile,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
