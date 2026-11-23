// The contact form: checking what a visitor sent, and writing the two emails. Pure functions, so they are easy to test.

export type ContactInput = { name: string; email: string; message: string };
export type ContactCheck = { ok: true; value: ContactInput } | { ok: false; error: string };

const EMAIL = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;

/** Trim and check the three fields. The limits match the table in supabase/contact_messages.sql. */
export function checkContact(raw: unknown): ContactCheck {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!name) return { ok: false, error: "Please tell us your name." };
  if (name.length > 200) return { ok: false, error: "That name is a bit long. Please shorten it." };
  if (!email || email.length > 320 || !EMAIL.test(email)) return { ok: false, error: "That email address doesn't look right. Please check it." };
  if (!message) return { ok: false, error: "Please write your question." };
  if (message.length > 5000) return { ok: false, error: "That message is too long. Please keep it under 5,000 characters." };
  return { ok: true, value: { name, email, message } };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Names go into an email subject: no line breaks, so nobody can add headers. */
export function oneLine(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").trim().slice(0, 80);
}

type Mail = { subject: string; text: string; html: string };

/** To the website owner: who wrote, and exactly what they wrote. The visitor's words are never changed. */
export function ownerEmail(v: ContactInput): Mail {
  return {
    subject: `New question from ${oneLine(v.name)}`,
    text: `${v.name} (${v.email}) wrote:\n\n${v.message}\n\nReply to this email to answer them.`,
    html: `<p><strong>${escapeHtml(v.name)}</strong> (<a href="mailto:${escapeHtml(v.email)}">${escapeHtml(v.email)}</a>) wrote:</p><blockquote style="margin:0;padding:8px 16px;border-left:3px solid #c7a56b;white-space:pre-wrap">${escapeHtml(v.message)}</blockquote><p>Reply to this email to answer them.</p>`,
  };
}

/** To the visitor, straight away. Warm and plain. It makes no promise of a date, a price or an outcome. */
export function replyEmail(v: ContactInput): Mail {
  const first = oneLine(v.name).split(" ")[0] || "there";
  return {
    subject: "We got your question - RealBrain",
    text: `Hi ${first},\n\nThanks for writing to RealBrain. We got your message and a person will read it and write back to you.\n\nHere is what you sent us:\n\n${v.message}\n\nThis is an automatic reply, so you don't need to answer it.\n\nThe RealBrain team`,
    html: `<p>Hi ${escapeHtml(first)},</p><p>Thanks for writing to RealBrain. We got your message and a person will read it and write back to you.</p><p>Here is what you sent us:</p><blockquote style="margin:0;padding:8px 16px;border-left:3px solid #c7a56b;white-space:pre-wrap">${escapeHtml(v.message)}</blockquote><p>This is an automatic reply, so you don't need to answer it.</p><p>The RealBrain team</p>`,
  };
}
