# codexlegendtcg.site — positioning, structure, and build order

## 0. Before anything else: the "first ever" claim is not safe

The pitch is *"the first ever TCG in the Philippines, published and shared to
the world."* I went looking to confirm it and found prior Filipino card games
in the same space:

- **Lagim** — a collectible card game built on Filipino folklore and myth,
  Kickstarter-funded, covered in the press in 2021, with its own storefront
- **HIWAGA: Trading Card Game** — explicitly a Philippine-mythology TCG, with
  levelled cards (e.g. "Santelmo (Light) Level 1")
- **Let's Imagine** — released June 2025, described as the first Filipino-made
  *educational* TCG

I have not exhaustively verified release dates, and none of these is doing what
Codex Legends is doing. But "first ever" is the one claim on a launch site that
strangers *will* fact-check, and being publicly corrected on it costs more than
the claim ever earns.

**The good news: the honest version is stronger.** What is actually unique here
is not being first — it is the combination nobody else has:

> **A Philippine TCG you can play right now, in your browser, for free.**
> Built on the pre-colonial history of Luzon, the Visayas and Mindanao —
> the people, not just the monsters.

Every prior Filipino card game listed above is a **physical product**: a box, a
print run, a Kickstarter, shipping. Codex Legends is digital-first. That is a
real, defensible, checkable difference, and it is also the reason the site can
put a Play button where everyone else has a pre-order.

The second differentiator is subject matter. Lagim and Hiwaga are **folklore
and creatures** — aswang, santelmo. Codex Legends is **peoples and places**:
Agta, Maguindanao, Babaylan; Luzon, Visayas, Mindanao. "Philippine fictional
history, with myth woven through" is a genuinely different premise from
"Filipino monsters on cards", and the blog already proves you can write it.

Suggested line for the hero, in the spirit of Grand Archive's seven-word pitch:

> **A Philippine history TCG. Play it in your browser.**

---

## 1. What Grand Archive does, and what applies here

Their nav: *Getting Started · Articles · Champions · Game · Story · Events ·
Store Locator · Organized Play*.

**Worth taking:**

| What they do | Why it matters for Codex |
|---|---|
| **A one-line pitch in the hero** — "An anime TCG with western game design" | Says what it is and who it is for by naming a tension, in seven words. Yours is "Philippine history, playable now." |
| **Three pillars, each with a proof and a link** — Clean Design / Limitless Deckbuilding / Cards Worth Collecting | Not a feature list. Three reasons to care, each going somewhere. |
| **"Champions" is top-level nav** | Your five Legends are the face of the game and currently live in a carousel halfway down one page. |
| **"Story" is top-level nav** | For a game whose entire premise is Philippine history, this matters *more* for you than it does for them. |
| **Card database on its own subdomain** (`index.gatcg.com`) | The browser is a tool, not a marketing page. Different job, different place. |
| **Articles dated and current** — theirs are weeks old | Yours stopped in March 2025. Cadence is the whole value of a news page. |

**Worth deliberately NOT taking:** Store Locator, Organized Play, print-run
population counts, collector rarities, foil treatments. Every one of those
exists because Grand Archive is cardboard in a shop.

That is the useful insight: **about half of Grand Archive's navigation is
solving problems you do not have.** Being digital-only frees those slots — and
the loudest thing on your site should be the thing they physically cannot
offer, which is *play it now*.

---

## 2. The structure you proposed

*Home · Play · News/Blog · Mailing · Contact* — this is right. Notes on each:

### Home
Hero with the key art (the same five characters and logo now on the game's
title screen, so site and game read as one product) and the one-line pitch.
Then three pillars:

1. **Three archipelagos** — Luzon, Visayas, Mindanao, each linking to its deck.
   The cultural bullets already on the site are good; wire each to real cards.
2. **The Codex System** — your actual mechanical hook, and the thing no other
   Filipino card game has. Explain it with a card, not a paragraph.
3. **Meet the Legends** — the five characters, promoted out of the carousel.

Primary call to action: **Play**. Secondary: **Mailing list**.

### Play
The existing Vite build, deployed.

**Settled: the game lives at `game.codexlegendtcg.site`.** The two options
weighed here were `/play` on the apex domain — one deploy, one nav, no context
switch — and a subdomain, for cleaner separation and easier caching. The
subdomain won, so the two are deployed independently: this repo builds the
game, the `codexlegendtcg` checkout builds the site.

The cost of that split is the one this section originally argued against:
playing is the site's main verb, and it now sits behind a link to somewhere
else. So the apex site's Play call to action has to be unmissable, and the
game's own "back to site" link (`SITE_URL` in `src/ui/main.ts`) has to point
home — both directions of the hop are now real navigation.

This page should also carry a short "how to play" — first-time visitors need
about four sentences (break five Barriers, then land one more hit; Codex cards
switch your strategy mid-duel) before they click into a duel.

