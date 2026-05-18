export const clientDomainQueryKeys = {
  profile: (clientId: number) => ["client", "profile", clientId] as const,
  portfolio: (clientId: number) => ["client", "portfolio", clientId] as const,
};

export * from "./readiness";
