import { readSession } from "@/lib/auth";
import { normalizeRole, canManageContent, type Role } from "@/lib/permissions";
import TutorialClient from "../../components/TutorialClient";

export const dynamic = "force-dynamic";

export default async function TutorialGuidePage() {
  const session = await readSession();

  if (!session) {
    return (
      <TutorialClient
        auth={{
          authenticated: false,
          role: null,
          hasAccess: false,
        }}
      />
    );
  }

  const role = normalizeRole(session.role);
  const hasAccess = canManageContent(role);

  return (
    <TutorialClient
      auth={{
        authenticated: true,
        role,
        hasAccess,
      }}
    />
  );
}
