import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ALG = "HS256";
const CLOCK_TOLERANCE_SECONDS = 30;

type SessionLike = {
  sub: string;
  email: string;
  role?: string;
};

async function getSession(token: string | undefined): Promise<SessionLike | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: [ALG],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    return payload as SessionLike;
  } catch {
    return null;
  }
}

function redirectToRoleHome(req: NextRequest, role: string | undefined) {
  const url = req.nextUrl.clone();
  url.pathname = role === "ADMIN" ? "/admin/accounts" : "/admin/content";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("kb_session")?.value;
  const session = await getSession(token);
  const role = session?.role === "ADMIN" || session?.role === "SUPPORT" ? session.role : undefined;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (pathname === "/admin") {
      return redirectToRoleHome(req, role);
    }

    const isAccountRoute = pathname === "/admin/accounts" || pathname.startsWith("/admin/accounts/");
    const isContentRoute = pathname === "/admin/content" || pathname.startsWith("/admin/content/");

    if (isAccountRoute && role !== "ADMIN") {
      return redirectToRoleHome(req, role);
    }

    if (isContentRoute && role !== "SUPPORT") {
      return redirectToRoleHome(req, role);
    }
  }

  if (pathname === "/admin/login" && session) {
    return redirectToRoleHome(req, role);
  }

  if (pathname.startsWith("/api/")) {
    const method = req.method.toUpperCase();
    const isMutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
    const isAuthRoute = pathname.startsWith("/api/auth/");
    const isPublicIssueGet = pathname.startsWith("/api/issues") && method === "GET";
    const isPublicCatTagGet =
      (pathname.startsWith("/api/categories") || pathname.startsWith("/api/tags")) && method === "GET";

    if (!session && !isAuthRoute && !isPublicIssueGet && !isPublicCatTagGet) {
      if (isMutation || pathname.startsWith("/api/admin")) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
