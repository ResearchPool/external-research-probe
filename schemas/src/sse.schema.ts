import { z } from "zod";

export const ResearchDataSchema = z.object({
    id: z.number(),
    ReportUID: z.string(),
    producer_id: z.number(),
    producer_name: z.string(),
    date_of_report: z.date(),
    created_at: z.date(),
    title: z.string()
});

export const NewResearchEventDataSchema = z.object({
    id: z.number(),
    date: z.iso.datetime(),
    indexedDate: z.iso.datetime(),
    ReportUID: z.string(),
    providerId: z.number(),
    providerName: z.string().optional(),
    title: z.string(),
    description: z.string().optional()
});

export type NewResearchEventData = z.infer<typeof NewResearchEventDataSchema>;
export type ResearchData = z.infer<typeof ResearchDataSchema>;

