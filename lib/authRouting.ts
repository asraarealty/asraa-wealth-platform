export type AuthLandingTarget = {
  path: string;
  toastMessage: string;
  toastType: "success" | "error" | "info";
};

type AuthIdentity = {
  role?: string | null;
  approval_status?: string | null;
};

export function resolveAuthLandingTarget(user: AuthIdentity): AuthLandingTarget {
  const status = String(user.approval_status ?? "").trim().toLowerCase();

  if (status === "suspended") {
    return {
      path: "/suspended",
      toastMessage: "Your account is suspended.",
      toastType: "error",
    };
  }

  if (status === "pending") {
    return {
      path: "/pending-approval",
      toastMessage: "Your account is pending approval.",
      toastType: "info",
    };
  }

  if (status === "rejected") {
    return {
      path: "/rejected",
      toastMessage: "Your account approval was rejected.",
      toastType: "error",
    };
  }

  return {
    path: String(user.role ?? "").trim().toLowerCase() === "admin" ? "/admin" : "/dashboard",
    toastMessage: "Welcome back.",
    toastType: "success",
  };
}
