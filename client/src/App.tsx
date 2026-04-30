import { useEffect, useRef, useState } from 'react';
import {
  ReplicationStatusSetSchema,
  type ReplicationStatusSet,
  TableOperationSchema,
} from '@app/schemas';
import EsConnectionStatusDisplay from './components/EsConnectionStatusDisplay.tsx';
import TableOperations from './components/TableOperations.tsx';
import ReplicationGraphWrapper from './components/ReplicationGraphWrapper.tsx';

const ACTIVITY_CHECK_INTERVAL: number = 5 * 1000;
const ACTIVITY_TIMEOUT: number = 30 * 1000;
const CONNECTION_STOP_INTERVAL: number = 5 * 1000;

function increment(
  prev: Map<string, Map<string, number>> | null,
  table: string,
  operation: string,
) {
  const next = new Map<string, Map<string, number>>(prev ?? []);

  const tableStats = new Map(next.get(table) ?? []);
  tableStats.set(operation, (tableStats.get(operation) ?? 0) + 1);

  next.set(table, tableStats);
  return next;
}

export default function App() {
  const [tableOperations, setTableOperations] = useState<Map<string, Map<string, number>> | null>(
    null,
  );
  const [replicationStatus, setReplicationStatus] = useState<ReplicationStatusSet>([]);
  const [esReadyState, setEsReadyState] = useState<number | null>(EventSource.CONNECTING);
  const [connectionGeneration, setConnectionGeneration] = useState<number>(0);
  const esRef = useRef<EventSource | null>(null);
  const esLastActivityRef = useRef<number | null>(null);

  useEffect(() => {
    if (esRef.current) {
      return;
    }
    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      esRef.current = new EventSource('/events');
      esLastActivityRef.current = Date.now();

      esRef.current.onopen = () => {
        setEsReadyState(esRef.current?.readyState ?? EventSource.OPEN);
      };

      esRef.current.onerror = () => {
        console.error('Error when trying to establish a connection to stream');
        setEsReadyState(esRef.current?.readyState ?? EventSource.CLOSED);
        clearInterval(check);
        const closeOnError = setInterval(() => {
          clearInterval(closeOnError);
          close();
        }, CONNECTION_STOP_INTERVAL);
      };

      esRef.current.addEventListener('table_operation', (e) => {
        const dataRaw = JSON.parse(e.data);
        const dataParse = TableOperationSchema.safeParse(dataRaw);
        if (!dataParse.success) {
          console.warn('Event data invalid');
          return;
        }
        esLastActivityRef.current = Date.now();
        const data = dataParse.data;
        setTableOperations((prev) => increment(prev, data.tableName, data.operationType));
      });

      esRef.current.addEventListener('replication_status', (e) => {
        try {
          const dataRaw = JSON.parse(e.data);
          const dataParse = ReplicationStatusSetSchema.safeParse(dataRaw);
          if (!dataParse.success) {
            console.warn('Replication status message is invalid', dataRaw, dataParse.error);
            return;
          }
          esLastActivityRef.current = Date.now();
          setReplicationStatus(() => dataParse.data);
        } catch (error) {
          console.error('Error when trying to analyze replication status', error);
        }
      });
    };

    const close = () => {
      esRef.current?.close();
      setEsReadyState(esRef.current?.readyState ?? null);
      esRef.current = null;
      esLastActivityRef.current = Date.now();
      setConnectionGeneration((c) => c + 1);
      clearInterval(check);
    };

    const check = setInterval(() => {
      if (null === esLastActivityRef.current) {
        esLastActivityRef.current = Date.now();
        return;
      }
      if (Date.now() - esLastActivityRef.current > ACTIVITY_TIMEOUT) {
        console.warn('No activity on ES');
        close();
      }
    }, ACTIVITY_CHECK_INTERVAL);

    connect();

    return () => {
      if (!esRef.current) {
        return;
      }
      esRef.current.close();
      esRef.current = null;
      clearInterval(check);
    };
  }, [connectionGeneration]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col w-full">
        <div>
          <h1 className="text-2xl/7 font-bold sm:truncate sm:text-3xl text-center my-8">
            RMS Database stats
          </h1>
        </div>
        <div className="pb-5">
          <h2 className="text-xl/7">Replication channels</h2>
          <ReplicationGraphWrapper replicationStatus={replicationStatus} />
        </div>
        <div className="flex gap-4 place-content-center items-end">
          <div className="bg-slate-200 rounded-t-lg pt-1 px-3 inline-flex md:gap-4 flex-col md:flex-row">
            <p>Table stats</p>
          </div>
          <div className="flex-grow"></div>
          <EsConnectionStatusDisplay esState={esReadyState} />
        </div>
        <div>
          <TableOperations stats={tableOperations} />
        </div>
      </div>
    </div>
  );
}
