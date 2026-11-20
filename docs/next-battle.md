# Your Next Battle

Open Tutorial → Your Next Battle, or `?practice=next-battle`. First Battle's finish
screen now leads here. The older `?practice=first-battle` link is an alias.

## Learning design

This is the second stage: make decisions after following the controlled match.
It uses the same prepared two-shield position, valid decks and real card effects.
It is not the later five-shield beginner match or the deck strategy curriculum.
All normal legal player choices remain available, including skills and reactions.
No action is forced, and completing every type of action is not required to win.

The small coach shows a current objective and the last result. Help is requested,
never revealed by a timer. Three requests provide a reminder, an explanation and
one legal suggestion. Only the third highlights a target. Suggestions use the
player's hand and public board, not the opponent's hand or either deck order.
Inspection and minimization remain available. Choosing another card is valid.
Selecting a card or attacker temporarily collapses the coach to expose the
destination. It returns after the move unless the player manually minimized it.

Defense help lives in the defense picker, preserving the horizontal cards and
selection. It distinguishes ties from successful defense and explicitly cautions
that attack checks can change the result. Existing Action confirmation shows the
Energy cost, remaining Energy and card rules. End Turn warns if a legal attack
remains, with Keep Playing and End Anyway; it never spends that attack itself.

## Opponent

The prepared opponent chooses through the real GameController. It calls at most
one Ally per turn while it has fewer than two; attacks with each attacker at most
once, at most three attacks; chooses no support or optional skills/reactions;
and defends at most once per turn using one sufficient card when down to one or
zero shields. These limits are explained when the match opens. There are no
hidden stats, guaranteed winning checks, or automatic wins. The player can lose.

## Results and persistence

Win and loss both offer retry, the existing short lessons, and the title screen.
The recap counts calls, attacks, Actions and defense decisions; it does not claim
that these establish understanding. `codex-legends.next-battle.v1` stores only an
attempt count, whether a win has occurred, and the most recent action/hint counts.
No remote submission. Blocked storage does not prevent play. Restart starts a new
match; unlike First Battle, free choices are not restored from chapter snapshots.
Reset Progress also clears this practice summary.

## Files and validation

- `src/ui/next-battle.ts`: pure hints, session counters, bounded opponent policy.
- `src/ui/main.ts`: entry, normal match integration, compact coach and recap.
- `src/ui/card-choice.ts`: optional defense help, with existing card selection.
- `src/ui/next-battle.test.ts`: legal alternatives, hint safety, defense, full
  simulation, loss possibility and resilient local recap.
- `tests/browser/next-battle.mjs`: real UI play, alternate call, hints, cancel,
  defense and victory across desktop and mobile.

Use the same Playwright runtime/browser environment variables described in
`first-battle.md`. Run against Vite on the available local port.

Verified September 22, 2026:

- 48 focused tests pass, including First Battle and shared choice accounting.
- Full browser wins at 1280×720, 390×844 and 844×390: optional hint escalation,
  alternate opening call, minimization, Action cancellation, end-turn warning,
  defense help, real victory; no browser page errors.
- Separate browser loss: End Anyway, choosing not to defend, real defeat, retry.
- Original First Battle completes with checkpoint reloads and enters this stage.
- Type checking and production build pass; the existing bundle-size advisory remains.

The broader suite was not rerun for this stage. Its previously documented
`chain-depth.test.ts` failure remains separate; see `first-battle.md`.

Next user validation: observe beginners playing this stage without coaching
aloud. Ask them to explain their chosen attack, defense and win condition. A
successful automated playthrough verifies the software, not learning outcomes.
