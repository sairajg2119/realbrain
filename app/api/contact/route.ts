import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { checkContact, ownerEmail, replyEmail } from "@/lib/contact";

// Nodemailer needs the Node runtime (not the edge). Every call is different, so nothing is cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The contact form's one endpoint.
 * 1. Check the fields. 2. Save a row in Supabase with the public (anon) key: Row-Level Security lets that key add rows and nothing else.
 * 3. Email the owner, and send the visitor an automatic reply. The row comes first, so a question is never lost if Gmail is down.
 * Secrets stay in .env.local / Vercel env vars: SUPABASE_URL, SUPABASE_ANON_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_OWNER_EMAIL.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "That didn't come through. Please try again." }, { status: 400 });
  }

  // A hidden field that people never see: if it is filled in, a bot sent this. Say thanks and do nothing.
  const trap = body && typeof body === "object" ? (body as Record<string, unknown>).website : undefined;
  if (typeof trap === "string" && trap.trim() !== "") {
    return NextResponse.json({ ok: true, saved: false, emailed: true });
  }

  const checked = checkContact(body);
  if (!checked.ok) return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
  const v = checked.value;

  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "The contact form isn't set up yet. Please try again later." }, { status: 503 });
  }

  // 1) Save the row. "return=minimal" matters: the anon key may insert but not read, so we must not ask for the row back.
  try {
    const res = await fetch(`${url}/rest/v1/contact_messages`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ name: v.name, email: v.email, message: v.message }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("contact: supabase insert failed", res.status, (await res.text()).slice(0, 300));
      return NextResponse.json({ ok: false, error: "We couldn't save your message just now. Please try again in a minute." }, { status: 502 });
    }
  } catch (e) {
    console.error("contact: supabase unreachable", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "We couldn't save your message just now. Please try again in a minute." }, { status: 502 });
  }

  // 2) Emails. If these fail the message is still saved, so we say so honestly.
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return NextResponse.json({ ok: true, saved: true, emailed: false });
  try {
    const mailer = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
    const owner = ownerEmail(v);
    const reply = replyEmail(v);
    const from = `RealBrain <${user}>`;
    const ownerAddress = process.env.CONTACT_OWNER_EMAIL?.trim() || user;
    await mailer.sendMail({ from, to: ownerAddress, replyTo: v.email, subject: owner.subject, text: owner.text, html: owner.html });
    await mailer.sendMail({ from, to: v.email, replyTo: ownerAddress, subject: reply.subject, text: reply.text, html: reply.html });
    return NextResponse.json({ ok: true, saved: true, emailed: true });
  } catch (e) {
    console.error("contact: email failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true, saved: true, emailed: false });
  }
}
