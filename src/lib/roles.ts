// Centralized role constants. Values match the database `app_role` enum.
export const APP_ROLES = {
  SUPER_ADMIN: "owner",
  COMPANY_ADMIN: "company_admin",
  BRANCH_MANAGER: "admin",
  CONSULTANT: "agent",
} as const;

export type AppRoleValue = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_PREFIXES: Record<string, string> = {
  [APP_ROLES.SUPER_ADMIN]: "/owner",
  [APP_ROLES.COMPANY_ADMIN]: "/company",
  [APP_ROLES.BRANCH_MANAGER]: "/admin",
  [APP_ROLES.CONSULTANT]: "/agent",
};

export const getRolePrefix = (role: string | null | undefined) => {
  if (!role) return "/agent";
  return ROLE_PREFIXES[role] ?? "/agent";
};

export const getHomeRoute = (role: string | null | undefined) => {
  return `${getRolePrefix(role)}/dashboard`;
};

export const getRoleLabel = (role: string | null | undefined) => {
  switch (role) {
    case APP_ROLES.SUPER_ADMIN:
      return "Super Admin";
    case APP_ROLES.COMPANY_ADMIN:
      return "Company Admin";
    case APP_ROLES.BRANCH_MANAGER:
      return "Branch Manager";
    case APP_ROLES.CONSULTANT:
      return "Consultant";
    default:
      return role ?? "User";
  }
};
