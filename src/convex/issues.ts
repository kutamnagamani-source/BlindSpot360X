import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MutationCtx, query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  categoryValidator,
  issueStatusValidator,
  CATEGORIES,
  ISSUE_STATUSES,
} from "./schema";

// ─── Shared helpers ────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Transparent priority score (0-100).
 * Every factor is visible to users — no mysterious AI black box.
 */
export const PRIORITY_WEIGHTS = {
  safetyImpact: 0.3,
  peopleAffected: 0.25,
  accessibilityImpact: 0.2,
  duration: 0.15,
  confirmations: 0.1,
};

export function computePriorityScore(input: {
  safetyImpact: number; // 0-5
  peopleAffected: number; // 0-5
  accessibilityImpact: number; // 0-5
  durationDays: number; // raw days, capped at 30
  confirms: number;
}): number {
  const durationFactor = Math.min(5, input.durationDays / 6);
  const confirmFactor = Math.min(5, input.confirms / 5);
  const w = PRIORITY_WEIGHTS;
  const score =
    input.safetyImpact * w.safetyImpact +
    input.peopleAffected * w.peopleAffected +
    input.accessibilityImpact * w.accessibilityImpact +
    durationFactor * w.duration +
    confirmFactor * w.confirmations;
  return Math.round((score / 5) * 100);
}

export function severityFromScore(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Standard Convex file upload entry point for report photos. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const reportIssue = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    subcategory: v.string(),
    lat: v.number(),
    lng: v.number(),
    locationLabel: v.string(),
    safetyImpact: v.number(),
    peopleAffected: v.number(),
    accessibilityImpact: v.number(),
    durationDays: v.number(),
    aiDetected: v.optional(v.string()),
    aiConfidence: v.optional(v.number()),
    aiPotentialIssue: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in to report an issue.");

    const confirms = 0;
    const priorityScore = computePriorityScore({ ...args, confirms });
    const severity = severityFromScore(priorityScore);
    const now = Date.now();

    const issueNumber = ((await ctx.db.query("issues").collect()).length || 0) + 184;

    const photoUrl = args.photoStorageId
      ? (await ctx.storage.getUrl(args.photoStorageId)) ?? undefined
      : undefined;

    const issueId = await ctx.db.insert("issues", {
      issueNumber,
      title: args.title,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      status: "reported",
      severity,
      priorityScore,
      safetyImpact: args.safetyImpact,
      peopleAffected: args.peopleAffected,
      accessibilityImpact: args.accessibilityImpact,
      durationDays: args.durationDays,
      lat: args.lat,
      lng: args.lng,
      locationLabel: args.locationLabel,
      confirms,
      disputes: 0,
      aiDetected: args.aiDetected,
      aiConfidence: args.aiConfidence,
      aiPotentialIssue: args.aiPotentialIssue,
      photoStorageId: args.photoStorageId,
      photoUrl,
      firstReportedAt: now,
      latestConfirmationAt: now,
      reportedByUserId: userId,
    });

    await ctx.db.insert("issueEvents", {
      issueId,
      userId,
      type: "reported",
      message: `Reported: ${args.title}`,
      createdAt: now,
    });

    // Reporter earns +10 reputation for a good report.
    await bumpUserStats(ctx, userId, { reputation: 10, reportsCount: 1 });

    return issueId;
  },
});

export const confirmIssue = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");

    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found.");

    const existing = await ctx.db
      .query("confirmations")
      .withIndex("by_issue", (q) => q.eq("issueId", issueId).eq("userId", userId))
      .first();
    const now = Date.now();

    if (existing) {
      // Toggle off — un-confirm.
      await ctx.db.delete(existing._id);
      const confirms = Math.max(0, issue.confirms - 1);
      const priorityScore = computePriorityScore({ ...issue, confirms });
      await ctx.db.patch(issueId, {
        confirms,
        priorityScore,
        severity: severityFromScore(priorityScore),
      });
      return { confirmed: false };
    }

    await ctx.db.insert("confirmations", { issueId, userId, createdAt: now });
    const confirms = issue.confirms + 1;
    const priorityScore = computePriorityScore({ ...issue, confirms });
    const firstConfirm = confirms === 1;
    await ctx.db.patch(issueId, {
      confirms,
      priorityScore,
      severity: severityFromScore(priorityScore),
      latestConfirmationAt: now,
      // A single independent confirmation is enough to verify a report.
      status: issue.status === "reported" ? "verified" : issue.status,
    });

    await ctx.db.insert("issueEvents", {
      issueId,
      userId,
      type: "confirmed",
      message: firstConfirm
        ? "Community confirmed the issue — status verified"
        : "Community confirmation added",
      createdAt: now,
    });

    // Confirmers earn +3 reputation for useful verification.
    await bumpUserStats(ctx, userId, { reputation: 3, confirmationsCount: 1 });

    return { confirmed: true };
  },
});

