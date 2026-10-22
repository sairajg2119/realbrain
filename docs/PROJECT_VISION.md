# RealBrain: vision

**Status of this document:** product direction (plan), not a description of what is built. See ROADMAP.md for status.

## One line
An AI agent that reads a real estate project's brochure, writes reel scripts backed by evidence from top-performing real estate reels, checks them against RERA and the brochure, and turns the approved script into an AI avatar video. No shoot, no agency.

## Who it is for
Founders and marketing heads of mid-size residential developers in Bengaluru (about 2 to 10 active projects) with no in-house content team. Some staff are older and not comfortable with technology, so ease of use decides adoption. (From founder research; five conversations, willingness to pay untested.)

## Why it is different
HeyGen and similar tools render a script you already wrote. RealBrain decides what to say and why, with the evidence visible, and refuses to publish numbers that are not in the brochure. A content strategist first, a camera second.

## The product is five intelligence layers plus an app
1. **Social intelligence:** what works and fails on Instagram real estate, with evidence. (Stage 1, built from 487 reels.)
2. **Real estate and compliance knowledge:** RERA, Karnataka rules, advertising requirements, documentation, localities. (Stage 2, drafts only today.)
3. **Project and buyer intelligence:** brochure facts, buyer types, factual validation. (Partly built in the MVP.)
4. **Script generation and checking:** retrieval of hooks and evidence, generation, plain-code checks. (MVP works.)
5. **Video creation:** avatar render with a mandatory AI label. (Not built.)

The application (frontend, backend, storage, workflows) is built around these layers, using them as live inputs.

## Principles
- Evidence over opinion. Every playbook rule points to reels; every compliance rule points to a source.
- Honest about limits. Simulated or unfinished parts are labelled in the UI and the docs.
- Human decides. The developer approves every script (RERA Section 12 liability).
- Code checks what code can check. Pass/fail rules are code, not model output.
- One product. Nothing is researched that the app cannot eventually use.

## Out of scope for now
Instagram auto-posting, accounts and logins, Kannada or Hindi voice, automated weekly refresh.
