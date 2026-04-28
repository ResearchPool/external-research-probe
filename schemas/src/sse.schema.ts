import { z } from "zod";

export const ReplicationComponentRunningStatusEnum = z.enum(["Running", "Stopped"]);
export const ReplicationErrorSchema = z.object({
    errorNumber: z.number(),
    errorMessage: z.string()
});

export const ReplicationComponentStatusSchema = z.object({
    status: ReplicationComponentRunningStatusEnum,
    error: z.union([z.null(), ReplicationErrorSchema])
});

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

export const ReplicationStatusSchema = z.object({
    channel: z.string(),
    components: z.object({
        io: ReplicationComponentStatusSchema,
        sql: ReplicationComponentStatusSchema
    })
});

export const ReplicationStatusSetSchema = z.array(ReplicationStatusSchema);

export type ReplicationComponentRunningStatusEnum = z.infer<typeof ReplicationComponentRunningStatusEnum>;
export type NewResearchEventData = z.infer<typeof NewResearchEventDataSchema>;
export type ResearchData = z.infer<typeof ResearchDataSchema>;
export type ReplicationStatus = z.infer<typeof ReplicationStatusSchema>;
export type ReplicationStatusSet = z.infer<typeof ReplicationStatusSetSchema>;