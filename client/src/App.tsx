import { useEffect, useRef, useState } from "react";
import {
    NewResearchEventDataSchema, ReplicationStatusSetSchema, type NewResearchEventData, type ReplicationStatusSet,
    type ReplicationStatus
} from "@app/schemas";
import ResearchTile from "./components/ResearchTile.tsx";
import EsConnectionStatusDisplay from "./components/EsConnectionStatusDisplay.tsx";
import ReplicationChannelStatus from "./components/ReplicationChannelStatus.tsx";

const ACTIVITY_CHECK_INTERVAL: number = 5 * 1000;
const ACTIVITY_TIMEOUT: number = 30 * 1000;
const CONNECTION_STOP_INTERVAL: number = 5 * 1000;
const RESEARCH_SHOW_COUNT: number = 5;
const dateFormat = Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const numberFormat = Intl.NumberFormat("en-US");

export default function App() {
    const [events, setEvents] = useState<NewResearchEventData[]>([]);
    const [replicationStatus, setReplicationStatus] = useState<ReplicationStatusSet>([]);
    const [esReadyState, setEsReadyState] = useState<number | null>(EventSource.CONNECTING);
    const [connectionGeneration, setConnectionGeneration] = useState<number>(0);
    const esRef = useRef<EventSource | null>(null);
    const esLastActivityRef = useRef<number>(Date.now());
    const firstRunRef = useRef<Date>(new Date());
    const [researchCount, setResearchCount] = useState<number>(0);

    useEffect(() => {
        if(esRef.current) {
            return;
        }
        const connect = () => {
            if(esRef.current) {
                console.log("Cleaning previous ES connection");
                esRef.current.close();
                esRef.current = null;
            }
            console.log("Connecting to ES");
            esRef.current = new EventSource("/events");
            esLastActivityRef.current = Date.now();

            esRef.current.onopen = () => {
                console.log("ES connection opened");
                setEsReadyState(esRef.current?.readyState ?? EventSource.OPEN);
            };

            esRef.current.onerror = () => {
                console.error("Error when trying to establish a connection to stream");
                setEsReadyState(esRef.current?.readyState ?? EventSource.CLOSED);
                clearInterval(check);
                const closeOnError = setInterval(() => {
                    console.log("Closing the connection due to an error");
                    clearInterval(closeOnError);
                    close();
                }, CONNECTION_STOP_INTERVAL);
            };

            esRef.current.addEventListener("replication_status", e => {
                console.log("Incoming replication status update");
                try {
                    const dataRaw = JSON.parse(e.data);
                    const dataParse = ReplicationStatusSetSchema.safeParse(dataRaw);
                    if(!dataParse.success) {
                        console.warn("Replication status message is invalid", dataRaw, dataParse.error);
                        return;
                    }
                    setReplicationStatus(() => dataParse.data);
                } catch (error) {
                    console.error("Error when trying to analyze replication status", error);
                }
            });

            esRef.current.addEventListener("new", e => {
                console.log("Incoming message");
                try {
                    esLastActivityRef.current = Date.now();
                    const dataRaw = JSON.parse(e.data);
                    const dataParse = NewResearchEventDataSchema.safeParse(dataRaw);
                    if(!dataParse.success) {
                        console.warn("Event is invalid", dataParse.error);
                        return;
                    }
                    setResearchCount(c => c + 1);
                    setEvents(prev => [dataParse.data, ...prev.slice(0,RESEARCH_SHOW_COUNT - 1)]);
                } catch (err) {
                    console.error("Error trying to consume an event", err);
                }
            });
        };

        const close = () => {
            console.log("Closing ES connection");
            esRef.current?.close();
            setEsReadyState(esRef.current?.readyState ?? null);
            esRef.current = null;
            esLastActivityRef.current = Date.now();
            setConnectionGeneration(c => c + 1);
            clearInterval(check);
        };

        const check = setInterval(() => {
            console.log("Checking activity");
            if (Date.now() - esLastActivityRef.current > ACTIVITY_TIMEOUT) {
                console.warn("No activity on ES");
                close();
            }
        }, ACTIVITY_CHECK_INTERVAL);

        connect();

        return () => {
            if(!esRef.current) { return; }
            esRef.current.close();
            esRef.current = null;
            clearInterval(check);
        };
    }, [connectionGeneration]);

    return (
        <div className="container mx-auto p-4">
        <div className="flex flex-col w-full">
            <div><h1 className="text-2xl/7 font-bold sm:truncate sm:text-3xl text-center my-8">External research probe</h1></div>
            <div className="pb-5">
                <h2 className="text-xl/7">Replication channels</h2>
                <div className="flex flex-col md:flex-row">
                    {
                        replicationStatus.map((rep: ReplicationStatus) => (
                            <ReplicationChannelStatus key={rep.channel} replication={rep} />
                        ))
                    }
                </div>
            </div>
            <div className="flex gap-4 place-content-center items-end">
                <div className="bg-slate-200 rounded-t-lg pt-1 px-3 inline-flex md:gap-4 flex-col md:flex-row">
                    <p><strong>{numberFormat.format(researchCount)}</strong> research seen since {dateFormat.format(firstRunRef.current)}</p>
                    <p>Showing last <strong>{RESEARCH_SHOW_COUNT}</strong> indexed research</p>
                </div>
                <div className="flex-grow"></div>
                <EsConnectionStatusDisplay esState={esReadyState} />
            </div>
            <div className="rounded-b-lg shadow-xl border-slate-100 border bg-gradient-to-b from-slate-50 to-slate-100">
                {
                    events.map((event: NewResearchEventData, index: number) => (
                        <ResearchTile key={index} event={event} />
                    ))
                }
            </div>
        </div>
        </div>
    );
}