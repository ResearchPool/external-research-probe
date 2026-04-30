import type { NewResearchEventData } from '@app/schemas';
import { formatRelative } from 'date-fns';

type ResearchTileProps = {
  event: NewResearchEventData;
};

export default function ResearchTile({ event }: ResearchTileProps) {
  return (
    <div className="flex flex-col md:flex-row p-4 gap-2 text-gray-600 border-b-1 border-slate-200 last:border-b-0">
      <div className="flex-1 flex-col">
        <div className="font-bold">{event.title}</div>
        <div>{event.ReportUID}</div>
      </div>
      <div className="w-70 flex flex-col flex-none">
        <div>
          Indexed <strong>{formatRelative(event.indexedDate, new Date())}</strong>
        </div>
        <div className="collapse md:visible">
          Reported as of <strong>{formatRelative(event.date, new Date())}</strong>
        </div>
      </div>
    </div>
  );
}