export const addComment = mutation({
  args: {
    issueId: v.id("issues"),
    body: v.string(),
  },
  handler: async (ctx, { issueId, body }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in to comment.");
    const trimmed = body.trim();
    if (!trimmed) throw new Error("Comment cannot be empty.");
    if (trimmed.length > 2000) throw new Error("Comment is too long (max 2000 characters).");

    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found.");

    const user = await ctx.db.get(userId);
    await ctx.db.insert("issueEvents", {
      issueId,
      userId,
      type: "comment",
      authorName: user?.name ?? user?.email ?? "A teammate",
      message: trimmed,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const disputeIssue = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found.");
    await ctx.db.patch(issueId, { disputes: issue.disputes + 1 });
    await ctx.db.insert("issueEvents", {
      issueId,
      userId,
      type: "disputed",
      message: "Someone disputed this report",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const updateStatus = mutation({
  args: {
    issueId: v.id("issues"),
    status: issueStatusValidator,
    resolvedPhotoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { issueId, status, resolvedPhotoStorageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found.");

    const now = Date.now();
    const patch: Partial<Doc<"issues">> = { status };
    const events: Array<{ type: Doc<"issueEvents">["type"]; message: string }> = [];

    if (status === "resolved" || status === "community_verified") {
      patch.resolvedAt = now;
      patch.resolvedByUserId = userId;
      if (resolvedPhotoStorageId) {
        patch.resolvedPhotoStorageId = resolvedPhotoStorageId;
        patch.resolvedPhotoUrl =
          (await ctx.storage.getUrl(resolvedPhotoStorageId)) ?? undefined;
      }
      events.push({ type: "resolved", message: "Marked as resolved" });
      // Resolution earns +5 reputation.
      await bumpUserStats(ctx, userId, { reputation: 5, resolutionsCount: 1 });
    } else {
      events.push({
        type: "status_changed",
        message: `Status changed: ${issue.status.replace("_", " ")} → ${status.replace("_", " ")}`,
      });
    }

    await ctx.db.patch(issueId, patch);
    for (const e of events) {
      await ctx.db.insert("issueEvents", {
        issueId,
        userId,
        type: e.type,
        message: e.message,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const verifyResolution = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found.");
    if (issue.status !== "resolved") throw new Error("Issue is not resolved yet.");

    await ctx.db.patch(issueId, { status: "community_verified" });
    await ctx.db.insert("issueEvents", {
      issueId,
      userId,
      type: "resolution_verified",
      message: "Community verified the resolution",
      createdAt: Date.now(),
    });
    await bumpUserStats(ctx, userId, { reputation: 5 });
    return { ok: true };
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

/** All issues within a radius of a point, with computed distance. */
export const listNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.optional(v.number()),
  },
  handler: async (ctx, { lat, lng, radiusKm = 25 }) => {
    const issues = await ctx.db.query("issues").order("desc").collect();
    return issues
      .map((issue) => ({
        ...issue,
        distanceKm: distanceKm(lat, lng, issue.lat, issue.lng),
      }))
      .filter((i) => i.distanceKm <= radiusKm)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  },
});

export const getIssue = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const issue = await ctx.db.get(issueId);
    if (!issue) return null;

    const [events, reporter] = await Promise.all([
      ctx.db
        .query("issueEvents")
        .withIndex("by_issue", (q) => q.eq("issueId", issueId))
        .order("asc")
        .collect(),
      ctx.db.get(issue.reportedByUserId),
    ]);

    const userId = await getAuthUserId(ctx);
    let hasConfirmed = false;
    if (userId) {
      const c = await ctx.db
        .query("confirmations")
        .withIndex("by_issue", (q) => q.eq("issueId", issueId).eq("userId", userId))
        .first();
      hasConfirmed = !!c;
    }

    return { ...issue, events, reporterName: reporter?.name ?? "Anonymous", hasConfirmed };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").collect();
    const active = issues.filter(
      (i) => i.status !== "resolved" && i.status !== "community_verified",
    );

    const byCategory = Object.fromEntries(
      CATEGORIES.map((c) => [c, issues.filter((i) => i.category === c).length]),
    ) as Record<(typeof CATEGORIES)[number], number>;

    const byStatus = Object.fromEntries(
      ISSUE_STATUSES.map((s) => [s, issues.filter((i) => i.status === s).length]),
    ) as Record<(typeof ISSUE_STATUSES)[number], number>;

    return {
      total: issues.length,
      active: active.length,
      critical: active.filter((i) => i.severity === "critical").length,
      high: active.filter((i) => i.severity === "high").length,
      inProgress: active.filter((i) => i.status === "in_progress").length,
      resolved: byStatus.resolved + byStatus.community_verified,
      reported: byStatus.reported,
      verified: byStatus.verified,
      byCategory,
      byStatus,
    };
  },
});

export const getMyReports = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("issues")
      .withIndex("reported_by", (q) => q.eq("reportedByUserId", userId))
      .order("desc")
      .collect();
  },
});

export const getMyConfirmations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const confirmations = await ctx.db
      .query("confirmations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const issues = await Promise.all(confirmations.map((c) => ctx.db.get(c.issueId)));
    return issues.filter((i): i is Doc<"issues"> => i !== null);
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => (u.reputation ?? 0) > 0 && !u.isAnonymous)
      .sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0))
      .slice(0, 10)
      .map((u) => ({
        name: u.name ?? u.email ?? "Anonymous",
        reputation: u.reputation ?? 0,
        reports: u.reportsCount ?? 0,
        confirmations: u.confirmationsCount ?? 0,
      }));
  },
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function bumpUserStats(
  ctx: MutationCtx,
  userId: Id<"users">,
  delta: {
    reputation?: number;
    reportsCount?: number;
    confirmationsCount?: number;
    resolutionsCount?: number;
  },
) {
  const user = await ctx.db.get(userId);
  if (!user) return;
  await ctx.db.patch(userId, {
    reputation: Math.max(0, (user.reputation ?? 0) + (delta.reputation ?? 0)),
    reportsCount: (user.reportsCount ?? 0) + (delta.reportsCount ?? 0),
    confirmationsCount:
      (user.confirmationsCount ?? 0) + (delta.confirmationsCount ?? 0),
    resolutionsCount: (user.resolutionsCount ?? 0) + (delta.resolutionsCount ?? 0),
  });
}
