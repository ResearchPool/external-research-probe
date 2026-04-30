import express, { type Response } from 'express';
import {
  EventEnum,
  ReplicationComponentRunningStatusEnum,
  ReplicationStatus,
  type SseEvent,
  TableOperationEnum,
} from '@app/schemas';
import { env } from './lib/env.js';
import { dbPool } from './lib/db.js';
import ZongJi from 'zongji';

const MAX_CLIENTS = 20;
const MAX_BUFFERED_BYTES = 128 * 1024;
const serverId = 900000 + (process.pid % 10000) + (Math.random() * 15 + 1);
const REPLICATION_STATUS_FETCH_INTERVAL = 30000;

const { HTTP_PORT = 3000, DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = env;

const app = express();
const clients = new Set<Response>();
let messageSequence = 0;
let replicationStatusRunning: boolean = false;
let currentTable: string = '';

interface RowReplication {
  Connection_name: string;
  Slave_IO_Running: string;
  Last_IO_Errno: number;
  Last_IO_Error: string;
  Slave_SQL_Running: string;
  Last_SQL_Errno: number;
  Last_SQL_Error: string;
}

const fetchReplicationStatus = async (): Promise<ReplicationStatus[]> => {
  if (replicationStatusRunning) {
    return [];
  }
  replicationStatusRunning = true;
  try {
    const [rows] = await dbPool.query('SHOW ALL SLAVES STATUS');

    const response = (rows as Array<RowReplication>).map(
      (row: RowReplication): ReplicationStatus => ({
        channel: row.Connection_name,
        components: {
          io: {
            status:
              'Yes' === row.Slave_IO_Running
                ? ReplicationComponentRunningStatusEnum.RUNNING
                : ReplicationComponentRunningStatusEnum.STOPPED,
            error:
              0 !== row.Last_IO_Errno
                ? {
                    errorNumber: row.Last_IO_Errno,
                    errorMessage: row.Last_IO_Error,
                  }
                : null,
          },
          sql: {
            status:
              'Yes' === row.Slave_SQL_Running
                ? ReplicationComponentRunningStatusEnum.RUNNING
                : ReplicationComponentRunningStatusEnum.STOPPED,
            error:
              0 !== row.Last_SQL_Errno
                ? {
                    errorNumber: row.Last_SQL_Errno,
                    errorMessage: row.Last_SQL_Error,
                  }
                : null,
          },
        },
      }),
    );
    replicationStatusRunning = false;
    return response;
  } catch (error) {
    console.error(error);
  } finally {
    replicationStatusRunning = false;
  }
  return [];
};

const broadcast = ({ event, data }: SseEvent) => {
  messageSequence++;
  const message = `id: ${messageSequence}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.writableLength > MAX_BUFFERED_BYTES) {
      client.end(': Too slow... bye-bye!');
      clients.delete(client);
      continue;
    }
    const healthy = client.write(message);
    if (!healthy) {
      client.end(': Not healthy... bye-bye!');
      clients.delete(client);
    }
  }
};

app.get('/events', (req, res) => {
  if (clients.size >= MAX_CLIENTS) {
    res.status(503).end('Too many connections');
    return;
  }
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  clients.add(res);
  res.write(': ok\n\n');

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(res);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
});

const binlogListener = new ZongJi({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
});

binlogListener.on('binlog', (evt) => {
  if (clients.size <= 0) {
    return;
  }
  if (evt.getTypeName?.() === 'TableMap') {
    currentTable = evt?.tableName || '';
    return;
  }
  if ('' === currentTable.trim()) {
    console.warn('Table not specified');
    return;
  }
  const eventType =
    evt.getTypeName?.() === 'UpdateRows'
      ? TableOperationEnum.UPDATE
      : evt.getTypeName?.() === 'WriteRows'
        ? TableOperationEnum.INSERT
        : TableOperationEnum.DELETE;
  broadcast({
    event: EventEnum.TABLE_OPERATION,
    data: {
      tableName: currentTable,
      operationType: eventType,
    },
  });
});

process.on('SIGINT', async () => {
  binlogListener.stop();
  process.exit();
});

app.listen(HTTP_PORT, async () => {
  binlogListener.start({
    includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows', 'rotate'],
    includeSchema: { [DB_DATABASE]: true },
    serverId: serverId,
    startAtEnd: true,
  });
  setInterval(async () => {
    const replicationStatus = await fetchReplicationStatus();
    broadcast({
      event: EventEnum.REPLICATION_STATUS,
      data: replicationStatus,
    });
  }, REPLICATION_STATUS_FETCH_INTERVAL);
  console.log('CDC SSE server running on port: ' + HTTP_PORT);
});
