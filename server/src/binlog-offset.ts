import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

export const BinlogOffsetSchema = z.object({
    filename: z.string().default("mariadb-bin.000001"),
    position: z.number().gte(4)
});

export type BinlogOffset = z.infer<typeof BinlogOffsetSchema>;

const OFFSET_FILE = "./binlog-offset.json";

export async function loadOffset(): Promise<BinlogOffset> {
    try {
        const rawContents = await readFile(OFFSET_FILE, "utf-8");
        const rawJson = JSON.parse(rawContents);
        return BinlogOffsetSchema.parse(rawJson);
    } catch {
        return {
            filename: "mariadb-bin.000001",
            position: 4
        };
    }
}

export async function saveOffset(offset: BinlogOffset): Promise<void> {
    await writeFile(
        OFFSET_FILE,
        JSON.stringify(offset, null, 2),
    );
}