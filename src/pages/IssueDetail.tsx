import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { IssueDot } from "@/components/blindspot/IssueDot";
import { Shell } from "@/components/blindspot/Shell";
import {
  STATUS_META,
  SEVERITY_META,
  LIFECYCLE_STEPS,
  categoryMeta,
  formatDate,
  timeAgo,
} from "@/lib/issues-ui";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  MapPin,
  Camera,
  ShieldCheck,
  Sparkles,
  Wrench,
  ClipboardCheck,
  MessageSquare,
  Send,
} from "lucide-react";
import type { Severity } from "@/convex/schema";

export default function IssueDetail() {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();

  const issue = useQuery(api.issues.getIssue, {
    issueId: issueId as Id<"issues">,
  });

  const confirmIssue = useMutation(api.issues.confirmIssue);
  const disputeIssue = useMutation(api.issues.disputeIssue);
  const addComment = useMutation(api.issues.addComment);
  const updateStatus = useMutation(api.issues.updateStatus);
  const verifyResolution = useMutation(api.issues.verifyResolution);
  const generateUploadUrl = useMutation(api.issues.generateUploadUrl);

  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (issue === undefined) {
    return (
      <Shell sceneVariant="detail">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </Shell>
    );
  }

  if (issue === null) {
    return (
      <Shell sceneVariant="detail">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="text-lg font-semibold">Issue not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been removed.
          </p>
          <Button className="mt-6" onClick={() => navigate("/map")}>
            Back to the map
          </Button>
        </div>
      </Shell>
    );
  }

  const catMeta = categoryMeta(issue.category);
  const statusMeta = STATUS_META[issue.status];
  const sevMeta = SEVERITY_META[issue.severity];
  const isResolved = issue.status === "resolved" || issue.status === "community_verified";

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await confirmIssue({ issueId: issue._id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm.");
    } finally {
      setBusy(false);
    }
  };

  const handleDispute = async () => {
    setBusy(true);
    try {
      await disputeIssue({ issueId: issue._id });
      toast("Disputed — a moderator will re-check this report.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispute.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<Id<"_storage"> | undefined> => {
    const postUrl = await generateUploadUrl();
    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) return undefined;
    const { storageId } = await res.json();
    return storageId as Id<"_storage">;
  };

  const handleResolve = async (file?: File) => {
    setBusy(true);
    try {
      let resolvedPhotoStorageId: Id<"_storage"> | undefined;
      if (file) {
        resolvedPhotoStorageId = await uploadPhoto(file);
      }
      await updateStatus({
        issueId: issue._id,
        status: "resolved",
        resolvedPhotoStorageId,
      });
      toast.success("Marked resolved — the community can now verify it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyResolution = async () => {
    setBusy(true);
    try {
      await verifyResolution({ issueId: issue._id });
      toast.success("Resolution verified. Thanks for closing the loop!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify.");
    } finally {
      setBusy(false);
    }
  };

  const advanceStatus = async () => {
    setBusy(true);
    try {
      const next =
        issue.status === "verified"
          ? "in_progress"
          : issue.status === "reported"
            ? "verified"
            : null;
      if (!next) return;
      await updateStatus({ issueId: issue._id, status: next });
      toast(`Status updated: ${STATUS_META[next].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/map"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to map
        </Link>

        {/* Header */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bs-mono text-sm text-muted-foreground">
                ISSUE #{issue.issueNumber}
              </span>
              <Badge variant="outline" className={statusMeta.bg + " " + statusMeta.color}>
                {statusMeta.label}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {issue.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <catMeta.icon className="size-4" /> {catMeta.label}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {issue.locationLabel}
              </span>
              <span className="bs-mono text-xs">
                {issue.lat.toFixed(5)}°, {issue.lng.toFixed(5)}°
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="bs-hud">priority score</span>
            <span
              className="bs-mono text-4xl font-extrabold leading-none"
              style={{ color: sevMeta.hex }}
            >
              {issue.priorityScore}
            </span>
            <span className="bs-mono text-xs text-muted-foreground">
              /100 · {sevMeta.label}
            </span>
          </div>
        </div>

        {/* Lifecycle tracker */}
        <Card className="mt-6 bs-glass border-0">
          <CardContent className="p-5">
            <div className="flex items-center">
              {LIFECYCLE_STEPS.map((s, i) => {
                const meta = STATUS_META[s];
                const done = i <= statusMeta.step;
                return (
                  <div key={s} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full border-2 text-xs",
                          done ? "border-transparent" : "border-border bg-muted",
                        )}
                        style={done ? { background: meta.hex } : undefined}
                      >
                        {done && <CheckCircle2 className="size-4 text-background" />}
                      </div>
                      <span
                        className={cn(
                          "hidden text-center text-[10px] leading-tight sm:block",
                          done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {i < LIFECYCLE_STEPS.length - 1 && (
                      <div
                        className="mx-1 h-0.5 flex-1 rounded"
                        style={{
                          background:
                            i < statusMeta.step ? meta.hex : "var(--border)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Photo / before-after */}
            <Card className="bs-glass border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="size-4 text-primary" /> Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {issue.photoUrl ? (
                  <img
                    src={issue.photoUrl}
                    alt="Issue"
                    className="w-full rounded-lg border border-border/60 object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 text-sm text-muted-foreground">
                    No photo attached
                  </div>
                )}
                {isResolved && issue.resolvedPhotoUrl && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm">
                      <span className="bs-hud">before</span>
                      <div className="h-px flex-1 bg-border" />
                      <span className="bs-hud text-primary">after</span>
                    </div>
                    <img
                      src={issue.resolvedPhotoUrl}
                      alt="After resolution"
                      className="w-full rounded-lg border border-primary/40 object-cover"
                    />
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                      <Sparkles className="size-3.5" />
                      Resolution documented — verified by the community.
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleResolve(f);
                  }}
                />
                {issue.status === "in_progress" && (
                  <Button
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <CheckCircle2 className="size-4" /> Mark resolved (add after-photo)
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="bs-glass border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="leading-relaxed">{issue.description}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ["Safety impact", `${issue.safetyImpact}/5`],
                    ["People affected", `${issue.peopleAffected}/5`],
                    ["Accessibility impact", `${issue.accessibilityImpact}/5`],
                    ["Ongoing for", `${issue.durationDays} days`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded border border-border/50 bg-background/40 px-2.5 py-1.5"
                    >
                      <span className="text-muted-foreground">{k}</span>
                      <span className="bs-mono">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reported by {issue.reporterName} · {formatDate(issue.firstReportedAt)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* AI panel */}
            {issue.aiDetected && (
              <Card className="bs-glass border border-primary/25">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-primary" /> AI analysis
                  </CardTitle>
                  <CardDescription>proposes, never decides</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Detected</span>
                    <span className="font-medium">{issue.aiDetected}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="bs-mono text-primary">
                      {issue.aiConfidence
                        ? `${Math.round(issue.aiConfidence * 100)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Potential issue</span>
                    <span className="text-right">{issue.aiPotentialIssue}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Community verification */}
            <Card className="bs-glass border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-primary" /> Community verification
                </CardTitle>
                <CardDescription>
                  Confirm what you've seen with your own eyes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                    <ThumbsUp className="size-4 text-primary" />
                    <span className="bs-mono font-bold">{issue.confirms}</span>
                    <span className="text-xs text-muted-foreground">still there</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                    <ThumbsDown className="size-4 text-muted-foreground" />
                    <span className="bs-mono font-bold">{issue.disputes}</span>
                    <span className="text-xs text-muted-foreground">disputed</span>
                  </div>
                </div>

                {!isResolved ? (
                  <div className="flex gap-2">
                    <Button
                      variant={issue.hasConfirmed ? "secondary" : "default"}
                      className="flex-1 gap-2"
                      onClick={handleConfirm}
                      disabled={busy}
                    >
                      <ThumbsUp className="size-4" />
                      {issue.hasConfirmed ? "Confirmed ✓" : "Confirm — still present"}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleDispute}
                      disabled={busy}
                    >
                      <ThumbsDown className="size-4" /> Dispute
                    </Button>
                  </div>
                ) : (
                  issue.status === "resolved" && (
                    <Button
                      className="w-full gap-2"
                      onClick={handleVerifyResolution}
                      disabled={busy}
                    >
                      <ClipboardCheck className="size-4" />
                      I've seen it fixed — verify resolution
                    </Button>
                  )
                )}

                {/* Ops advance controls */}
                {(issue.status === "reported" || issue.status === "verified") && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={advanceStatus}
                    disabled={busy}
                  >
                    <Wrench className="size-4" />
                    {issue.status === "verified"
                      ? "Start repair (mark in progress)"
                      : "Move to verified"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bs-glass border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-4 text-primary" /> Activity & discussion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Comment composer */}
                <form
                  className="flex gap-2"
                  onSubmit={async (e: FormEvent) => {
                    e.preventDefault();
                    if (!comment.trim()) return;
                    setBusy(true);
                    try {
                      await addComment({ issueId: issue._id, body: comment });
                      setComment("");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to comment.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Input
                    value={comment}
                    onChange={(ev) => setComment(ev.target.value)}
                    placeholder="Add context, status notes, or questions…"
                    maxLength={2000}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={busy || !comment.trim()}>
                    <Send className="size-4" />
                  </Button>
                </form>
                {issue.events.map((e) => (
                  <div key={e._id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {e.type === "comment" ? (
                        <div className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <MessageSquare className="size-3" />
                        </div>
                      ) : (
                        <IssueDot
                          severity={
                            e.type === "resolved" || e.type === "resolution_verified"
                              ? "low"
                              : (issue.severity as Severity)
                          }
                          size={8}
                        />
                      )}
                      <div className="mt-1 w-px flex-1 bg-border" />
                    </div>
                    <div className="pb-1">
                      {e.type === "comment" && e.authorName && (
                        <p className="text-xs font-medium text-primary">{e.authorName}</p>
                      )}
                      <p className="text-sm">{e.message}</p>
                      <p className="bs-mono mt-0.5 text-xs text-muted-foreground">
                        {timeAgo(e.createdAt)}
                        {e.type === "comment" ? " · via app" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
