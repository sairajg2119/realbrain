// Rule-based creative classification from caption + transcript only.
// No video is watched here. Every record states its basis so downstream code never overclaims.

export function openingLine(transcript: string | null, caption: string | null): { text: string | null; source: "transcript" | "caption" | null } {
  if (transcript && transcript.trim()) {
    const first = transcript.trim().split(/(?<=[.!?])\s+/)[0];
    return { text: first.slice(0, 200), source: "transcript" };
  }
  if (caption && caption.trim()) {
    const first = caption.trim().split(/\n+/)[0];
    return { text: first.slice(0, 200), source: "caption" };
  }
  return { text: null, source: null };
}

const MONEY = /([$₹€£]\s?\d)|(\d[\d,.]*\s?(million|billion|crore|crores|cr\b|lakh|lakhs|lac\b|k\b|m\b))/i;

export type HookType =
  | "bold_money_number" | "pattern_interrupt_question" | "audience_callout" | "place_transformation"
  | "curiosity_superlative" | "rare_feature" | "confession_insider" | "list_promise"
  | "relatable_humour" | "question" | "plain_listing" | "announcement" | "other" | "unknown";

export function classifyHook(text: string | null): HookType {
  if (!text) return "unknown";
  const t = text.toLowerCase();
  if (MONEY.test(text)) return "bold_money_number";
  if (/first[- ]time (home)?buyer|stop scrolling|if you('re| are)|calling all|attention |are you (a|an|looking)|looking to (buy|sell)/.test(t)) return "audience_callout";
  if (/\b(what the|why (are|is|did|would)|wait,|hold on|is that)\b.*\?|^(wait|stop)\b/.test(t)) return "pattern_interrupt_question";
  if (/transform|then and now|changing|before and after|used to be|massive|unrecognis|unrecogniz/.test(t)) return "place_transformation";
  if (/\bsecret\b|nobody tells|nobody talks|confess|truth about|honest|insider|what (agents|brokers|developers) (won't|don't)/.test(t)) return "confession_insider";
  if (/\b(top|best)\s+(\d|three|four|five|seven|ten)|\bhere are (the )?(\d|three|four|five|seven|ten)|\b(\d+|three|four|five|seven|ten) (tips|ways|things|mistakes|reasons|questions|places)/.test(t)) return "list_promise";
  if (/rarely seen|you (almost )?never see|one of a kind|only (one|home|project|property)|feature (rarely|you)/.test(t)) return "rare_feature";
  if (/craziest|most (stunning|incredible|exclusive|beautiful|unique|expensive)|largest|biggest|world'?s|jaw|unbelievable|insane|dream (home|property)|crown jewel|stunning/.test(t)) return "curiosity_superlative";
  if (/😂|😭|🤣|\bpov\b|prank|when your|me when|\bjoke\b|funny/.test(t)) return "relatable_humour";
  if (/just (listed|sold)|new listing|now available|presenting|introducing|excited to (announce|share)|announcement|open house|launch/.test(t)) return "announcement";
  if (/\d\s?(bed|bhk|bath|sq\.? ?ft|sqft)|bedroom|bathroom|for sale|square feet|\bacres?\b|villa|apartment|located (in|at)|up for sale/.test(t)) return "plain_listing";
  if (t.includes("?")) return "question";
  return "other";
}

export type CtaType =
  | "comment_keyword" | "direct_message" | "save" | "share" | "follow" | "book_site_visit"
  | "request_information" | "link_or_website" | "phone_number" | "ask_question" | "none_visible";

/** A reel can carry several CTAs. The first entry is the strongest by the order below. */
export function classifyCtas(caption: string | null, transcript: string | null): { types: CtaType[]; keyword: string | null } {
  const c = `${caption ?? ""}\n${transcript ?? ""}`;
  const t = c.toLowerCase();
  const types: CtaType[] = [];
  let keyword: string | null = null;
  const kw = /comment\s+(?:the\s+word\s+|word\s+)?["“'‘]?([A-Za-z0-9]{3,20})["”'’]?/i.exec(c);
  if (kw && !/comment (below|your|and|if|on|down)\b/i.test(kw[0])) { types.push("comment_keyword"); keyword = kw[1].toUpperCase(); }
  if (/\bdm\b|direct message|message me|text me|inbox me/.test(t)) types.push("direct_message");
  if (/site visit|book a (visit|tour|showing|call)|schedule a (visit|tour|showing|call)|book your/.test(t)) types.push("book_site_visit");
  if (/\bsave (this|it)\b|save for later|bookmark/.test(t)) types.push("save");
  if (/send this to|share (this|it) with|tag (a|someone|your)|share with someone/.test(t)) types.push("share");
  if (/follow (for|me|us|@)|follow along|part \d/.test(t)) types.push("follow");
  if (/(brochure|price list|floor ?plan|details|more info|information)\b.*\b(dm|comment|link|call)|\bfor more (info|details)/.test(t)) types.push("request_information");
  if (/link in bio|bio link|www\.|https?:\/\/|\.com\b/.test(t)) types.push("link_or_website");
  if (/(\+?\d[\d\s().-]{8,}\d)/.test(c) && /call|whatsapp|contact|phone|reach|\+91|\+971|\+1/i.test(c)) types.push("phone_number");
  if (/let me know|what do you think|tell me|comment below|which (one|would)|guess/.test(t)) types.push("ask_question");
  if (types.length === 0) types.push("none_visible");
  return { types, keyword };
}

export type FormatType =
  | "construction_or_development" | "walkthrough_or_tour" | "interview_or_conversation" | "humour_or_skit"
  | "education_or_advice" | "market_commentary" | "listing_announcement" | "lifestyle_or_story" | "other";

export function classifyFormat(caption: string | null, transcript: string | null, hashtags: string[] = []): FormatType {
  const t = `${caption ?? ""} ${transcript ?? ""} ${hashtags.join(" ")}`.toLowerCase();
  if (/construction|groundbreaking|crane|foundation|concrete|topping out|under construction|site progress|excavation|skyscraper|tower build/.test(t)) return "construction_or_development";
  if (/prank|skit|\bpov\b|😂|🤣|😭|funny|joke|humor|humour|meme|parody/.test(t)) return "humour_or_skit";
  if (/interview|sat down with|in conversation|podcast|asked (him|her|them)|\bguest\b/.test(t)) return "interview_or_conversation";
  if (/how to|tips|mistakes|guide|learn|explained|what you need to know|things to know|advice|first[- ]time buyer/.test(t)) return "education_or_advice";
  if (/market (update|report|is|has)|interest rates?|mortgage|inventory|prices? (are|have|dropped|rose)|housing market|appreciation|rental yield/.test(t)) return "market_commentary";
  if (/walkthrough|walk[- ]through|tour|inside|step inside|behind (these|the) doors|let'?s (look|go|see)|take a look/.test(t)) return "walkthrough_or_tour";
  if (/just (listed|sold)|new listing|for sale|offered at|listed (at|for)|bedroom|bath|sq\.? ?ft|presented by|now available|launch/.test(t)) return "listing_announcement";
  if (/family|home|love|dream|life|memories|moving|neighbou?rhood|community|story/.test(t)) return "lifestyle_or_story";
  return "other";
}

export interface WeakOpeningFlags {
  starts_with_project_or_spec: boolean;
  presenting_style: boolean;
  spec_line: boolean;
  phone_only_cta: boolean;
  no_visible_cta: boolean;
  caption_very_short: boolean;
  long_runtime: boolean;
}

export function weakOpeningFlags(opening: string | null, ctaTypes: CtaType[], caption: string | null, durationS: number | null): WeakOpeningFlags {
  const o = (opening ?? "").toLowerCase();
  const spec = /\d\s?(bed|bhk|bath|sq\.? ?ft|sqft)|\bbhk\b|starting (at|from)|\bsq\.? ?ft\b|\d+(\.\d+)?\s?acres?/.test(o);
  return {
    spec_line: spec,
    presenting_style: /^(presenting|introducing|welcome to|announcing|new launch|upcoming|just launched)/.test(o),
    starts_with_project_or_spec: spec || /^[A-Z][\w&'’ ]{2,40}\s?[|\-–:]/.test(opening ?? ""),
    phone_only_cta: ctaTypes.length === 1 && ctaTypes[0] === "phone_number",
    no_visible_cta: ctaTypes.length === 1 && ctaTypes[0] === "none_visible",
    caption_very_short: !caption || caption.trim().length < 40,
    long_runtime: durationS !== null && durationS >= 90,
  };
}
