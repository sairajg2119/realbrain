import test from "node:test";
import assert from "node:assert/strict";
import { checkContact, escapeHtml, oneLine, ownerEmail, replyEmail } from "./contact.ts";

const good = { name: "  Asha Rao ", email: "asha@example.com ", message: " Do you cover Whitefield? " };

test("a good form passes and is trimmed", () => {
  const r = checkContact(good);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.value, { name: "Asha Rao", email: "asha@example.com", message: "Do you cover Whitefield?" });
});

test("each missing or bad field gets its own message", () => {
  assert.match((checkContact({ ...good, name: " " }) as { error: string }).error, /name/i);
  assert.match((checkContact({ ...good, email: "not-an-email" }) as { error: string }).error, /email/i);
  assert.match((checkContact({ ...good, message: "" }) as { error: string }).error, /question/i);
  assert.match((checkContact({ ...good, message: "x".repeat(5001) }) as { error: string }).error, /long/i);
});

test("junk input does not crash", () => {
  assert.equal(checkContact(null).ok, false);
  assert.equal(checkContact("hello").ok, false);
  assert.equal(checkContact({ name: 5, email: [], message: {} }).ok, false);
});

test("emails with spaces, commas or angle brackets are refused", () => {
  for (const email of ["a b@x.com", "a@x.com, b@y.com", "<a@x.com>", "a@x"]) assert.equal(checkContact({ ...good, email }).ok, false, email);
});

test("html in a message is escaped and the words stay exact", () => {
  const v = { name: "A", email: "a@x.com", message: "<script>alert(1)</script> & \"quotes\"" };
  const m = ownerEmail(v);
  assert.ok(!m.html.includes("<script>"));
  assert.ok(m.html.includes(escapeHtml(v.message)));
  assert.ok(m.text.includes(v.message));
});

test("a name cannot add email headers through the subject", () => {
  assert.equal(oneLine("Asha\r\nBcc: x@y.com"), "Asha Bcc: x@y.com");
  assert.ok(!ownerEmail({ name: "A\r\nBcc: x@y.com", email: "a@x.com", message: "hi" }).subject.includes("\n"));
});

test("the auto-reply quotes the visitor and makes no promise of a date or money", () => {
  const m = replyEmail({ name: "Asha Rao", email: "a@x.com", message: "Do you cover Whitefield?" });
  assert.ok(m.text.startsWith("Hi Asha,"));
  assert.ok(m.text.includes("Do you cover Whitefield?"));
  assert.doesNotMatch(m.text, /refund|within \d|by (monday|tuesday|tomorrow)|free|discount/i);
});
