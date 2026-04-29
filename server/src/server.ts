import { z } from "zod";
import express from "express";
import { type Response } from "express";
import { createRequire } from 'node:module';
import { ResearchDataSchema, ReplicationStatus } from "@app/schemas";
import {BinlogOffset, loadOffset, saveOffset} from "./binlog-offset.js";
import { env } from "./lib/env.js";
import { dbPool } from "./lib/db.js";

const require = createRequire(import.meta.url);
const zongji = require("zongji");

const MAX_CLIENTS = 3;
const MAX_BUFFERED_BYTES = 128 * 1024;
const serverId = 900000 + process.pid % 10000 + (Math.random() * 15 +1);
const REPLICATION_STATUS_FETCH_INTERVAL = 30000;

let offset: BinlogOffset | null = null;

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
let replicationStatusRunning : boolean = false;
let currentTable: string = "";

interface RowReplication {
    Connection_name: string;
    Slave_IO_Running: string;
    Last_IO_Errno: number;
    Last_IO_Error: string;
    Slave_SQL_Running: string;
    Last_SQL_Errno: number;
    Last_SQL_Error: string;
}

const fetchReplicationStatus = async (): Promise<ReplicationStatus[] | void> => {
    if(replicationStatusRunning) {
        return;
    }
    replicationStatusRunning = true;
    try {
        const [rows] = await dbPool.query("SHOW ALL SLAVES STATUS");


        const response = (rows as any).map((row: RowReplication) => ({
            channel: row.Connection_name,
            components: {
                io: {
                    status: "Yes" === row.Slave_IO_Running ? "Running" : "Stopped",
                    error: 0 !== row.Last_IO_Errno ? {
                        errorNumber: row.Last_IO_Errno,
                        errorMessage: row.Last_IO_Error
                    } : null
                },
                sql: {
                    status: "Yes" === row.Slave_SQL_Running ? "Running" : "Stopped",
                    error: 0 !== row.Last_SQL_Errno ? {
                        errorNumber: row.Last_SQL_Errno,
                        errorMessage: row.Last_SQL_Error
                    } : null
                }
            }
        }));
        replicationStatusRunning = false;
        return response;
    } catch (error) {
        console.error(error);
    } finally {
        replicationStatusRunning = false;
    }
};

const broadcast = ({event, data}: { event: string, data: void | object}) => {
    messageSequence++;
    const message = `id: ${messageSequence}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
    null !== offset && (offset.position = (evt as any).nextPosition);

    if (offset && (evt as any).getEventName?.() === "rotate") {
        offset.filename = (evt as any).binlogName;
    }
    if((evt as any).getTypeName?.() === "TableMap") {
        currentTable = (evt as any).tableName;
        return;
    }
    const eventType = ((evt as any).getTypeName?.() === "UpdateRows") ? "update" : (evt as any).getTypeName?.() === "WriteRows" ? "insert" : "delete";
    if(clients.size <= 0) {
        return;
    }
    broadcast({
        event: "table_operation",
        data: {
            tableName: currentTable,
            operationType: eventType
        }
    });
});

setInterval(async () => { offset && await saveOffset(offset) }, 60000)

process.on('SIGINT', async () => {
    binlogListener.stop();
    offset && await saveOffset(offset);
    process.exit();
});

app.listen(HTTP_PORT,  async () => {
    offset = await loadOffset();
    console.log('Starting in offset', offset);
    binlogListener.start({
        ...(offset ?? {}),
        includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows', 'rotate'],
        serverId: serverId
    });
    offset ??= {
        filename: "",
        position: 4
    };
    setInterval(async () => {
        const replicationStatus = await fetchReplicationStatus();
        broadcast({
            event: "replication_status",
            data: replicationStatus
        });
    }, REPLICATION_STATUS_FETCH_INTERVAL);
    console.log("CDC SSE server running on port: " + HTTP_PORT);
});