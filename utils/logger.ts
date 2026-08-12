export function logTestEvent(event: string, metadata: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, ...metadata }));
}
