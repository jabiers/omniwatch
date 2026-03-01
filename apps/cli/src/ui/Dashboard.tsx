import React, { useState, useEffect } from 'react';
import { Box, useApp, useInput } from 'ink';
import { StatusBar } from './StatusBar.js';
import { AgentTable } from './AgentTable.js';
import { LogViewer } from './LogViewer.js';
import { listAgents, startAgent, stopAgent, destroyAgent } from '../api-client.js';
import type { Agent } from '@omniwatch/shared';

export function Dashboard(): React.ReactElement {
  const { exit } = useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = (await listAgents()) as Agent[];
      setAgents(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch {
      // ignore connection errors
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  useInput((input) => {
    if (input === 'q') exit();
    if (input === 'r') refresh();
  });

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === 'start') await startAgent(id);
      else if (action === 'stop') await stopAgent(id);
      else if (action === 'destroy') await destroyAgent(id);
      await refresh();
    } catch {
      // ignore errors in dashboard
    }
  };

  return (
    <Box flexDirection="column">
      <StatusBar agents={agents} />
      <AgentTable
        agents={agents}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAction={handleAction}
      />
      <LogViewer agentId={selectedId} />
    </Box>
  );
}
