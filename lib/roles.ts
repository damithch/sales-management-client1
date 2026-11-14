export const ROLES = ["Developer", "Admin", "Sales Rep"] as const;
export type Role = (typeof ROLES)[number];

const rank: Record<Role, number> = { "Sales Rep": 1, Admin: 2, Developer: 3 };

export function hasRole(role: Role, minimum: Role) {
  return rank[role] >= rank[minimum];
}

/** Roles strictly below the given one: the accounts it may manage. */
export function rolesBelow(role: Role): Role[] {
  return ROLES.filter((other) => rank[other] < rank[role]);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
