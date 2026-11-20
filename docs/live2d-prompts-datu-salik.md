# Animation prompts — Kuta Wato Warcaller, Datu Salik

Source: `assets/cards/web/maguindanao/Kuta Wato Warcaller, Datu Salik.webp`
Level 3 Persona, Maguindanao / Mindanao Arch.

---

## If your tool only outputs 9:16

It does, and that is a second problem on top of the drift.

- Your card is **2:3 = 0.667** (wider)
- **9:16 = 0.5625** (narrower)

They do not match, so the tool rescales your art to fit — and that rescale is
its own source of instability, independent of the drift below. Fighting it with
prompt words will not work, because the tool is doing it before the model sees
anything.

**Give it a source that is already 9:16, so nothing is ever rescaled.**

### The lossless pad

Place the 1024 × 1536 art, unscaled, on a **1080 × 1920** canvas:

| | |
|---|---|
| Canvas | 1080 × 1920 (9:16) |
| Art placed at | x = **28**, y = **192** — untouched at 1024 × 1536 |
| Bars | 192 px above and below, 28 px each side |
| Crop back after generating | x = 28, y = 192, w = 1024, h = 1536 |

No scaling in either direction, so nothing is resampled and nothing softens.
Do **not** use 720 × 1280 — the art does not fit and would have to shrink.

Fill the bars by **extending the artwork** — continue the stormy sky upward and
the wet stone downward — rather than leaving them black. A model handed black
bars often tries to fill them with invented content, and then the invented
content moves. If you cannot outpaint, use a flat dark colour sampled from the
art's own edges and add this line to the prompt:

> The dark borders at the top, bottom and sides are a static matte. They do not
> move, change colour, or gain any content.

Then crop them off afterwards and you are back to a clean 1024 × 1536.

### Check first, though

Many tools do offer other ratios — Veo, Kling and Runway all support more than
9:16, sometimes behind a dropdown rather than a preset. If you can select 2:3
or 3:4, take it and skip the padding entirely. 3:4 (0.75) is a much smaller
mismatch than 9:16 and needs far less crop.

---

## The size we actually want

**1024 × 1536.** Portrait, 2:3.

That is the size 89 cards in the set already use, it is a native generation
resolution, and the game scales down from it cleanly. Salik's own file is
1013 × 1553 — within a percent of 2:3, so pad it to 1024 × 1536 **before**
anything else so the model is never asked to change the aspect ratio itself.

On the board a card draws at 84 × 118 px, so 1024 × 1536 is generous headroom
for the full-size inspect view.

---

## The drift is time-based — generate short

Observed: the first ~2 seconds hold perfectly, then the subject starts growing
from about 3 seconds on.

That is not the prompt failing. **Image-to-video conditioning decays over the
clip.** The model holds the source image tightly at the start and progressively
loses it; most are trained on 2–4 second clips, so roughly the first two seconds
are the stable window and everything after is drift. Asking for 4–6 seconds
guarantees you see it.

So the fix is not more words:

| Do | Instead of |
|---|---|
| **Set the tool's duration to 2 s** and generate that | Generating 5 s and hoping |
| **Trim to the stable window** if you must generate longer | Keeping the whole take |
| **Crossfade-loop the 2 s clip** to get an endless idle | Chasing a long seamless take |
| Leave attack and hit as they are | — they are 1–2 s already, inside the stable window |

Note what this means: **drift only threatens the idle**, and the idle is the one
clip that can afford to be shortest. Attack and hit were never at risk.

### Making 2 seconds loop forever

A 2 s clip whose last frame does not match its first will visibly jump. Two
ways to hide it:

**Crossfade (use this one).** Overlap the tail into the head with a short
dissolve. Rain keeps falling, embers keep rising, the gong spiral keeps turning
— all the directional motion stays correct.

On a 2 s source, this dissolves the last 0.25 s over the first 0.25 s and
writes a 1.75 s clip that loops without a visible seam:

```bash
ffmpeg -i salik-idle-raw.webm -filter_complex "[0]split[a][b];[a]trim=0:1.75,setpts=PTS-STARTPTS[base];[b]trim=1.75:2,setpts=PTS-STARTPTS[tail];[base][tail]xfade=transition=fade:duration=0.25:offset=1.5[v]" -map "[v]" -c:v libvpx-vp9 -pix_fmt yuva420p -an salik-idle.webm
```

No ffmpeg? The same thing in any editor: put the clip on two layers, slide the
upper one back by its own length minus 0.25 s, and fade the overlap. That is
all the command is doing.

**Ping-pong — do not use it here.** Playing forward then backward gives a
perfect seam, but it reverses every directional element: the rain falls upward,
the embers sink, the spiral unwinds. It is the right trick for a character
breathing on a plain background and the wrong one for this card.

---

## Why it zoomed at all, and the framing lock

The card growing and then shrinking back is a **Ken Burns push-in**. It happens
because "seamless loop, first and last frame identical" reads to the model as
permission to move the camera *as long as it returns* — so it pushes in and
pulls back out, and the loop technically closes.

The fix is to forbid scale change **at every moment**, not just at the ends.
That is what the block below does, and it is repeated verbatim in all three
prompts because these models weight repeated constraints more heavily.

Also check your tool's own controls before prompting: if there is a **camera
motion** setting, set it to *none* / *static*, and if there is a **motion
strength** or *motion bucket* slider, keep it low. A prompt cannot always
override a camera-motion preset.

