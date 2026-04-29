import {useState, useEffect} from "react";
import { ReactFlow, type Node, type Edge } from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import type { ReplicationStatusSet } from "@app/schemas";
import StatusLabelEdge from "./StatusLabelEdge.tsx";

const X_DISTANCE = 200;
const Y_DISTANCE = 100;
const REPLICA_NAME = "rep_ovh_prod";

const edgeTypes = {
    'status-edge': StatusLabelEdge
};

export default function ReplicationGraph({ replicationStatus }: { replicationStatus: ReplicationStatusSet }) {

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    useEffect(() => {
        setNodes(() => [...replicationStatus, {channel: REPLICA_NAME, io: {status: "Running", error: null}, sql: {status: "Running", error: null}}].map((channel, index) => ({
            id: channel.channel,
            position: {x: REPLICA_NAME === channel.channel ? (X_DISTANCE * (replicationStatus.length - 1)) / 2 : index * X_DISTANCE, y: REPLICA_NAME === channel.channel ?  Y_DISTANCE : 0},
            data: { label: channel.channel.toUpperCase() }
        })));
        setEdges(() => replicationStatus.map(channel => ({
            id: `${channel.channel}-${REPLICA_NAME}`,
            source: channel.channel,
            target: REPLICA_NAME,
            type: "status-edge",
            data: {
                io: channel.components.io,
                sql: channel.components.sql
            }
        })));
    }, [replicationStatus]);

    return <div className="h-150 w-full">
        <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView />
    </div>;
}