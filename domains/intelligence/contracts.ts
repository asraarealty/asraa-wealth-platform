import { z } from "zod";

const EmptyResearchSections = {
  financials: [],
  ownership: [],
  filings: [],
  news: [],
  aiResearch: [],
};

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

export const ResearchSectionsSchema = z.object({
  financials: z.array(z.string()),
  ownership: z.array(z.string()),
  filings: z.array(z.string()),
  news: z.array(z.string()),
  aiResearch: z.array(z.string()),
});

export const SymbolResearchSchema = z.object({
  symbol: z.string(),
  sections: ResearchSectionsSchema,
});

export const IntelligenceResearchSchema = z.object({
  default: ResearchSectionsSchema,
  bySymbol: z.array(SymbolResearchSchema),
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
  research: IntelligenceResearchSchema.default({
    default: EmptyResearchSections,
    bySymbol: [],
  }),
});

export type IntelligencePipelineDto = z.infer<typeof IntelligencePipelineSchema>;

export function parseIntelligencePipelineDto(payload: unknown): IntelligencePipelineDto {
  return IntelligencePipelineSchema.parse(payload);
}
