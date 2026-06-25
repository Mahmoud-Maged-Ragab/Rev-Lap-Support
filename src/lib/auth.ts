import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const COOKIE = "kb_session";
const ALG = "HS256";
const CLOCK_TOLERANCE_SECONDS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set (>=32 chars). See .env.example.");
  }
  return new TextEncoder().encode(s);
}

function verifyOptions() {
  return {
    algorithms: [ALG] as string[],
    clockTolerance: CLOCK_TOLERANCE_SECONDS,
  };
}

export type Role = "ADMIN" | "SUPPORT";

export interface SessionPayload extends JWTPayload {
  sub: string; // admin id
  email: string;
  role: Role;
}

function normalizeRole(v: unknown): Role {
  return v === "ADMIN" ? "ADMIN" : "SUPPORT";
}

export async function requireSession(): Promise<SessionPayload | null> {
  const s = await readSession();
  if (!s) return null;
  return { ...s, role: normalizeRole(s.role) };
}

export function hasRole(session: SessionPayload | null, role: Role): boolean {
  return !!session && normalizeRole(session.role) === role;
}

export async function createSession(payload: SessionPayload, maxAgeSec = 60 * 60 * 8) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE);
}

export async function readSession(token?: string): Promise<SessionPayload | null> {
  const raw = token ?? cookies().get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret(), verifyOptions());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), verifyOptions());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;
