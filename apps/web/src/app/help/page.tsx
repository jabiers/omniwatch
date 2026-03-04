'use client';

import { useState } from 'react';
import {
  BookOpen,
  Rocket,
  Bot,
  Terminal,
  Shield,
  Keyboard,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
  {
    q: 'How do I create my first agent?',
    a: 'Go to Agents > New Agent. Describe what you want in plain English — for example, "Monitor my website uptime and notify me if it goes down." The AI will generate the agent code automatically.',
  },
  {
    q: 'Which AI providers are supported?',
    a: 'OmniWatch supports Anthropic (Claude), OpenAI (GPT-4o, GPT-4.1), Google (Gemini 2.5), and local models via Ollama. Configure your API key in Settings.',
  },
  {
    q: 'How do I set up notifications?',
    a: 'Go to Settings > Notification Channels. Add webhook URLs for Slack, Discord, or Telegram. Use "Send Test Notification" to verify your setup works.',
  },
  {
    q: 'Can agents run local commands?',
    a: 'Yes. Agents with standard or permissive sandbox level can execute allowed commands (curl, git, docker, node, etc.). Strict sandbox blocks all execution.',
  },
  {
    q: 'How does self-healing work?',
    a: 'When an agent crashes, OmniWatch automatically attempts to fix the code using AI. It analyzes the error, generates a fix, validates the code, and restarts the agent. You can also trigger healing through the Chat interface.',
  },
  {
    q: 'How are costs calculated?',
    a: 'Costs are tracked per API call based on input/output tokens and model pricing. View the Usage page for breakdowns by model, agent, and daily totals. Local Ollama models are always free.',
  },
  {
    q: 'What is the Agent Mesh?',
    a: 'The Mesh allows agents to communicate with each other via pub/sub topics. Agents can publish events and subscribe to topics, enabling multi-agent workflows.',
  },
  {
    q: 'How do I use the Marketplace?',
    a: 'Browse pre-built recipes in Recipes for one-click agent creation. The Marketplace lets you publish and share your own recipes with the community.',
  },
];

const shortcuts = [
  { keys: ['Ctrl', 'K'], desc: 'Navigate to Agents' },
  { keys: ['Esc'], desc: 'Close mobile sidebar' },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-400" />
          Help & Documentation
        </h1>
        <p className="text-gray-400 mt-1">Everything you need to get started with OmniWatch.</p>
      </div>

      {/* Getting Started */}
      <div className="glass-card space-y-4">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Rocket className="w-5 h-5 text-emerald-400" />
          Getting Started
        </h2>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              1
            </span>
            <div>
              <p className="font-medium">Configure AI Provider</p>
              <p className="text-gray-500">
                Go to Settings and add your API key for Anthropic, OpenAI, or Google. Or install
                Ollama for free local AI.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              2
            </span>
            <div>
              <p className="font-medium">Create Your First Agent</p>
              <p className="text-gray-500">
                Navigate to Agents &gt; New Agent. Describe your task in natural language or install
                a pre-built recipe.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              3
            </span>
            <div>
              <p className="font-medium">Set Up Notifications</p>
              <p className="text-gray-500">
                Configure Slack, Discord, or Telegram webhooks in Settings to receive agent alerts.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              4
            </span>
            <div>
              <p className="font-medium">Monitor & Iterate</p>
              <p className="text-gray-500">
                Use the Dashboard and Analytics to track agent performance. Chat with agents to
                troubleshoot and improve them.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Concepts */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-card">
          <Bot className="w-5 h-5 text-emerald-400 mb-2" />
          <h3 className="font-medium mb-1">Agents</h3>
          <p className="text-xs text-gray-500">
            Autonomous programs that watch, analyze, and act. Watchers monitor data sources; Doers
            execute tasks.
          </p>
        </div>
        <div className="glass-card">
          <Terminal className="w-5 h-5 text-cyan-400 mb-2" />
          <h3 className="font-medium mb-1">Chat & Self-Healing</h3>
          <p className="text-xs text-gray-500">
            Talk to agents via Chat to troubleshoot issues. Auto-healing fixes crashed agents
            automatically using AI.
          </p>
        </div>
        <div className="glass-card">
          <Shield className="w-5 h-5 text-amber-400 mb-2" />
          <h3 className="font-medium mb-1">Sandbox & Security</h3>
          <p className="text-xs text-gray-500">
            Each agent runs in a sandboxed environment. Three levels: strict (no I/O), standard
            (limited), permissive (full access).
          </p>
        </div>
        <div className="glass-card">
          <MessageSquare className="w-5 h-5 text-purple-400 mb-2" />
          <h3 className="font-medium mb-1">Multi-Tenant</h3>
          <p className="text-xs text-gray-500">
            Isolate agents by tenant. RBAC with admin, operator, and viewer roles controls access to
            resources.
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="glass-card">
        <h2 className="text-lg font-medium flex items-center gap-2 mb-3">
          <Keyboard className="w-5 h-5 text-emerald-400" />
          Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{s.desc}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 text-xs rounded bg-white/[0.08] border border-white/[0.12] font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="glass-card">
        <h2 className="text-lg font-medium mb-3">Frequently Asked Questions</h2>
        <div className="divide-y divide-white/[0.06]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-3 text-sm text-left"
              >
                <span className="font-medium text-gray-200">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                )}
              </button>
              {openFaq === i && <p className="text-sm text-gray-400 pb-3 pl-1">{faq.a}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* API Docs */}
      <div className="glass-card">
        <h2 className="text-lg font-medium mb-2">API Documentation</h2>
        <p className="text-sm text-gray-400 mb-3">
          OmniWatch exposes a full REST API with 65+ endpoints. Explore the interactive API
          documentation.
        </p>
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Swagger UI
        </a>
      </div>
    </div>
  );
}
