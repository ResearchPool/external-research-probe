import "dotenv/config";
import { ServerEnvSchema } from "@app/schemas";

export const env = ServerEnvSchema.parse(process.env);