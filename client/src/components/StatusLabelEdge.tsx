import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import { XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import * as React from "react";

interface DataProps {
    [key: string]: {status: string, error: { errorNumber: number, errorMessage: string}}
}

export const ComponentStatus = {
    Running: "Running",
    Stopped: "Stopped"
} as const;

export type ComponentStatus =
    typeof ComponentStatus[keyof typeof ComponentStatus];

const statusIcons: Record<string, React.ReactNode> = {
    "Running": <CheckCircleIcon className="h-4 w-4 text-green-700" />,
    "Stopped": <XCircleIcon className="h-4 w-4 text-red-700" />
}

export default function StatusLabelEdge({id , sourceX, sourceY, targetX, targetY, data }: {id:string , sourceX:number, sourceY:number, targetX:number, targetY:number, data:DataProps }) {
    const [ edgePath, labelX, labelY ] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY
    });
    console.log(data);

    return (
        <>
            <BaseEdge id={id} path={edgePath} />
            <EdgeLabelRenderer>
                <div
                    className="rounded bg-gray-200 shadow px-1 nodrag nopan flex"
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                >
                    {(Object.keys(data)).map(c => <div key={c} className="flex flex-col p-1">
                        <div className="text-[7px] text-gray-500 uppercase text-center">{c}</div>
                        {statusIcons[data[c].status]}
                        {null !== data[c].error && <div title={data[c].error?.errorMessage} className="text-[7px] text-red-700 border-dotted border-b-1 cursor-pointer">{data[c].error?.errorNumber}</div>}
                    </div>)}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}