### News / Blog
Port the existing posts. They are the strongest asset on the current site and
they are what makes "Philippine history" a claim rather than a slogan. As
Markdown in-repo, with dates shown.

Two streams worth separating: **Lore/history** (the existing posts) and
**Development** (patch notes, balance changes, new decks). The second is nearly
free — we already generate balance data — and it is what makes a digital game
look alive in a way a physical one cannot.

### Mailing
One form, one promise. The current copy mentions a Kickstarter launch — if the
game is digital-only now, that copy needs revisiting, or people will sign up
expecting a box.

### Contact
Straightforward, but a real need for a digital game: bug reports. A second
subject line ("I found a bug") that routes somewhere you will actually read is
worth more than a generic form.

### One page you did not list
**Cards.** The existing site already has a card browser with the right filter
vocabulary (Action / Codex / Force / Unit, Lvl 0–3). It should not be dropped —
but see §3: it should be *generated*, not maintained.

---

## 3. Why this should live in this repo

The decisive reason is **one source of truth**.

The current card browser's contents are uploaded by hand, separately from the
**164 cards** this repo defines in `decks/*.json` with art in
`assets/cards/web`. Two sources for the same cards is exactly how the current
site ends up serving one card-back image under five different labels — "Card
Back", "Visayas Card", "Mindanao Card", "Codex Card Back".

Built here, the Cards page, the deck pages and the archipelago pillars are all
generated from the same data the game runs on. Rebalance a deck and the site is
correct on the next deploy.

It also means the marketing site and the playable game deploy together and
cannot drift apart — which matters much more for a digital-only game, because
the site is not advertising a product that exists elsewhere. It *is* the front
door to the product.

---

## 4. Build order

**Phase 1 — Play.** Deploy the existing build at `/play` and make it the
primary call to action. This is the change that converts the site from a
waitlist page into a game.

**Phase 2 — Home.** Key art hero, the honest one-line pitch, three pillars.
Kill the copy drift: the 2024 footer, "five souls" versus six characters, and
the Kickstarter framing if it no longer applies.

**Phase 3 — Cards, generated.** Same filters as today, contents from
`ALL_CARDS`, art from `assets/cards/web`, plus archipelago and Codex State.

**Phase 4 — News.** Port the posts to Markdown. Start the development stream —
the first post writes itself: what changed in the AI and why the deck win rates
moved.

**Phase 5 — Mailing, Contact, polish.** Hosted form endpoint, Open Graph tags
so shared links show the key art, responsive images (the game mat is currently
a 5400×3200 PNG on the critical path), Lighthouse pass.

~~Also: **`www.codexlegendtcg.site` does not resolve at all.**~~ Resolved, and
resolved the other way round than this expected: as of 2026-09-18 **`www` is
the canonical host** and the apex 308s to it. HTTPS is enforced and HSTS is set
(`max-age=63072000`). So anything naming this site — the canonical tag, the
sitemap, `SITE_URL` in the game — should say `www.codexlegendtcg.site`, not the
apex, or it spends a redirect on every visit.

---

## 5. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Astro | Ships zero JS by default; the game mounts as an island; can import `src/data/loader.ts` and render the card browser at build time |
| Hosting | Cloudflare Pages or Netlify | Free tier, deploy on push, per-branch previews |
| Forms | Netlify Forms / Formspree | Replaces the only real backend the builder provided |
| Content | Markdown in-repo | The docs already are this |
| Analytics | Plausible or Cloudflare | No cookie banner |

---

## 6. Still open

1. **Is the Kickstarter still happening?** Digital-only and "Kickstarter
   launch" pull in different directions, and the mailing copy currently
   promises the second.
2. **Who is the sixth character?** The key art has six; the site has five
   portraits and says "five souls". The title screen currently ships the five
   we have.
3. **Do you want to keep writing posts in a visual editor?** That is the one
   thing the page-builder genuinely does better than Markdown.
4. **Is there a name for the setting?** "Luzon, Visayas, Mindanao" is
   geography; Grand Archive sells a *world*. A named era or continent would
   give the Story page a spine.

---

## Sources

- [Grand Archive TCG](https://gatcg.com/) · [Grand Archive Index (card database)](https://index.gatcg.com/)
- [Lagim Card Game](https://lagimcardgame.com/) · [Lagim on Kickstarter](https://www.kickstarter.com/projects/fictionminds/lagim-card-game) · [Lagim coverage, Nolisoli](https://nolisoli.ph/92159/lagim-local-folklore-art-card-game-bn-ymagcamit-20210108/)
- [HIWAGA: Trading Card Game](https://valinojoshua2.wixsite.com/hiwagatcg)
- [Let's Imagine (CARDBERUS)](https://www.cardberus.com/lets-imagine/)
