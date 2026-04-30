import ReplicationGraph, { type ReplicationGraphProps } from './ReplicationGraph.tsx';
import { ReactFlowProvider } from '@xyflow/react';

export default function ReplicationGraphWrapper(props: ReplicationGraphProps) {
  return (
    <ReactFlowProvider>
      <ReplicationGraph {...props} />
    </ReactFlowProvider>
  );
}
