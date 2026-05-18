export const adminQueryKeys = {
  clientsWorkspace: ["admin", "clients", "workspace"] as const,
  clientDetail: (clientId: number | null) => ["client-detail", clientId] as const,
  clientEditDetail: (clientId: number) => ["admin", "clients", clientId, "detail"] as const,
  clientAssetPricing: (clientId: number | null) =>
    ["admin", "clients", clientId, "asset-pricing"] as const,
};
