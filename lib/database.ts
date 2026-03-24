/**
 * lib/database.ts — Netlify Blobs-backed storage
 *
 * All app data, admin config and uploaded files live here.
 * No external database or Supabase account required.
 *
 * In production (Netlify) → Netlify Blobs are used automatically.
 * In local dev (npm run dev) → in-memory fallback is used (data resets on restart).
 * For persistent local dev → run `netlify dev` instead of `npm run dev`, or add
 *   NETLIFY_TOKEN and NETLIFY_SITE_ID to .env.local.
 */

import { getStore } from '@netlify/blobs'

export interface App {
  id: string
  name: string
  version: string
  description: string
  file_name: string
  download_url: string
  changelog: string
  downloads: number
  created_at: string
}

// ─── In-memory fallback for local dev without Netlify context ────────────────
const mem = {
  apps: [] as App[],
  config: {} as Record<string, string>,
  files: {} as Record<string, { data: Buffer; contentType: string }>,
}

function blobsAvailable(): boolean {
  return Boolean(
    process.env.NETLIFY_BLOBS_CONTEXT ||
      (process.env.NETLIFY_TOKEN && process.env.NETLIFY_SITE_ID)
  )
}

// ─── Apps ────────────────────────────────────────────────────────────────────
const APPS_STORE = 'vitech-apps'

async function readApps(): Promise<App[]> {
  if (!blobsAvailable()) return mem.apps

  const store = getStore(APPS_STORE)
  const raw = await store.get('list')
  if (!raw) return []
  return JSON.parse(raw) as App[]
}

async function writeApps(apps: App[]): Promise<void> {
  if (!blobsAvailable()) {
    mem.apps = apps
    return
  }

  const store = getStore(APPS_STORE)
  await store.set('list', JSON.stringify(apps))
}

export async function getAllApps(): Promise<App[]> {
  try {
    return await readApps()
  } catch {
    return []
  }
}

export async function getAppById(id: string): Promise<App | null> {
  const apps = await getAllApps()
  return apps.find((a) => a.id === id) ?? null
}

export async function createApp(
  input: Omit<App, 'id' | 'created_at' | 'downloads'>
): Promise<App> {
  const apps = await readApps()
  const newApp: App = {
    ...input,
    id: crypto.randomUUID(),
    downloads: 0,
    created_at: new Date().toISOString(),
  }
  await writeApps([newApp, ...apps])
  return newApp
}

export async function updateApp(
  id: string,
  updates: Partial<Omit<App, 'id' | 'created_at'>>
): Promise<App | null> {
  const apps = await readApps()
  const idx = apps.findIndex((a) => a.id === id)
  if (idx === -1) return null
  apps[idx] = { ...apps[idx], ...updates }
  await writeApps(apps)
  return apps[idx]
}

export async function deleteApp(id: string): Promise<boolean> {
  const apps = await readApps()
  const next = apps.filter((a) => a.id !== id)
  if (next.length === apps.length) return false
  await writeApps(next)
  return true
}

export async function incrementDownloads(id: string): Promise<void> {
  const apps = await readApps()
  const idx = apps.findIndex((a) => a.id === id)
  if (idx === -1) return
  apps[idx] = { ...apps[idx], downloads: apps[idx].downloads + 1 }
  await writeApps(apps)
}

// ─── Config (admin password etc.) ────────────────────────────────────────────
const CONFIG_STORE = 'vitech-config'

export async function getConfigValue(key: string): Promise<string | null> {
  try {
    if (!blobsAvailable()) return mem.config[key] ?? null
    const store = getStore(CONFIG_STORE)
    return await store.get(key)
  } catch {
    return null
  }
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  if (!blobsAvailable()) {
    mem.config[key] = value
    return
  }
  const store = getStore(CONFIG_STORE)
  await store.set(key, value)
}

// ─── File uploads ─────────────────────────────────────────────────────────────
const FILES_STORE = 'vitech-files'

export async function storeFile(
  key: string,
  buffer: ArrayBuffer,
  contentType: string
): Promise<void> {
  if (!blobsAvailable()) {
    mem.files[key] = { data: Buffer.from(buffer), contentType }
    return
  }
  const store = getStore(FILES_STORE)
  // Store content-type in a companion key
  await store.set(`${key}.ct`, contentType)
  await store.set(key, buffer)
}

export async function retrieveFile(
  key: string
): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    if (!blobsAvailable()) return mem.files[key] ?? null

    const store = getStore(FILES_STORE)
    const raw = await store.get(key, { type: 'arrayBuffer' })
    if (!raw) return null
    const contentType =
      (await store.get(`${key}.ct`)) || 'application/octet-stream'
    return { data: Buffer.from(raw), contentType }
  } catch {
    return null
  }
}
