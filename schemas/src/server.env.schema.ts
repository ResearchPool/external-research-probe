import { z } from "zod";

// Configuration

export const ServerEnvSchema = z.object({
    HTTP_PORT: z.coerce.number().default(3000),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string()
});

export type envType = z.infer<typeof ServerEnvSchema>;