import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../../shared/types.js';

interface StatusBarProps {
  agents: Agent[];
}

export function StatusBar({ agents }: StatusBarProps): React.ReactElement {
  const running = agents.filter((a) => a.status === 'running').length;
  const errored = agents.filter((a) => a.status === 'error').length;
  const total = agents.length;

  return (
    <Box borderStyle="single" paddingX={1} justifyContent="space-between">
      <Text bold color="cyan">OmniWatch Dashboard</Text>
      <Box gap={2}>
        <Text>Agents: <Text bold>{total}</Text></Text>
        <Text>Running: <Text bold color="green">{running}</Text></Text>
        {errored > 0 && <Text>Errors: <Text bold color="red">{errored}</Text></Text>}
      </Box>
      <Text dimColor>q:quit r:refresh</Text>
    </Box>
  );
}
