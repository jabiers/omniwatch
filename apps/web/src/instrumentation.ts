/** Next.js instrumentation — initializes daemon engine on server start */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initEngine } = await import('@omniwatch/api/engine');
    await initEngine();
  }
}
