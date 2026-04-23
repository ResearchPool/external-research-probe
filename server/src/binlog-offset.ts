import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

export const BinlogOffsetSchema = z.object({
    filename: z.string(),
    position: z.number().gte(4)
});

export type BinlogOffset = z.infer<typeof BinlogOffsetSchema>;

const OFFSET_FILE = "./server-data/binlog-offset.json";

export async function loadOffset(): Promise<BinlogOffset | null> {
    try {
        const rawContents = await readFile(OFFSET_FILE, "utf-8");
        const rawJson = JSON.parse(rawContents);
        return BinlogOffsetSchema.parse(rawJson);
    } catch {
        return null;
    }
}

export async function saveOffset(offset: BinlogOffset): Promise<void> {
    offset.filename !== "" && await writeFile(
        OFFSET_FILE,
        JSON.stringify(offset, null, 2),
    );
}