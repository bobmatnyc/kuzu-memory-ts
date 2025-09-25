import { KuzuMemory } from './KuzuMemory';
import type { KuzuConfig } from '../types';

let defaultClient: KuzuMemory | null = null;

export async function createMemoryClient(
  config?: Partial<KuzuConfig>
): Promise<KuzuMemory> {
  const client = new KuzuMemory(config);
  await client.init();
  return client;
}

export async function getDefaultClient(
  config?: Partial<KuzuConfig>
): Promise<KuzuMemory> {
  if (!defaultClient) {
    defaultClient = await createMemoryClient(config);
  }
  return defaultClient;
}

export function clearDefaultClient(): void {
  if (defaultClient) {
    defaultClient.destroy();
    defaultClient = null;
  }
}