import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  normalizeRole,
  canManageUsers,
  canManageContent,
  canAccessOwnerPanel,
  type Role,
} from "@/lib/permissions";

const ALG = "HS256";
const CLOCK_TOLERANCE_SECONDS = 30;

type SessionLike = {
  sub: string;
  email: string;
  role?: unknown;
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

/** Each role's landing page after sign-in / when bounced off a forbidden route. */
function roleHomePath(role: Role): string {
  if (role === "OWNER") return "/owner";
  if (role === "ADMIN") return "/admin/accounts";
  return "/admin/content";
}

function redirectToRoleHome(req: NextRequest, role: Role) {
  const url = req.nextUrl.clone();
  url.pathname = roleHomePath(role);
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("kb_session")?.value;
  const session = await getSession(token);
  const role: Role | null = session ? normalizeRole(session.role) : null;

  // --- Owner dashboard: OWNER only -----------------------------------------
  if (pathname === "/owner" || pathname.startsWith("/owner/")) {
    if (!session || !role) return redirectToLogin(req, pathname);
    if (!canAccessOwnerPanel(role)) return redirectToRoleHome(req, role);
    return NextResponse.next();
  }

  // --- Admin area -----------------------------------------------------------
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || !role) return redirectToLogin(req, pathname);

    if (pathname === "/admin") {
      return redirectToRoleHome(req, role);
    }

    const isAccountRoute =
      pathname === "/admin/accounts" ||
      pathname.startsWith("/admin/accounts/") ||
      pathname === "/admin/users" ||
      pathname.startsWith("/admin/users/");
    const isContentRoute =
      pathname === "/admin/content" ||
      pathname.startsWith("/admin/content/") ||
      pathname.startsWith("/admin/categories") ||
      pathname.startsWith("/admin/tags") ||
      pathname.startsWith("/admin/issues");

    if (isAccountRoute && !canManageUsers(role)) {
      return redirectToRoleHome(req, role);
    }

    if (isContentRoute && !canManageContent(role)) {
      return redirectToRoleHome(req, role);
    }
  }

  if (pathname === "/admin/login" && session && role) {
    return redirectToRoleHome(req, role);
  }

  // --- API ------------------------------------------------------------------
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
  matcher: ["/owner/:path*", "/admin/:path*", "/api/:path*"],
};
