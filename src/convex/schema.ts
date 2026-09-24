import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// BlindSpot issue lifecycle:
// reported → verified → in_progress → resolved → community_verified
export const ISSUE_STATUSES = [
  "reported",
  "verified",
  "in_progress",
  "resolved",
  "community_verified",
] as const;
export const issueStatusValidator = v.union(
  ...ISSUE_STATUSES.map((s) => v.literal(s)),
);
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

// Transparent, human-readable severity buckets driven by the priority score
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export const severityValidator = v.union(
  ...SEVERITIES.map((s) => v.literal(s)),
);
export type Severity = (typeof SEVERITIES)[number];

export const CATEGORIES = [
  "roads",
  "electricity",
  "water",
  "waste",
  "accessibility",
  "buildings",
] as const;
export const categoryValidator = v.union(...CATEGORIES.map((c) => v.literal(c)));
export type Category = (typeof CATEGORIES)[number];

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // BlindSpot community reputation
      reputation: v.optional(v.number()),
      reportsCount: v.optional(v.number()),
      confirmationsCount: v.optional(v.number()),
      resolutionsCount: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // A community-reported problem. One row per distinct physical problem
    // (duplicates are folded in via `confirmations`, not new rows).
    issues: defineTable({
      // Sequential, human-friendly issue number (e.g. #184).
      issueNumber: v.number(),
      title: v.string(),
      description: v.string(),
      category: categoryValidator,
      // e.g. "pothole", "broken_streetlight", "overflowing_bin"
      subcategory: v.string(),

      status: issueStatusValidator,
      severity: severityValidator,
      // Transparent, explainable 0-100 priority score (weighted factors).
      priorityScore: v.number(),

      // Transparent scoring factors, each 0-5, user/AI-suggested.
      safetyImpact: v.number(),
      peopleAffected: v.number(),
      accessibilityImpact: v.number(),
      durationDays: v.number(),

      lat: v.number(),
      lng: v.number(),
      locationLabel: v.string(),

      // Community confirmation counts
      confirms: v.number(),
      disputes: v.number(),

      // AI analysis of the submitted photo
      aiDetected: v.optional(v.string()),
      aiConfidence: v.optional(v.number()),
      aiPotentialIssue: v.optional(v.string()),

      photoStorageId: v.optional(v.id("_storage")),
      photoUrl: v.optional(v.string()),
      resolvedPhotoStorageId: v.optional(v.id("_storage")),
      resolvedPhotoUrl: v.optional(v.string()),

      // Lifecycle timestamps
      firstReportedAt: v.number(),
      latestConfirmationAt: v.number(),
      resolvedAt: v.optional(v.number()),
      resolvedByUserId: v.optional(v.id("users")),

      reportedByUserId: v.id("users"),
      isDemo: v.optional(v.boolean()), // seeded demo data, hidden from leaderboards
    })
      .index("status", ["status"])
      .index("category", ["category"])
      .index("severity", ["severity"])
      .index("priority", ["priorityScore"])
      .index("reported_by", ["reportedByUserId", "firstReportedAt"])
      .index("issue_number", ["issueNumber"]),

    // Community verification: users confirm "this issue is still present".
    // One row per (issue, user); upserted on repeat taps.
    confirmations: defineTable({
      issueId: v.id("issues"),
      userId: v.id("users"),
      isDemo: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_issue", ["issueId", "userId"])
      .index("by_user", ["userId", "createdAt"]),

    // Append-only activity log powering the public issue timeline.
    issueEvents: defineTable({
      issueId: v.id("issues"),
      userId: v.optional(v.id("users")),
      type: v.union(
        v.literal("reported"),
        v.literal("ai_analyzed"),
        v.literal("confirmed"),
        v.literal("disputed"),
        v.literal("status_changed"),
        v.literal("resolved"),
        v.literal("resolution_verified"),
      ),
      // e.g. "Status changed: verified → in_progress"
      message: v.string(),
      createdAt: v.number(),
    }).index("by_issue", ["issueId", "createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
