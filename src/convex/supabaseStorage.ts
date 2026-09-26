"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Configuration ────────────────────────────────────────────────────────────

export const SUPABASE_BUCKET = "blindspot-photos";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

let cached: { url: string; client: SupabaseClient } | null = null;

function getSupabase(): SupabaseClient {
  const cfg = supabaseConfig();
  if (!cfg) {
    throw new Error(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (cached && cached.url === cfg.url) return cached.client;
  const client = createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cached = { url: cfg.url, client };
  return client;
}

/** The public base URL of the configured project, or null when unconfigured. */
export function supabaseBaseUrl(): string | null {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  return cfg.url.replace(/\/+$/, "");
}

// ─── Bucket bootstrap ─────────────────────────────────────────────────────────

let bucketReady = false;

async function ensureBucket(client: SupabaseClient): Promise<void> {
  if (bucketReady) return;
  const { data } = await client.storage.getBucket(SUPABASE_BUCKET);
  if (data) {
    bucketReady = true;
    return;
  }
  const { error } = await client.storage.createBucket(SUPABASE_BUCKET, {
    public: true,
    fileSizeLimit: "10485760", // 10 MB
  });
  if (error && !/exists/i.test(error.message)) {
    throw new Error(`Could not create Supabase bucket: ${error.message}`);
  }
  bucketReady = true;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Mirror a photo already stored in Convex storage into Supabase.
 * Returns the stable public CDN URL of the stored object, or null when
 * Supabase is not configured (the caller keeps the Convex URL instead).
 */
export const mirrorPhoto = action({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    kind: v.union(v.literal("report"), v.literal("resolution")),
  },
  handler: async (ctx, { storageId, fileName, contentType, kind }) => {
    if (!isSupabaseConfigured()) return null;

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error(`Uploaded file not found in storage: ${storageId}`);

    const bytes = await blob.arrayBuffer();
    const client = getSupabase();
    await ensureBucket(client);

    const now = new Date();
    const stamp = now.toISOString().slice(0, 10);
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60) || "photo.jpg";
    const objectPath = `${stamp}/${kind}-${storageId}-${safe}`;

    const { error } = await client.storage
      .from(SUPABASE_BUCKET)
      .upload(objectPath, bytes, {
        contentType: contentType || "image/jpeg",
        upsert: true,
      });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    return supabaseUrlFor(objectPath);
  },
});

/** Build the public URL for a bucket object. */
export function supabaseUrlFor(objectPath: string): string {
  return `${supabaseBaseUrl()}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
}
