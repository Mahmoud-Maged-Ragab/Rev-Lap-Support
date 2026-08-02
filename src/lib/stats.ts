import { normalizeRole, type Role } from "@/lib/permissions";
import { selectRows } from "@/lib/supabase";

/** All counts shown by the shared <DashboardStats /> cards. */
export type DashboardStatsData = {
  totalUsers: number;
  roleCounts: Record<Role, number>;
  issues: number;
  categories: number;
  tags: number;
};

/** Exact row count of a table via a single cheap `count: "exact"` query. */
export async function countRows(table: string): Promise<number> {
  const { count } = await selectRows(table, {
    select: "id",
    limit: 1,
    count: "exact",
  });
  return count ?? 0;
}

/**
 * Tally canonical role counts from already-fetched account rows — pages that
 * load the accounts list anyway should use this instead of extra count queries.
 */
export function countRoles(accounts: { role: string }[]): Record<Role, number> {
  return accounts.reduce(
    (acc, a) => {
      acc[normalizeRole(a.role)] += 1;
      return acc;
    },
    { OWNER: 0, ADMIN: 0, SUPPORT: 0 } as Record<Role, number>,
  );
}

/**
 * Collect every count the dashboards display. User/role numbers come from the
 * `accounts` rows the caller already fetched (no extra query); content counts
 * are fetched concurrently. Pass any content counts the caller already knows
 * via `known` to skip those queries too.
 */
export async function getDashboardStats(
  accounts: { role: string }[],
  known: Partial<Pick<DashboardStatsData, "issues" | "categories" | "tags">> = {},
): Promise<DashboardStatsData> {
  const [issues, categories, tags] = await Promise.all([
    known.issues ?? countRows("issues"),
    known.categories ?? countRows("categories"),
    known.tags ?? countRows("tags"),
  ]);
  return {
    totalUsers: accounts.length,
    roleCounts: countRoles(accounts),
    issues,
    categories,
    tags,
  };
}
