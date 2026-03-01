/** Health check — delegates to Hono app */
import { createApp } from '@omniwatch/api/app';

const app = createApp();

export const GET = (req: Request) => app.fetch(req);
