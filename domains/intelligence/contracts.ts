import { z } from "zod";

export const IntelligenceInsightSchema = z.object({
  title: z.string(),
  message: z.string(),
  confidence: z.number().optional(),
});

export const AllocationRecommendationSchema = z.object({
  label: z.string(),
  value: z.number(),
  rationale: z.string().optional(),
});

export const IntelligencePipelineSchema = z.object({
  aiInsights: z.array(IntelligenceInsightSchema),
  trendAnalysis: z.array(z.string()),
  riskAlerts: z.array(z.string()),
  opportunities: z.array(z.string()),
  macroSummary: z.string(),
  portfolioIntelligence: z.array(z.string()),
  allocationRecommendations: z.array(AllocationRecommendationSchema),
  marketSentiment: z.string(),
  degradedState: z.string().nullable(),
});

export type IntelligencePipelineDto = z.infer<typeof IntelligencePipelineSchema>;

export function parseIntelligencePipelineDto(payload: unknown): IntelligencePipelineDto {
  return IntelligencePipelineSchema.parse(payload);
}
