export const intelligenceQueryKeys = {
  pipeline: ["intelligence", "pipeline", "me"] as const,
  clientPipeline: (clientId: number) => ["intelligence", "pipeline", "client", clientId] as const,
};
