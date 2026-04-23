// Monkey patching iconv encoding to accept utf8mb3
import encodings from "iconv-lite/encodings/index.js";
(encodings as any).utf8mb3 = (encodings as any).utf8;

import { z } from "zod";
import "dotenv/config";
import express from "express";
import { type Response } from "express";
import { createRequire } from 'node:module';
import {ResearchDataSchema} from "@app/schemas";
import {BinlogOffset, loadOffset, saveOffset} from "./binlog-offset.js";

const require = createRequire(import.meta.url);
const zongji = require("zongji");

// Configuration

const EnvSchema = z.object({
    HTTP_PORT: z.coerce.number().default(3000),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string()
});

const MAX_CLIENTS = 3;
const MAX_BUFFERED_BYTES = 128 * 1024;

const env = EnvSchema.parse(process.env);
let offset: BinlogOffset = {
    filename: "mariadb-bin.000001",
    position: 4
};

const {
    HTTP_PORT = 3000,
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_DATABASE
} = env;

const app = express();
const clients = new Set<Response>();
let messageSequence = 0;

const broadcast = ({seq, event, data}: { seq: number, event: string, data: object}) => {
    const message = `id: ${seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
        if(client.writableLength > MAX_BUFFERED_BYTES) {
            client.end(': Too slow... bye-bye!');
            clients.delete(client);
            continue;
        }
        const healthy = client.write(message);
        if(!healthy) {
            client.end(": Not healthy... bye-bye!");
            clients.delete(client);
        }
    }
};

app.get("/events", (req, res) => {
    if(clients.size >= MAX_CLIENTS) {
        res.status(503).end('Too many connections');
        return;
    }
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();
    clients.add(res);
    res.write(": ok\n\n");

    const heartbeat = setInterval(() => {
        res.write(": ping\n\n");
    }, 15000);

    const cleanup = () => {
        clearInterval(heartbeat);
        clients.delete(res);
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
});

const binlogListener = new zongji({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
});

binlogListener.on("binlog", (evt: unknown) => {
    offset.position = (evt as any).nextPosition;

    if ((evt as any).getEventName?.() === "rotate") {
        offset.filename = (evt as any).binlogName;
    }

    if((evt as any).getTypeName?.() !== "WriteRows") {
        return;
    }
    messageSequence++;
    if(clients.size <= 0) {
        return;
    }
    const evtParseResult = ResearchDataSchema.safeParse((evt as any).rows[0]);
    if(!evtParseResult.success) {
        console.warn("Received unexpected response from binlog", z.flattenError(evtParseResult.error));
        return;
    }
    const { id, ReportUID, producer_id, producer_name, date_of_report, created_at, title } = evtParseResult.data;
    broadcast({
        seq: messageSequence,
        event: "new",
        data: {
            id: id,
            date: date_of_report,
            indexedDate: created_at,
            ReportUID: ReportUID,
            providerId: producer_id,
            providerName: producer_name,
            title: title
        }
    });
});

setInterval(async () => { await saveOffset(offset) }, 60000)

process.on('SIGINT', async () => {
    binlogListener.stop();
    await saveOffset(offset);
    process.exit();
});

app.listen(HTTP_PORT,  async () => {
    offset = await loadOffset();
    console.log('Starting in offset', offset);
    binlogListener.start({
        ...offset,
        includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows', 'rotate'],
        includeSchema: {
            [DB_DATABASE]: ['nullobject_reports_reports']
        }
    });
    console.log("CDC SSE server running on port: " + HTTP_PORT);
});