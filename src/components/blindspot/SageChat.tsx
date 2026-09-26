import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "model"; text: string };

const SUGGESTIONS = [
  "How do I report an issue?",
  "How does the priority score work?",
  "What does community_verified mean?",
];

/**
 * SAGE — BlindSpot360's floating assistant orb.
 * Gemini-powered, strictly scoped to BlindSpot360 + civic-infrastructure topics.
 */
export function SageChat() {
  const askSage = useAction(api.sage.chat);

  const [open, setOpen] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "model",
      text: "Hi, I'm SAGE — your BlindSpot360 guide. Ask me how to report issues, how priority scoring works, or anything about tracking infrastructure problems.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  const speak = (text: string) => {
    if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch {
      // voice is best-effort
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const history: Msg[] = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await askSage({
        message: trimmed,
        history: history
          .slice(0, -1)
          .slice(-8)
          .map((m) => ({ role: m.role, text: m.text })),
      });
      setMessages((prev) => [...prev, { role: "model", text: res.reply }]);
      speak(res.reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SAGE is unavailable right now.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* ─── Chat panel ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bs-glass flex h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border/70 shadow-2xl shadow-black/40"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
              <span
                className={cn(
                  "sage-orb sage-orb-mini",
                  loading && "sage-thinking",
                )}
                aria-hidden
              >
                <span className="sage-eye sage-eye-l" />
                <span className="sage-eye sage-eye-r" />
                <span className="sage-mouth" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-none tracking-tight">SAGE</p>
                <p className="bs-mono mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {loading ? "thinking…" : "blindspot360 assistant"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close SAGE"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary/20 text-foreground"
                      : "bg-background/70 text-foreground/90",
                  )}
                >
                  {m.text}
                </div>
              ))}
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
                  {error}
                </div>
              )}
              {loading && (
                <div className="flex w-16 items-center gap-1.5 rounded-xl bg-background/70 px-3 py-3">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: `${d * 0.12}s` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] text-primary transition-colors hover:bg-primary/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form
              className="flex items-center gap-2 border-t border-border/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about BlindSpot360…"
                maxLength={500}
                className="h-9 flex-1"
                aria-label="Message SAGE"
              />
              <Button
                type="submit"
                size="icon"
                className="size-9 shrink-0"
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Voice chip ─── */}
      <button
        onClick={() => setVoiceOn((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-emerald-300/50 bg-emerald-900/80 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-50 shadow-lg shadow-emerald-900/30 backdrop-blur transition-colors hover:bg-emerald-800/80"
        aria-label={voiceOn ? "Turn voice replies off" : "Turn voice replies on"}
      >
        {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
        {voiceOn ? "VOICE ON" : "VOICE OFF"}
      </button>

      {/* ─── Orb ─── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close SAGE chat" : "Open SAGE chat"}
        className="group relative flex flex-col items-center gap-1.5"
      >
        <span className="sage-ring" aria-hidden />
        <span className={cn("sage-orb", loading && "sage-thinking")} aria-hidden>
          <span className="sage-eye sage-eye-l" />
          <span className="sage-eye sage-eye-r" />
          <span className="sage-mouth" />
        </span>
        <span className="bs-mono text-[11px] font-bold tracking-[0.2em] text-emerald-200/90">
          SAGE
        </span>
      </button>
    </div>
  );
}
