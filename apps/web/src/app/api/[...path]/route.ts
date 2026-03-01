/** Catch-all API route — delegates to the Hono app */
import { createApp } from '@vigil/api/app';

const app = createApp();

export const GET = (req: Request) => app.fetch(req);
export const POST = (req: Request) => app.fetch(req);
export const PUT = (req: Request) => app.fetch(req);
export const DELETE = (req: Request) => app.fetch(req);
export const PATCH = (req: Request) => app.fetch(req);
