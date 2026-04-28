import type {ReplicationStatus} from "@app/schemas";
import { XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import * as React from 'react';

export default function ReplicationChannelStatus({ replication }: { replication: ReplicationStatus }) {

    const statusIcon: Record<string, React.ReactNode> = {
        "Running": <CheckCircleIcon className="h-5 w-5 text-green-600" />,
        "Stopped": <XCircleIcon className="h-5 w-5 text-red-600" />,
    };

    return <div className="first:ms-0 last:me-0 md:w-60 md:m-2 last:pb-0 p-3 bg-neutral-100 md:rounded-xl shadow-md flex md:flex-col">
        <div className="flex-1 md:flex-0"><h3 className="uppercase font-bold mb-3">{replication.channel}</h3></div>
        {
            (Object.keys(replication.components) as Array<keyof ReplicationStatus['components']>).map((componentKey, index) => (<div className="pe-1 last:pe-0"><div key={index} className="inline-flex">
                <div className="me-1">{statusIcon[(replication as ReplicationStatus).components[componentKey].status]}</div>
                <div className="text-sm uppercase inline-flex">
                    <div className="pe-3">{componentKey}</div>
                    {null !== replication.components[componentKey].error && (
                        <div title={replication.components[componentKey].error.errorMessage}>(<span className="hidden md:inline-block">Error&nbsp;</span>{replication.components[componentKey].error.errorNumber})</div>
                    )}
                </div>
            </div></div>))
        }
    </div>;
}