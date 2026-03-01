declare module '@omniwatch/api/app' {
  /** Create a configured Hono app instance */
  export function createApp(): {
    fetch(request: Request): Response | Promise<Response>;
  };
}