### The framing lock — paste this into every prompt

> Locked-off camera on a tripod. The framing never changes. No zoom in, no zoom
> out, no push-in, no pull-back, no dolly, no truck, no pan, no tilt, no roll,
> no crop change, no scale change, no shake. The subject is exactly the same
> size in every single frame — not larger at any point, not smaller at any
> point, including in the middle of the clip. Every element stays at the same
> pixel position and the same scale from the first frame to the last. The
> subject remains fully inside the frame at all times and never approaches the
> edges. Output resolution 1024 × 1536, portrait, and the aspect ratio never
> changes.

---

## 1 · Idle — the one that matters most

On screen for minutes at a time, so it has to be genuinely subtle. The failure
mode is a character that looks like it is fidgeting.

> Subtle looping idle animation of the man in the image. His pose does not
> change.
>
> **[paste the framing lock here]**
>
> Animate only: slow shallow breathing in the chest and shoulders; the trailing
> ends of his red patterned headscarf drifting in the wind; the purple sash and
> the hem of his robe swaying gently; the red banners in the background
> rippling; rain continuing to fall; embers drifting upward; the pink-red
> lightning wreathing the sword blade flickering and pulsing softly; the violet
> energy spiral behind the bronze gong rotating very slowly. One slow blink
> every few seconds. Micro-movement of the head only, a degree or two.
>
> The loop closes because nothing has moved out of place — not because the
> camera returned to where it started. Photorealistic painted illustration
> style, unchanged from the source. No new elements, no text, no style shift,
> no colour grading change.

**Generate 2 seconds.** Not 4, not 6 — past roughly 2 s the model loses the
source image and the subject starts to grow. Loop it with the crossfade above.

---

## 2 · Attack

> The man in the image performs a single decisive attack, then returns exactly
> to his starting pose.
>
> **[paste the framing lock here]**
>
> His raised right hand closes and sweeps downward in a commanding gesture. He
> shifts his weight forward slightly — a lean within the frame, not a step
> toward the camera and not a change in his size. The pink-red lightning along
> the sword blade flares to a bright surge. The violet spiral behind the bronze
> gong pulses outward once. His cape and sash surge with the motion, then
> settle. Sparks and embers scatter outward. He ends in the same pose, at the
> same size, in the same position he began.
>
> Photorealistic painted illustration style, unchanged from the source. No new
> elements, no text, no style shift.

**1.5–2 seconds. Must end on the idle pose so it hands back cleanly.**

---

## 3 · Being attacked

> The man in the image reacts to an impact, then recovers to his starting pose.
>
> **[paste the framing lock here]**
>
> His torso twists back slightly and his head turns away from the blow. His
> expression hardens. The cape and sash whip sharply, then settle. The lightning
> on the blade flickers and dims briefly before recovering. Embers scatter away
> from him. A brief flash of light across the scene. He returns to his original
> stance at the same size and position.
>
> Photorealistic painted illustration style, unchanged from the source. No new
> elements, no text, no style shift.

**1–1.5 seconds. Must end on the idle pose.**

---

## Generate the art, not the card

Feed the generator the artwork with the **frame, border, name plate, level gem,
flavour text and power box cropped off** — or masked. If the frame is in the
source it will breathe along with everything else and the typography will
smear, and no prompt stops that.

The game draws the frame as UI, so animate the art and composite the frame back
on top at the same size. If you only have the flattened card, crop the inner art
window, animate that, and place it back inside the frame.

---

## How to check a take

Pull the **first frame, a middle frame, and the last frame** into any image
editor as layers and flick between them. His eyes should sit on exactly the same
pixels in all three. If the middle frame is even slightly larger, the take has
the zoom and no amount of watching it at speed will make that acceptable — it
reads as the card pulsing.

| Reject if | Cause |
|---|---|
| Subject grows then shrinks | Ken Burns push-in. Re-prompt with the framing lock; set camera motion to none. |
| Camera drifts sideways | Same cause. |
| His face changes between frames | Identity drift — shorten the clip, lower motion strength. |
| Sword or headscarf leaves frame | Motion strength too high. |
| End frame differs from start | Breaks the loop and the hand-back to idle. |
| Colour grade shifts | Will not match the other two clips or the still card. |

Generate several takes and pick on **stillness**, not on drama. For idle, the
least eventful usable take is almost always the right one.

---

## Export settings

| | |
|---|---|
| Format | **WebM, VP9, with alpha** if you can cut the background; otherwise WebM VP9 opaque and we mask to the card's art window |
| Resolution | **1024 × 1536** |
| Frame rate | 24 or 30 fps |
| Idle | **2 s generated**, crossfade-looped (see above) |
| Attack / hit | 1–2 s, one-shot, ending on the idle pose |
| Naming | `salik-idle.webm`, `salik-attack.webm`, `salik-hit.webm` |

Drop them in `assets/ui/live2d/` and the game can pick them up by card id, the
same way the Personify cutscene player already does.

---

## One honest caveat

Video clips cannot *blend* between states. Cutting from idle to attack pops
unless each clip starts and ends on an identical pose — which is why every
prompt above insists on it. Real Live2D or Spine rigging crossfades and never
pops.

If the video route still looks stiff once the pop is handled, the fix is not a
better prompt: it is rigged art. That needs the illustration delivered in
**layers** — hair, face, body, cloth, weapon, background separated — which is
worth asking your artist for now whichever route you take. Layers unlock
rigging; a flat image only ever unlocks video.
