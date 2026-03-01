import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { Dashboard } from '../ui/Dashboard.js';
import { ensureServer } from './server.js';

export const dashCommand = new Command('dash')
  .description('Open real-time TUI dashboard')
  .action(async () => {
    await ensureServer();
    render(React.createElement(Dashboard));
  });
