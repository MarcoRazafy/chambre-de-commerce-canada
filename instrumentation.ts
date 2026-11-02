// Lance les tâches automatiques (lib/jobs.ts) au démarrage du serveur, puis toutes les 10 minutes.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) return;
  const { runJobs } = await import('./lib/jobs');
  const tick = () => runJobs().catch(e => console.error('[tâches]', e.message));
  setTimeout(tick, 20_000);
  setInterval(tick, 10 * 60_000);
}
