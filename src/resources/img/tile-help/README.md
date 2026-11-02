# Tile pictures

Drawings for the admin tiles and their explanations. All come from one prompt style, so a new
picture can be made in a minute and still looks like the others.

## How to make one

1. Prompt = the style block below + `SCENE:` + the scene. Pass `statistics/minimum.webp` as a
   reference image and add: "match its pen, line weight, figure drawing and colours exactly".
2. Trim the white margin and turn the white paper into transparency (alpha = 1 - darkest channel, then un-premultiply), so the ink sits cleanly on any surface. Export as WebP with alpha, at most 1000 x 700 px and 120 kB.
3. A picture is decoration: never let it say something the text next to it does not say.

## Style block

```text
STYLE (identical in every image): elegant, human, hand-drawn ink line drawing, as if sketched with confidence by a skilled editorial illustrator with one fine pen. Natural adult human proportions: slim, relaxed, believable postures with real weight and gesture, never a geometric stick man with a circle head and straight limbs. Faces are left out or reduced to almost nothing, hair and clothing only hinted with one or two strokes, people of varied age and build, neutral and not stereotyped. Line in warm dark grey #3A3335, slightly varying pressure, open ends, lots of air. Pure white background #FFFFFF, flat, no paper texture, no shading, no gradient, no shadow, no border. Exactly one accent colour, deep red #A5000A, used sparingly as a line or small flat shape, only on the one thing the picture is about. Objects are drawn with the same pen, simple and few. Composition small and calm, generous white margin on all sides, nothing touching the edge.
AVOID: any text, letters, digits, logos, watermark, signature, user-interface screenshots, cartoon mascots, big-eyed characters, lightbulbs, handshakes, hearts, shields with checkmarks, padlocks, magnifying glasses, ties and dresses as gender signs, 3D, photographic look, filled black areas, clutter. Original artwork, not in the style of any named artist or brand.
```

## Scenes

| File                       | Scene                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statistics/minimum.webp`  | Two small scenes side by side, separated only by white space. Left: one counsellor sits alone at a table, looking at a small bar chart on a sheet; a thin red line runs from one bar straight to this person. Right: five counsellors stand together in a loose group, talking, with one bar chart on a sheet held between them; a soft red bracket spans the whole group, no line to any single person. |
| `statistics/update.webp`   | One relaxed admin stands with a coffee mug in the morning, looking at a single sheet with a small bar chart pinned to a wall. Next to the sheet hangs a simple round wall clock with no numerals. Only the clock hands are in the red accent.                                                                                                                                                            |
| `statistics/periods.webp`  | One person stands at the right end of a long, wide bar chart on a wall, with many thin bars. The person's hand points at the last part. Only this last part is held by a soft red bracket; the older bars stay in thin grey line. Wide and low.                                                                                                                                                          |
| `statistics/tracking.webp` | One counsellor sits at a small table typing on a laptop; three empty speech bubbles float away. Beside the laptop a small mechanical hand tally counter without digits, this counter alone in the red accent.                                                                                                                                                                                            |
| `statistics/protocol.webp` | One person reads a long paper list which unrolls from the hands to the floor and curls there, only short pen strokes as lines, exactly one line in the red accent. Square.                                                                                                                                                                                                                               |
| `conversation.webp`        | Two people sit opposite each other on simple chairs in a quiet, friendly conversation. Between them one small empty speech bubble in the red accent.                                                                                                                                                                                                                                                     |
