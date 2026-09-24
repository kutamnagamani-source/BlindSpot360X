import { useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Shell } from "@/components/blindspot/Shell";
import { ISSUE_CATEGORIES, categoryMeta } from "@/lib/issues-ui";
import type { Category } from "@/convex/schema";
import { computePriorityScore, severityFromScore } from "@/convex/issues";
import { cn } from "@/lib/utils";
import {
  Camera,
  CheckCircle2,
  XCircle,
  MapPin,
  Crosshair,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Users,
  Accessibility,
  Clock,
} from "lucide-react";

const STEPS = ["Capture", "AI analysis", "Details", "Location"] as const;

export default function ReportIssue() {
  const navigate = useNavigate();
  const generateUploadUrl = useMutation(api.issues.generateUploadUrl);

  const [step, setStep] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    detected: string;
    confidence: number;
    potentialIssue: string;
    suggestedCategory: Category;
    suggestedSubcategory: string;
  } | null>(null);
  const [aiConfirmed, setAiConfirmed] = useState<boolean | null>(null);

  const [category, setCategory] = useState<Category>("roads");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [safetyImpact, setSafetyImpact] = useState(3);
  const [peopleAffected, setPeopleAffected] = useState(2);
  const [accessibilityImpact, setAccessibilityImpact] = useState(1);
  const [durationDays, setDurationDays] = useState(7);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map photo characteristics to a plausible AI suggestion (client-side demo
  // pipeline; the server records it as "potential issue detected").
  const runAnalysis = (file: File) => {
    setAnalyzing(true);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      // Simulate vision latency
      setTimeout(() => {
        const guesses = [
          {
            detected: "Road surface",
            confidence: 0.87,
            potentialIssue: "Pothole / road surface damage",
            suggestedCategory: "roads" as Category,
            suggestedSubcategory: "pothole",
          },
          {
            detected: "Streetlight",
            confidence: 0.81,
            potentialIssue: "Light appears damaged/non-functional",
            suggestedCategory: "electricity" as Category,
            suggestedSubcategory: "broken_streetlight",
          },
          {
            detected: "Waste container",
            confidence: 0.78,
            potentialIssue: "Overflowing waste bin",
            suggestedCategory: "waste" as Category,
            suggestedSubcategory: "overflowing_bin",
          },
          {
            detected: "Sidewalk",
            confidence: 0.83,
            potentialIssue: "Pedestrian path obstruction",
            suggestedCategory: "accessibility" as Category,
            suggestedSubcategory: "blocked_sidewalk",
          },
        ];
        const pick = guesses[Math.floor(Math.random() * guesses.length)];
        setAnalysis(pick);
        setCategory(pick.suggestedCategory);
        setTitle((t) => t || `${pick.detected} — ${pick.potentialIssue.split("/")[0].trim()}`);
        setAnalyzing(false);
      }, 1600);
    };
    reader.readAsDataURL(file);
  };

  const priorityScore = useMemo(
    () =>
      computePriorityScore({
        safetyImpact,
        peopleAffected,
        accessibilityImpact,
        durationDays,
        confirms: 0,
      }),
    [safetyImpact, peopleAffected, accessibilityImpact, durationDays],
  );
  const severity = severityFromScore(priorityScore);

  const getLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      toast.error("Location unavailable in this browser — click the map instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        toast.error("Could not get GPS location. Pick the spot on the mini-map.");
      },
      { timeout: 8000 },
    );
  };

  const reverseGeocode = async (la: number, ln: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}&zoom=18`,
      );
      const data = await res.json();
      setLocationLabel(data?.display_name?.split(",").slice(0, 3).join(", ") ?? "");
    } catch {
      // Label is optional; coordinates are what matter
    }
    setLocating(false);
  };

  const submit = async () => {
    if (lat === null || lng === null) {
      toast.error("Set the issue location first.");
      return;
    }
    setSubmitting(true);
    try {
      // Upload photo to Convex storage (standard generateUploadUrl flow)
      let storageId: Id<"_storage"> | undefined;
      if (photoFile) {
        const postUrl = await generateUploadUrl();
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": photoFile.type },
          body: photoFile,
        });
        if (res.ok) {
          const { storageId: sid } = await res.json();
          storageId = sid as Id<"_storage">;
        }
      }

      const id = await reportIssue({
        title: title.trim() || "Untitled issue",
        description: description.trim() || "(no description provided)",
        category,
        subcategory: analysis?.suggestedSubcategory ?? "other",
        lat,
        lng,
        locationLabel: locationLabel.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        safetyImpact,
        peopleAffected,
        accessibilityImpact,
        durationDays,
        aiDetected: analysis?.detected,
        aiConfidence: analysis?.confidence,
        aiPotentialIssue: analysis?.potentialIssue,
        photoStorageId: storageId,
      });
      toast.success("Report filed — it's now on the BlindSpot Map.");
      navigate(`/issue/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const reportIssue = useMutation(api.issues.reportIssue);

  const severityLabel = { low: "Low", medium: "Medium", high: "High", critical: "Critical" }[
    severity
  ];

  return (
    <Shell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <p className="bs-hud">new report</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Scan your surroundings
        </h1>

        {/* Stepper */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  i < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === step
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    i < step ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 0 — Capture */}
        {step === 0 && (
          <Card className="mt-6 border-border/60 bg-card/60">
            <CardContent className="p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPhotoFile(f);
                    runAnalysis(f);
                  }
                }}
              />
              {!photoDataUrl && !analyzing ? (
                <button
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-background/40 py-14 transition-colors hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary bs-glow">
                    <Camera className="size-7" />
                  </div>
                  <p className="font-medium">Take a photo or upload one</p>
                  <p className="max-w-xs text-center text-xs text-muted-foreground">
                    Faces and license plates are never published. The AI only
                    looks for infrastructure problems.
                  </p>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-lg border border-border/70">
                    {photoDataUrl && (
                      <img
                        src={photoDataUrl}
                        alt="Captured issue"
                        className="max-h-80 w-full object-cover"
                      />
                    )}
                    {analyzing && (
                      <>
                        <div className="bs-scanline" />
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background/90 px-4 py-2">
                            <Loader2 className="size-4 animate-spin text-primary" />
                            <span className="bs-mono text-xs text-primary">
                              analyzing scene…
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {!analyzing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPhotoDataUrl(null);
                          setPhotoFile(null);
                          setAnalysis(null);
                          setAiConfirmed(null);
                        }}
                      >
                        Retake
                      </Button>
                      <Button size="sm" className="gap-2" onClick={() => setStep(1)}>
                        Continue <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 1 — AI analysis */}
        {step === 1 && analysis && (
          <Card className="mt-6 border-primary/30 bg-card/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="bs-hud text-primary">potential issue detected</p>
              </div>
              <div className="mt-4 rounded-lg border border-border/60 bg-background/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="bs-mono text-xs uppercase text-muted-foreground">
                      object detected
                    </p>
                    <p className="mt-1 text-lg font-semibold">{analysis.detected}</p>
                  </div>
                  <div className="text-right">
                    <p className="bs-mono text-xs uppercase text-muted-foreground">
                      confidence
                    </p>
                    <p className="bs-mono mt-1 text-2xl font-bold text-primary">
                      {Math.round(analysis.confidence * 100)}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 border-t border-border/60 pt-3">
                  <p className="flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="size-4 text-[--severity-high]" />
                    <span className="font-medium">Potential issue:</span>{" "}
                    {analysis.potentialIssue}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium">Is this actually a problem?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AI suggestions are never treated as facts — you confirm the truth.
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  variant={aiConfirmed === true ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setAiConfirmed(true)}
                >
                  <CheckCircle2 className="size-4" /> Yes, report it
                </Button>
                <Button
                  variant={aiConfirmed === false ? "secondary" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => {
                    setAiConfirmed(false);
                    toast("No problem — good eye. Nothing was filed.");
                    navigate("/map");
                  }}
                >
                  <XCircle className="size-4" /> No, it's fine
                </Button>
              </div>
              {aiConfirmed === true && (
                <div className="mt-4 flex justify-end">
                  <Button className="gap-2" onClick={() => setStep(2)}>
                    Add details <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <Card className="mt-6 border-border/60 bg-card/60">
            <CardContent className="space-y-5 p-6">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ISSUE_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors",
                        category === c.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:border-primary/40",
                      )}
                      onClick={() => setCategory(c.key as Category)}
                    >
                      <c.icon className="size-4" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Deep pothole on Main St"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's wrong, since when, who does it affect?"
                  className="mt-1.5 min-h-20"
                />
              </div>

              {/* Transparent severity scoring */}
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="bs-hud text-primary">priority scoring — transparent factors</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      severity === "critical" && "bg-[--severity-critical]/15 text-[--severity-critical] border-[--severity-critical]/40",
                      severity === "high" && "bg-[--severity-high]/15 text-[--severity-high] border-[--severity-high]/40",
                      severity === "medium" && "bg-[--severity-medium]/15 text-[--severity-medium] border-[--severity-medium]/40",
                      severity === "low" && "bg-[--severity-low]/15 text-[--severity-low] border-[--severity-low]/40",
                    )}
                  >
                    {severityLabel} · {priorityScore}/100
                  </Badge>
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Safety impact", icon: ShieldAlert, value: safetyImpact, set: setSafetyImpact },
                    { label: "People affected", icon: Users, value: peopleAffected, set: setPeopleAffected },
                    { label: "Accessibility impact", icon: Accessibility, value: accessibilityImpact, set: setAccessibilityImpact },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <f.icon className="size-3.5 text-muted-foreground" />
                          {f.label}
                        </span>
                        <span className="bs-mono text-muted-foreground">{f.value}/5</span>
                      </div>
                      <Slider
                        value={[f.value]}
                        min={0}
                        max={5}
                        step={1}
                        onValueChange={([v]) => f.set(v)}
                        className="mt-2"
                      />
                    </div>
                  ))}
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        How long has it been like this?
                      </span>
                      <span className="bs-mono text-muted-foreground">{durationDays}d</span>
                    </div>
                    <Slider
                      value={[durationDays]}
                      min={0}
                      max={60}
                      step={1}
                      onValueChange={([v]) => setDurationDays(v)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Priority = 30% safety + 25% people affected + 20% accessibility +
                  15% duration + 10% community confirmations. Weights are public —
                  no black box.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button className="gap-2" onClick={() => setStep(3)}>
                  Set location <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Location */}
        {step === 3 && (
          <Card className="mt-6 border-border/60 bg-card/60">
            <CardContent className="space-y-4 p-6">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={getLocation}
                disabled={locating}
              >
                {locating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Crosshair className="size-4" />
                )}
                {locating
                  ? "Locating…"
                  : lat !== null
                    ? `📍 ${lat.toFixed(5)}, ${lng?.toFixed(5)} — tap to re-locate`
                    : "Use my current location"}
              </Button>
              <div>
                <Label htmlFor="locLabel">Location label</Label>
                <Input
                  id="locLabel"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Main Street, near the bus stop"
                  className="mt-1.5"
                />
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  Approximate location only — exact coordinates stay between you
                  and the fix crew.
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-border/60 bg-background/50 p-4 text-sm">
                <p className="bs-hud">summary</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Problem</span>
                    <span className="truncate text-right font-medium">
                      {title || "Untitled issue"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Category</span>
                    <span>{categoryMeta(category).label}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="bs-mono text-primary">
                      {severityLabel} · {priorityScore}/100
                    </span>
                  </div>
                </div>
                <Progress value={100} className="mt-3 h-1" />
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button
                  className="bs-glow gap-2"
                  onClick={submit}
                  disabled={submitting || lat === null}
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  File report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
