import { ArrowsUpDownIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import {cn} from "../lib/tailwind-helper.ts";
import * as React from "react";

interface EsConnectionStatusDisplayProps {
    esState: number | null
}

export default function EsConnectionStatusDisplay({ esState }: EsConnectionStatusDisplayProps) {

    type displayConfig = {
        contents: React.ReactNode,
        parentClasses: string[]
    };

    const connectionStatusDisplay: Record<number, displayConfig> = {
        0: { contents: <ArrowPathIcon className="h-4 w-4 animate-spin" />, parentClasses: ['bg-orange-500', 'text-white'] },
        1: { contents: <ArrowsUpDownIcon className="h-4 w-4 animate-pulse" />, parentClasses: ['bg-green-600', 'text-white'] },
        2: { contents: <XMarkIcon className="h-4 w-4 animate-pulse" />, parentClasses: ['bg-orange-700', 'text-white'] },
    };
    return (
        null !== esState && <div className={cn("rounded-t-md bg-gray-200 p-2", connectionStatusDisplay[esState].parentClasses)}>{connectionStatusDisplay[esState].contents}</div>
    );
}