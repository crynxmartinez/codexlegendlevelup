# Analytics — what is measured, and what is worth measuring

Two destinations:

| Host | Repo | Reports to |
|---|---|---|
| `www.codexlegendtcg.site` | `codexlegendtcg` | `G-J7VGJMV6LX` |
| `game.codexlegendtcg.site` | this repo | `G-Z1ZHSR40HH` **and** `G-J7VGJMV6LX` |

The game sends to both, from a single `gtag.js` loader with two `config`
lines. That is the supported way to report to more than one property — the
warning on Google's install screen is about two *loaders* on one page, which
would be two copies of the library fighting over the same dataLayer.

`G-Z1ZHSR40HH` is the game's own property: everything that happens in the
client, uncontaminated by marketing traffic. `G-J7VGJMV6LX` is the shared one
and the only reason the funnel below can be drawn at all — it is what makes a
visitor who presses Play on the site the same person who starts a duel here.
Remove that line and steps 1–3 stop connecting to steps 4–5.

## Do this in the GA admin, or the rest is wrong

The snippet does not stitch the two hosts together on its own. Until both
domains are listed under **Admin → Data Streams → the web stream → Configure
tag settings → Configure your domains**, GA4 counts one person who clicks Play
as **two sessions on two sites**, and the marketing site's bounce rate reads as
100% because every visitor "leaves".

Add `codexlegendtcg.site` and `game.codexlegendtcg.site` there. It is a
two-minute job and nothing below is trustworthy without it.

This applies to the **shared** property `G-J7VGJMV6LX` only. `G-Z1ZHSR40HH`
sees one host and has nothing to stitch.

## What is measured today

One `page_view` per host. That is all.

It answers "how many people arrived" and nothing else. In particular the game
is a **single page that swaps screens** — the title screen, deck builder,
tutorial and duel are all the same URL — so GA currently cannot tell a visitor
who bounced off the title screen from one who played four matches.

## The gap that matters

The question this project actually needs answered is not *how many visitors*.
It is:

> Of the people who load the game, how many start a duel, how many finish one,
> and who wins?

That last clause is worth more than the rest put together. Set 1's three decks
have never had balance measured — the suite's balance test still plays the
legacy three. Real win rates from real matches, free, is the cheapest balance
telemetry available.

## The funnel to build

Five steps. Each one is a number you can act on.

| # | Step | Event | Where |
|---|---|---|---|
| 1 | Landed on the site | `page_view` | site — done |
| 2 | Pressed Play | `play_click` | site, on the `[data-play]` buttons |
| 3 | Game loaded | `page_view` | game — done |
| 4 | Started a duel | `duel_start` | game, after Persona + Codex are chosen |
| 5 | Finished it | `duel_end` | game, at `showWinner()` |

The drop between 2 and 3 is broken links or a slow load. Between 3 and 4 is the
setup screens asking too much. Between 4 and 5 is the duel itself losing people,
and that is the one worth watching week to week.

### Event parameters

Keep them few and never personal. GA4 allows 25 params per event, but each one
you want to *report on* has to be registered as a custom dimension in Admin →
Custom definitions, and the free tier caps those at 50.

```
duel_start   deck, persona, codex, opponent_deck, mode      (mode: ai | tutorial | hotseat)
duel_end     result, reason, turns, seconds, deck, opponent_deck
             result: win | loss
             reason: barrier | deckout | surrender
screen_view  screen_name                                     (title | decks | duel | replays | tutorial)
tutorial_end lesson, completed
```

`deck` and `opponent_deck` on `duel_end` are what turn this into balance data:
group by the pair, read the win rate.

## How to implement it

**Screens.** `screen()` in `src/ui/main.ts` is already the single choke point —
every setup screen is built through it. Give it a name:

```ts
function screen(name: ScreenName): HTMLElement { ... }
```

and it reports itself. There are about ten call sites. The duel is the
exception: it does not go through `screen()`, so `BoardUI.run()` reports that
one directly.

**A module of its own.** `src/ui/analytics.ts`, so that nothing else has to
know whether a tag is present:

- one `track(event, params)` that no-ops when `window.gtag` is undefined —
  which is the case in every test, in the demo reel on the marketing site, and
  for anyone running an ad blocker, and none of those should throw;
- never send anything a player typed. Deck *names* are ours; a custom deck the
  player named is theirs.

**Do not do it yet in `main.ts`.** That file currently carries a large amount of
uncommitted work from other streams. Ten call-site edits on top of that is a
merge conflict waiting to happen. This lands cleanly once that work is in.

## What to look at once it runs

- **Realtime** for the first day, to confirm both hosts report.
- **Reports → Engagement → Events** for the raw counts.
- **Explore → Funnel exploration** for the five steps above. This is the view
  worth building once and keeping.
- **Explore → Free form**, `duel_end` broken down by `deck` × `opponent_deck` ×
  `result`. That is the balance table.

Give it a fortnight before reading anything into the numbers. A play-test
audience is small and a single shared link can swamp a week.

## Privacy

GA4 sets a first-party cookie. Neither the site nor the game says so anywhere,
and there is no privacy page. Not a GDPR matter for a Philippine audience, but
the Data Privacy Act exists, and a play-test that asks for feedback is a good
place to be straight about what is counted.

The cheapest honest version is a line in the footer and a short privacy page.
Worth doing before the first real traffic push, not after.
