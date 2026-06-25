import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ALG = "HS256";
const CLOCK_TOLERANCE_SECONDS = 30;

async function isValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: [ALG],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("kb_session")?.value;
  const valid = await isValid(token);

  // Protect /admin pages (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Block mutating admin API routes if no session
  if (pathname.startsWith("/api/")) {
    const method = req.method.toUpperCase();
    const isMutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
    const isAuthRoute = pathname.startsWith("/api/auth/");
    const isPublicIssueGet = pathname.startsWith("/api/issues") && method === "GET";
    const isPublicCatTagGet =
      (pathname.startsWith("/api/categories") || pathname.startsWith("/api/tags")) && method === "GET";

    if (!valid && !isAuthRoute && !isPublicIssueGet && !isPublicCatTagGet) {
      if (isMutation || pathname.startsWith("/api/admin")) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  // Redirect logged-in admins away from the login page
  if (pathname === "/admin/login" && valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
