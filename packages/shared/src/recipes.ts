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
      'Monitor disk usage by checking available space. Use omni.fetch to call a local endpoint or system command wrapper. Notify me when any partition exceeds 85% usage. Check every 5 minutes.',
    config: { interval: 300_000 },
    tags: ['disk', 'storage', 'system', 'infrastructure'],
  },
  // --- v4.28: New recipes ---
  {
    id: 'memory-usage-monitor',
    name: 'Memory Usage Monitor',
    description: 'Monitor system RAM usage and alert when it exceeds 90%',
    category: 'monitoring',
    prompt:
      'Monitor system memory usage. Check every 2 minutes. Notify me when RAM usage exceeds 90%. Include current usage, total, and available memory in MB.',
    config: { interval: 120_000 },
    tags: ['memory', 'ram', 'system', 'performance'],
  },
  {
    id: 'cpu-load-monitor',
    name: 'CPU Load Monitor',
    description: 'Track CPU load average and alert on high utilization',
    category: 'monitoring',
    prompt:
      'Monitor CPU load average. Check every 2 minutes. Notify me when 5-minute load average exceeds the number of CPU cores. Include 1-min, 5-min, and 15-min averages.',
    config: { interval: 120_000 },
    tags: ['cpu', 'load', 'system', 'performance'],
  },
  {
    id: 'port-scanner',
    name: 'Port Availability Checker',
    description: 'Verify that expected ports are open on target hosts',
    category: 'security',
    prompt:
      'Check if critical ports (80, 443, 22, 3306, 5432, 6379) are open on the specified host. Check every 5 minutes. Notify me immediately if any expected port becomes unreachable.',
    config: { interval: 300_000 },
    tags: ['port', 'network', 'security', 'availability'],
  },
  {
    id: 'dns-record-monitor',
    name: 'DNS Record Monitor',
    description: 'Alert when DNS records change unexpectedly',
    category: 'security',
    prompt:
      'Monitor DNS records (A, CNAME, MX) for a domain. Check every 30 minutes. Notify me if any record changes from the baseline. Include old and new values.',
    config: { interval: 1_800_000 },
    tags: ['dns', 'domain', 'security', 'network'],
  },
  {
    id: 'log-error-watcher',
    name: 'Log Error Watcher',
    description: 'Monitor application logs for error patterns',
    category: 'monitoring',
    prompt:
      'Read the latest application log entries from a log file or API endpoint. Check every minute. Notify me when error-level entries are detected. Include the error message and timestamp.',
    config: { interval: 60_000 },
    tags: ['logs', 'errors', 'monitoring', 'debug'],
  },
  {
    id: 'github-issue-tracker',
    name: 'GitHub Issue Tracker',
    description: 'Monitor a GitHub repo for new issues and PRs',
    category: 'devops',
    prompt:
      'Monitor a GitHub repository for new issues and pull requests using the GitHub API. Check every 10 minutes. Notify me about new issues with their title, author, and labels.',
    config: { interval: 600_000 },
    tags: ['github', 'issues', 'pullrequest', 'devops'],
  },
  {
    id: 'cron-job-monitor',
    name: 'Cron Job Monitor',
    description: 'Verify scheduled jobs run on time and alert on failures',
    category: 'devops',
    prompt:
      'Monitor expected cron job completions. Check a status endpoint or file modification time. Notify me if a scheduled job did not run within its expected window. Check every 5 minutes.',
    config: { interval: 300_000 },
    tags: ['cron', 'scheduler', 'jobs', 'automation'],
  },
  {
    id: 'stock-price-tracker',
    name: 'Stock Price Tracker',
    description: 'Track stock prices and alert on significant movements',
    category: 'finance',
    prompt:
      'Monitor stock prices using a free financial API. Check every 15 minutes during market hours. Notify me when any tracked stock moves more than 5% from the previous close.',
    config: { interval: 900_000 },
    tags: ['stocks', 'market', 'finance', 'trading'],
  },
  {
    id: 'weather-alert',
    name: 'Weather Alert Monitor',
    description: 'Get notified about severe weather conditions',
    category: 'data',
    prompt:
      'Monitor weather conditions for a specified location using OpenWeatherMap API. Check every 30 minutes. Notify me about severe weather warnings, extreme temperatures (above 35C or below -10C), or heavy precipitation forecasts.',
    config: { interval: 1_800_000 },
    tags: ['weather', 'climate', 'alerts', 'forecast'],
  },
  {
    id: 'reddit-keyword-monitor',
    name: 'Reddit Keyword Monitor',
    description: 'Watch subreddits for posts mentioning specific keywords',
    category: 'social',
    prompt:
      'Monitor specified subreddits for new posts containing specific keywords using the Reddit JSON API. Check every 10 minutes. Notify me with the post title, subreddit, and link.',
    config: { interval: 600_000 },
    tags: ['reddit', 'social', 'keywords', 'monitoring'],
  },
  {
    id: 'twitter-mention-tracker',
    name: 'Social Media Mention Tracker',
    description: 'Track brand or keyword mentions on social platforms',
    category: 'social',
    prompt:
      'Monitor social media platforms for mentions of specified keywords or brand names. Use available APIs or RSS feeds. Check every 15 minutes. Notify me with the mention text, platform, and link.',
    config: { interval: 900_000 },
    tags: ['social', 'mentions', 'brand', 'tracking'],
  },
  {
    id: 'database-health',
    name: 'Database Health Checker',
    description: 'Monitor database connectivity, replication lag, and query performance',
    category: 'monitoring',
    prompt:
      'Monitor database health by checking connection status and response time. Check every 2 minutes. Notify me if connection fails, latency exceeds 500ms, or replication lag exceeds 30 seconds.',
    config: { interval: 120_000 },
    tags: ['database', 'health', 'postgres', 'mysql'],
  },
  {
    id: 'container-resource-monitor',
    name: 'Container Resource Monitor',
    description: 'Track Docker container CPU and memory usage',
    category: 'devops',
    prompt:
      'Monitor running Docker containers for resource usage via the Docker API. Check every 3 minutes. Notify me when any container exceeds 80% memory or CPU limit. Include container name and stats.',
    config: { interval: 180_000 },
    tags: ['docker', 'container', 'resources', 'devops'],
  },
  {
    id: 'json-api-diff',
    name: 'JSON API Response Differ',
    description: 'Detect changes in JSON API responses over time',
    category: 'data',
    prompt:
      'Monitor a JSON API endpoint and detect changes in the response structure or values. Check every 10 minutes. Store the previous response hash and notify me when the response changes. Include the specific fields that changed.',
    config: { interval: 600_000 },
    tags: ['api', 'json', 'diff', 'change-detection'],
  },
  {
    id: 'dependency-vulnerability',
    name: 'Dependency Vulnerability Scanner',
    description: 'Check npm/pip dependencies for known security vulnerabilities',
    category: 'security',
    prompt:
      'Scan project dependencies for known vulnerabilities using npm audit or equivalent. Check once per day. Notify me about critical and high severity vulnerabilities with the affected package, version, and advisory URL.',
    config: { interval: 86_400_000 },
    tags: ['security', 'vulnerability', 'npm', 'audit'],
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
