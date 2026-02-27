import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { rpcCall } from '../ipc-client.js';
import type { AgentLog } from '../../shared/types.js';

interface LogViewerProps {
  agentId: string | null;
}

const LEVEL_COLOR: Record<string, string> = {
  info: 'blue',
  warn: 'yellow',
  error: 'red',
  debug: 'gray',
};

export function LogViewer({ agentId }: LogViewerProps): React.ReactElement {
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    if (!agentId) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        const result = await rpcCall('agent.logs', { id: agentId, limit: 10 }) as AgentLog[];
        setLogs(result.reverse());
      } catch {
        // ignore fetch errors
      }
    };

    fetchLogs();
    const timer = setInterval(fetchLogs, 2000);
    return () => clearInterval(timer);
  }, [agentId]);

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1} minHeight={8}>
      <Text bold dimColor>
        {agentId ? `Logs: ${agentId}` : 'Select an agent to view logs'}
      </Text>
      {logs.length === 0 ? (
        <Text dimColor>No logs yet</Text>
      ) : (
        logs.map((entry, i) => {
          const time = entry.created_at.split('T')[1]?.slice(0, 8) || '';
          const color = LEVEL_COLOR[entry.level] || 'white';
          return (
            <Text key={i}>
              <Text dimColor>{time}</Text>{' '}
              <Text color={color}>{entry.level.toUpperCase().padEnd(5)}</Text>{' '}
              <Text>{entry.message}</Text>
            </Text>
          );
        })
      )}
    </Box>
  );
}
