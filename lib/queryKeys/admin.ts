export const adminQueryKeys = {
  clientsWorkspace: ["admin", "clients", "workspace"] as const,
  clientDetail: (clientId: number) => ["client-detail", clientId] as const,
  clientEditDetail: (clientId: number) => ["admin", "clients", clientId, "detail"] as const,
  clientAssetPricing: (clientId: number, holdingsSignature?: string) => {
    const base = ["admin", "clients", clientId, "asset-pricing"] as const;
    return holdingsSignature ? [...base, holdingsSignature] as const : base;
  },
};
