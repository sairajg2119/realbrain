"use client";

import { useState } from "react";

type Phase = "idle" | "sending" | "sent" | "sent-no-mail" | "error";

/** "Ask us anything": name, email, question. It posts to /api/contact, which saves the row and sends both emails. */
export function ContactForm() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setPhase("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), message: data.get("message"), website: data.get("website") }),
      });
      const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; emailed?: boolean } | null;
      if (!res.ok || !out?.ok) {
        setError(out?.error ?? "Something went wrong. Please try again.");
        setPhase("error");
        return;
      }
      form.reset();
      setPhase(out.emailed === false ? "sent-no-mail" : "sent");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setPhase("error");
    }
  }

  if (phase === "sent" || phase === "sent-no-mail") {
    return (
      <div className="ct-done" role="status">
        <h3>Thank you. We got it.</h3>
        <p>
          {phase === "sent"
            ? "A person will read your question and write back. We've also sent a short note to your inbox, so you know it arrived. If you don't see it, check your spam folder."
            : "Your question is saved and a person will read it. The confirmation email didn't go out this time, but nothing is lost."}
        </p>
        <button type="button" className="fm-btn fm-ghost" onClick={() => setPhase("idle")}>Send another question</button>
      </div>
    );
  }

  return (
    <form className="ct-form" onSubmit={submit} noValidate>
      <label>
        <span>Your name</span>
        <input name="name" type="text" autoComplete="name" required maxLength={200} />
      </label>
      <label>
        <span>Your email</span>
        <input name="email" type="email" autoComplete="email" required maxLength={320} />
      </label>
      <label className="ct-wide">
        <span>Your question</span>
        <textarea name="message" rows={5} required maxLength={5000} />
      </label>
      {/* Hidden from people. Bots fill it in; the server ignores any message that has it. */}
      <input className="ct-hp" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {phase === "error" && <p className="ct-err" role="alert">{error}</p>}
      <div className="ct-wide">
        <button type="submit" className="fm-btn" disabled={phase === "sending"}>{phase === "sending" ? "Sending..." : "Send question"}</button>
      </div>
    </form>
  );
}
