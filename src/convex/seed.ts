import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { computePriorityScore, severityFromScore } from "./issues";

/**
 * One-time seed with realistic demo issues and a demo admin user.
 * Idempotent: does nothing if issues already exist.
 */
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("issues").first();
    if (existing !== null) return { seeded: false };

    // A demo admin account to own the seeded issues.
    const adminId = await ctx.db.insert("users", {
      name: "BlindSpot Command",
      email: "command@blindspot.city",
      role: "admin",
      reputation: 320,
      reportsCount: 12,
      confirmationsCount: 41,
      resolutionsCount: 9,
    });

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    type SeedIssue = {
      title: string;
      description: string;
      category: "roads" | "electricity" | "water" | "waste" | "accessibility" | "buildings";
      subcategory: string;
      status: "reported" | "verified" | "in_progress" | "resolved" | "community_verified";
      lat: number;
      lng: number;
      locationLabel: string;
      safetyImpact: number;
      peopleAffected: number;
      accessibilityImpact: number;
      durationDays: number;
      confirms: number;
      disputes: number;
      ageDays: number;
      aiDetected?: string;
      aiConfidence?: number;
      aiPotentialIssue?: string;
    };

    const seeds: SeedIssue[] = [
      // ── BlindSpot campus zone ──
      { title: "Deep pothole on Main St", description: "Knee-deep pothole in the right lane near the bus stop. Two-wheelers swerve into oncoming traffic to avoid it.", category: "roads", subcategory: "pothole", status: "verified", lat: 17.4432, lng: 78.3823, locationLabel: "Main Street, BlindSpot Campus", safetyImpact: 5, peopleAffected: 4, accessibilityImpact: 2, durationDays: 21, confirms: 14, disputes: 1, ageDays: 21, aiDetected: "Pothole", aiConfidence: 0.92, aiPotentialIssue: "Road surface damage — vehicle hazard" },
      { title: "Streetlight out on College Rd", description: "Three consecutive lamp posts dark. The stretch past the library gate is pitch black after 7pm.", category: "electricity", subcategory: "broken_streetlight", status: "in_progress", lat: 17.4451, lng: 78.3762, locationLabel: "College Road, near Library Gate", safetyImpact: 4, peopleAffected: 5, accessibilityImpact: 3, durationDays: 12, confirms: 27, disputes: 0, ageDays: 12, aiDetected: "Streetlight", aiConfidence: 0.87, aiPotentialIssue: "Light appears damaged/non-functional" },
      { title: "Overflowing garbage bin", description: "Ward bin overflowing since the weekend pickup was missed. Stray dogs scattering waste onto the road.", category: "waste", subcategory: "overflowing_bin", status: "reported", lat: 17.4412, lng: 78.3852, locationLabel: "Market Lane, behind grocery block", safetyImpact: 3, peopleAffected: 3, accessibilityImpact: 1, durationDays: 4, confirms: 8, disputes: 0, ageDays: 4, aiDetected: "Waste container", aiConfidence: 0.81, aiPotentialIssue: "Overflowing waste bin" },
      { title: "Water leak flooding footpath", description: "Pipe joint leaking for days; ankle-deep water pooling across the footpath and road edge.", category: "water", subcategory: "leak", status: "verified", lat: 17.4398, lng: 78.3798, locationLabel: "5th Cross, water main junction", safetyImpact: 3, peopleAffected: 4, accessibilityImpact: 3, durationDays: 9, confirms: 11, disputes: 0, ageDays: 9, aiDetected: "Water leak", aiConfidence: 0.78, aiPotentialIssue: "Continuous water discharge on roadway" },
      { title: "Sidewalk blocked by construction debris", description: "Renovation debris stacked across the only paved footpath — wheelchair users and strollers forced onto the road.", category: "accessibility", subcategory: "blocked_sidewalk", status: "reported", lat: 17.4463, lng: 78.3811, locationLabel: "Civic Center footpath", safetyImpact: 4, peopleAffected: 3, accessibilityImpact: 5, durationDays: 6, confirms: 9, disputes: 0, ageDays: 6, aiDetected: "Construction debris", aiConfidence: 0.84, aiPotentialIssue: "Pedestrian path obstruction detected" },
      { title: "Exposed wiring on utility pole", description: "Junction box hanging open with live wires exposed at child height near the school wall.", category: "electricity", subcategory: "exposed_wiring", status: "in_progress", lat: 17.4475, lng: 78.3789, locationLabel: "School Street utility pole #12", safetyImpact: 5, peopleAffected: 4, accessibilityImpact: 0, durationDays: 15, confirms: 19, disputes: 0, ageDays: 15, aiDetected: "Utility pole", aiConfidence: 0.74, aiPotentialIssue: "Exposed electrical wiring" },
      { title: "Broken manhole cover", description: "Half the cover is missing on the cycling lane. Hidden by rainwater in the evenings.", category: "roads", subcategory: "damaged_manhole", status: "reported", lat: 17.4425, lng: 78.3841, locationLabel: "Cycle track, Station Road", safetyImpact: 5, peopleAffected: 3, accessibilityImpact: 1, durationDays: 3, confirms: 5, disputes: 0, ageDays: 3, aiDetected: "Manhole", aiConfidence: 0.69, aiPotentialIssue: "Damaged or missing manhole cover" },
      { title: "Faded pedestrian crossing", description: "Zebra crossing almost invisible; cars rarely stop. Near the primary school entrance.", category: "roads", subcategory: "faded_crossing", status: "verified", lat: 17.4409, lng: 78.3834, locationLabel: "Primary school crossing, Park Ave", safetyImpact: 4, peopleAffected: 5, accessibilityImpact: 2, durationDays: 30, confirms: 22, disputes: 0, ageDays: 30, aiDetected: "Road marking", aiConfidence: 0.71, aiPotentialIssue: "Severely faded pedestrian crossing" },
      { title: "Fallen tree blocking cycle lane", description: "Branch came down in last week's storm, still not cleared. Cyclists merging into car lane.", category: "buildings", subcategory: "storm_damage", status: "resolved", lat: 17.4482, lng: 78.3802, locationLabel: "Greenway cycle lane", safetyImpact: 4, peopleAffected: 2, accessibilityImpact: 2, durationDays: 2, confirms: 6, disputes: 0, ageDays: 8, aiDetected: "Fallen tree", aiConfidence: 0.9, aiPotentialIssue: "Vegetation blocking pathway" },
      { title: "Broken railing on canal bridge", description: "Two-meter section of railing missing on the footbridge. Serious fall risk at night.", category: "buildings", subcategory: "broken_railing", status: "resolved", lat: 17.4389, lng: 78.3771, locationLabel: "Canal footbridge", safetyImpact: 5, peopleAffected: 3, accessibilityImpact: 2, durationDays: 10, confirms: 13, disputes: 0, ageDays: 18, aiDetected: "Bridge railing", aiConfidence: 0.76, aiPotentialIssue: "Damaged safety barrier" },
      { title: "Illegal dumping behind apartments", description: "Construction waste and furniture dumped in the service lane. Attracting pests.", category: "waste", subcategory: "illegal_dumping", status: "verified", lat: 17.4501, lng: 78.3837, locationLabel: "Service lane, Lake View Apartments", safetyImpact: 2, peopleAffected: 3, accessibilityImpact: 1, durationDays: 14, confirms: 10, disputes: 2, ageDays: 14 },
      { title: "Signal stuck on red", description: "Pedestrian signal never changes; people dash across 4 lanes against traffic.", category: "electricity", subcategory: "broken_signal", status: "community_verified", lat: 17.4467, lng: 78.3756, locationLabel: "Junction 7, ring road crossing", safetyImpact: 4, peopleAffected: 5, accessibilityImpact: 2, durationDays: 25, confirms: 31, disputes: 0, ageDays: 25 },
    ];

    for (const s of seeds) {
      const firstReportedAt = now - s.ageDays * day;
      const latestConfirmationAt = firstReportedAt + Math.min(s.ageDays, 2) * day;
      const resolvedAt =
        s.status === "resolved" || s.status === "community_verified"
          ? firstReportedAt + s.ageDays * day * 0.8
          : undefined;

      const priorityScore = computePriorityScore({
        safetyImpact: s.safetyImpact,
        peopleAffected: s.peopleAffected,
        accessibilityImpact: s.accessibilityImpact,
        durationDays: s.durationDays,
        confirms: s.confirms,
      });

      const issueId = await ctx.db.insert("issues", {
        issueNumber: 150 + seeds.indexOf(s) + 1,
        severity: severityFromScore(priorityScore),
        priorityScore,
        title: s.title,
        description: s.description,
        category: s.category,
        subcategory: s.subcategory,
        status: s.status,
        lat: s.lat,
        lng: s.lng,
        locationLabel: s.locationLabel,
        safetyImpact: s.safetyImpact,
        peopleAffected: s.peopleAffected,
        accessibilityImpact: s.accessibilityImpact,
        durationDays: s.durationDays,
        confirms: s.confirms,
        disputes: s.disputes,
        aiDetected: s.aiDetected,
        aiConfidence: s.aiConfidence,
        aiPotentialIssue: s.aiPotentialIssue,
        firstReportedAt,
        latestConfirmationAt,
        resolvedAt,
        ...(resolvedAt ? { resolvedByUserId: adminId } : {}),
        reportedByUserId: adminId,
        isDemo: true,
      });

      await ctx.db.insert("issueEvents", {
        issueId,
        userId: adminId,
        type: "reported",
        message: `Reported: ${s.title}`,
        createdAt: firstReportedAt,
      });

      if (s.status === "resolved" || s.status === "community_verified") {
        await ctx.db.insert("issueEvents", {
          issueId,
          userId: adminId,
          type: "resolved",
          message: "Marked as resolved",
          createdAt: resolvedAt!,
        });
      }
      if (s.status === "community_verified") {
        await ctx.db.insert("issueEvents", {
          issueId,
          userId: adminId,
          type: "resolution_verified",
          message: "Community verified the resolution",
          createdAt: resolvedAt! + day,
        });
      }
    }

    return { seeded: true, count: seeds.length };
  },
});

/**
 * Promote the current signed-in user to admin (Command Center access).
 * In a real deployment this would be an invite/allowlist flow.
 */
export const makeMeAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");
    if (user.role === "admin") return { already: true };
    await ctx.db.patch(userId, { role: "admin" });
    return { promoted: true };
  },
});

/** Only needed once: clear all issues (dev utility). */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Must be signed in.");
    for (const e of await ctx.db.query("issueEvents").collect()) {
      await ctx.db.delete(e._id);
    }
    for (const c of await ctx.db.query("confirmations").collect()) {
      await ctx.db.delete(c._id);
    }
    for (const i of await ctx.db.query("issues").collect()) {
      await ctx.db.delete(i._id);
    }
    return { cleared: true };
  },
});
