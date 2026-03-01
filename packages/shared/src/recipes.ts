/** Agent Recipe — a pre-configured agent template users can install with one click */
export interface AgentRecipe {
  id: string;
  name: string;
  description: string;
  category: 'monitoring' | 'finance' | 'devops' | 'social' | 'data' | 'security';
  prompt: string;
  template?: string;
  config?: {
    interval?: number;
    dependencies?: string[];
  };
  tags: string[];
}

export const BUILT_IN_RECIPES: AgentRecipe[] = [
  {
    id: 'btc-price-tracker',
    name: 'BTC Price Tracker',
    description: 'Monitor Bitcoin price and notify on significant changes (>3%)',
    category: 'finance',
    prompt:
      'Monitor Bitcoin price from CoinGecko API. Check every 5 minutes. Notify me when the price changes by more than 3% from the last notified price. Include current price and percentage change in the notification.',
    config: { interval: 300_000, dependencies: ['axios'] },
    tags: ['crypto', 'bitcoin', 'price', 'finance'],
  },
  {
    id: 'eth-gas-tracker',
    name: 'ETH Gas Tracker',
    description: 'Alert when Ethereum gas fees drop below a threshold',
    category: 'finance',
    prompt:
      'Monitor Ethereum gas prices using a public API. Notify me when gas fees drop below 20 gwei. Check every 2 minutes.',
    config: { interval: 120_000 },
    tags: ['crypto', 'ethereum', 'gas', 'defi'],
  },
  {
    id: 'website-uptime',
    name: 'Website Uptime Monitor',
    description: 'Check if a website is up and measure response time',
    category: 'monitoring',
    prompt:
      'Monitor the health of a website. Check every minute. Notify me if the site is down (non-200 status or timeout >10s). Include response time in each check log.',
    template: 'web-monitor',
    config: { interval: 60_000 },
    tags: ['uptime', 'http', 'website', 'health'],
  },
  {
    id: 'ssl-cert-expiry',
    name: 'SSL Certificate Monitor',
    description: 'Alert before SSL certificates expire',
    category: 'security',
    prompt:
      'Check the SSL certificate expiration date of a website. Notify me when the certificate expires within 14 days. Check once per day.',
    config: { interval: 86_400_000 },
    tags: ['ssl', 'tls', 'certificate', 'security'],
  },
  {
    id: 'github-release',
    name: 'GitHub Release Watcher',
    description: 'Get notified when a GitHub repo publishes a new release',
    category: 'devops',
    prompt:
      'Monitor a GitHub repository for new releases using the GitHub API (no auth required for public repos). Check every 15 minutes. Notify me when a new release is published with the version number and release notes.',
    config: { interval: 900_000 },
    tags: ['github', 'releases', 'open-source'],
  },
  {
    id: 'npm-package-update',
    name: 'npm Package Update Checker',
    description: 'Monitor npm packages for new versions',
    category: 'devops',
    prompt:
      'Monitor one or more npm packages for new version releases using the npm registry API. Check every hour. Notify me when a new version is published.',
    config: { interval: 3_600_000 },
    tags: ['npm', 'packages', 'nodejs', 'updates'],
  },
  {
    id: 'rss-feed-monitor',
    name: 'RSS Feed Monitor',
    description: 'Watch an RSS feed and notify on new items',
    category: 'data',
    prompt:
      'Monitor an RSS feed for new items. Check every 10 minutes. Notify me when new articles are published. Include the title and link in the notification.',
    template: 'rss-watcher',
    config: { interval: 600_000, dependencies: ['rss-parser'] },
    tags: ['rss', 'feed', 'news', 'blog'],
  },
  {
    id: 'api-health-checker',
    name: 'API Health Checker',
    description: 'Monitor REST API endpoints and alert on failures',
    category: 'devops',
    prompt:
      'Monitor a REST API endpoint. Check every 2 minutes. Verify the response status is 200 and the response body contains expected fields. Notify me on failures with error details.',
    template: 'api-checker',
    config: { interval: 120_000 },
    tags: ['api', 'health', 'rest', 'endpoint'],
  },
  {
    id: 'docker-hub-watcher',
    name: 'Docker Hub Image Watcher',
    description: 'Alert on new Docker image tags',
    category: 'devops',
    prompt:
      'Monitor a Docker Hub repository for new image tags. Check every 30 minutes. Notify me when a new tag is pushed. Use the Docker Hub API v2.',
    config: { interval: 1_800_000 },
    tags: ['docker', 'container', 'image', 'devops'],
  },
  {
    id: 'hacker-news-top',
    name: 'Hacker News Top Stories',
    description: 'Get notified about trending HN stories above a score threshold',
    category: 'social',
    prompt:
      'Monitor Hacker News for trending stories using the HN API. Check every 15 minutes. Notify me about stories that reach 200+ points. Include title, URL, and score.',
    config: { interval: 900_000 },
    tags: ['hackernews', 'tech', 'news', 'trending'],
  },
  {
    id: 'currency-rate',
    name: 'Currency Exchange Rate',
    description: 'Track currency exchange rates and alert on significant changes',
    category: 'finance',
    prompt:
      'Monitor USD/KRW exchange rate using a free API. Check every 30 minutes. Notify me when the rate changes by more than 1% from the last notified rate.',
    config: { interval: 1_800_000 },
    tags: ['forex', 'currency', 'exchange', 'finance'],
  },
  {
    id: 'disk-space-monitor',
    name: 'Disk Space Monitor',
    description: 'Alert when disk usage exceeds a threshold',
    category: 'monitoring',
    prompt:
      'Monitor disk usage by checking available space. Use vigil.fetch to call a local endpoint or system command wrapper. Notify me when any partition exceeds 85% usage. Check every 5 minutes.',
    config: { interval: 300_000 },
    tags: ['disk', 'storage', 'system', 'infrastructure'],
  },
];

/** Get all available recipes */
export function listRecipes(): AgentRecipe[] {
  return BUILT_IN_RECIPES;
}

/** Get a recipe by ID */
export function getRecipe(id: string): AgentRecipe | undefined {
  return BUILT_IN_RECIPES.find((r) => r.id === id);
}

/** Search recipes by query */
export function searchRecipes(query: string): AgentRecipe[] {
  const q = query.toLowerCase();
  return BUILT_IN_RECIPES.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some((t) => t.includes(q)) ||
      r.category.includes(q),
  );
}
