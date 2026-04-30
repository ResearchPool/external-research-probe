import { z } from "zod";

export enum TableOperationEnum {
    INSERT = "insert",
    UPDATE = "update",
    DELETE = "delete"
}

export enum EventEnum {
    REPLICATION_STATUS = "replication_status",
    TABLE_OPERATION = "table_operation"
}

export enum ReplicationComponentRunningStatusEnum {
    RUNNING = "Running",
    STOPPED = "Stopped",
    UNKNOWN = "Unknown"
}

export const ReplicationErrorSchema = z.object({
    errorNumber: z.number(),
    errorMessage: z.string()
});

export const TableOperationSchema = z.object({
    tableName: z.string(),
    operationType: z.enum(TableOperationEnum)
});

export const ReplicationComponentStatusSchema = z.object({
    status: z.enum(ReplicationComponentRunningStatusEnum),
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

export const SseEventSchema = z.xor([
    // replication_status
    z.object({
        event: z.literal(EventEnum.REPLICATION_STATUS),
        data: ReplicationStatusSetSchema
    }),
    // table_operation
    z.object({
        event: z.literal(EventEnum.TABLE_OPERATION),
        data: TableOperationSchema
    })
]);

export type SseEvent = z.infer<typeof SseEventSchema>;
export type NewResearchEventData = z.infer<typeof NewResearchEventDataSchema>;
export type ResearchData = z.infer<typeof ResearchDataSchema>;
export type ReplicationStatus = z.infer<typeof ReplicationStatusSchema>;
export type ReplicationStatusSet = z.infer<typeof ReplicationStatusSetSchema>;
export type TableOperation = z.infer<typeof TableOperationSchema>;