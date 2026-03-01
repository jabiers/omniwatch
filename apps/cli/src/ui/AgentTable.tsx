import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Agent } from '@vigil/shared';

interface AgentTableProps {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAction: (action: string, id: string) => void;
}

const STATUS_ICON: Record<string, string> = {
  running: '\u25CF', // filled circle
  stopped: '\u25CB', // empty circle
  error: '\u2715', // cross
  creating: '\u25CB',
  ready: '\u25CB',
  healing: '\u25CF',
  destroyed: '\u2715',
};

const STATUS_COLOR: Record<string, string> = {
  running: 'green',
  stopped: 'gray',
  error: 'red',
  creating: 'yellow',
  ready: 'cyan',
  healing: 'yellow',
  destroyed: 'gray',
};

export function AgentTable({
  agents,
  selectedId,
  onSelect,
  onAction,
}: AgentTableProps): React.ReactElement {
  useInput((input, key) => {
    const currentIdx = agents.findIndex((a) => a.id === selectedId);

    if (key.upArrow || input === 'k') {
      if (currentIdx > 0) onSelect(agents[currentIdx - 1].id);
    }
    if (key.downArrow || input === 'j') {
      if (currentIdx < agents.length - 1) onSelect(agents[currentIdx + 1].id);
    }
    if (input === 's' && selectedId) onAction('start', selectedId);
    if (input === 'x' && selectedId) onAction('stop', selectedId);
    if (input === 'd' && selectedId) onAction('destroy', selectedId);
  });

  if (agents.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>
          No agents. Run &quot;vigil watch &quot;prompt&quot;&quot; to create one.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box gap={2}>
        <Text bold dimColor>
          {'  NAME'.padEnd(22)}
        </Text>
        <Text bold dimColor>
          {'STATUS'.padEnd(10)}
        </Text>
        <Text bold dimColor>
          {'PID'.padEnd(8)}
        </Text>
        <Text bold dimColor>
          LAST RUN
        </Text>
      </Box>
      {agents.map((agent) => {
        const isSelected = agent.id === selectedId;
        const icon = STATUS_ICON[agent.status] || '\u25CB';
        const color = STATUS_COLOR[agent.status] || 'gray';
        const pid = agent.pid ? String(agent.pid) : '-';
        const lastRun = agent.last_run_at ? formatTimeAgo(agent.last_run_at) : '-';

        return (
          <Box key={agent.id} gap={2}>
            <Text>
              {isSelected ? '\u25B8 ' : '  '}
              <Text bold={isSelected}>{agent.name.padEnd(20)}</Text>
            </Text>
            <Text color={color}>{`${icon} ${agent.status}`.padEnd(10)}</Text>
            <Text>{pid.padEnd(8)}</Text>
            <Text dimColor>{lastRun}</Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>j/k:navigate s:start x:stop d:destroy</Text>
      </Box>
    </Box>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
