# Placing the aircraft on an approach

The Airport panel can put the aircraft on the selected approach: at the threshold
with the aircraft stopped, or at 3, 6 or 9 NM from it on the extended centreline,
a 30° intercept or a 90° base turn. This is an experimental training aid.

## The panel is a thin layer

The panel does no geometry. It names the airport, the runway end and the diagram
target, and the engine does the rest:

```ts
FlightSimModule.approachReposition(
  airportId, // e.g. EHAM_Scenery_Pack
  runwayId, // the runway end name, e.g. 36R
  distanceNm, // nautical miles from the threshold along the final course
  lateralOffsetNm, // signed nautical miles: positive is right of the centreline
  headingOffsetDeg, // track relative to the final course, positive clockwise
  altitudeOffsetFt, // feet added to the glide-path altitude
  targetSpeedKt, // knots
)
```

The engine resolves the threshold position, the height on the glide path and the
heading, applies them to the flight model and handles a paused simulation
itself. Calling the function is therefore the whole placement: there is no
unpause/pause dance and no returned position to apply.

`src/components/AirportBody.vue` only maps the diagram dots onto the arguments
above and emits an `ApproachRepositionRequest`; `src/components/Sim.vue`
forwards it to the engine. Nothing else in the frontend needs to know where the
threshold is, and no unit conversion happens between the panel and the engine:
the diagram's nautical miles are the engine's nautical miles.

## The diagram

The placement control is a map, not a table:

```
              │               │
              │      27R      │
  0 NM        │▐▐▐▐  ●  ▐▐▐▐ │
              └───────┬───────┘
                      │
  3 NM                ●
                      │
  6 NM      ●→ ●↗  ●  ↖● ←●
                      │
  9 NM      ●→ ●↗  ●  ↖● ←●
```

Distance runs down the left gutter, the extended centreline runs down the
middle, and side is read across it. The runway is open-topped and drawn in the
centreline: the aircraft lands flying up the diagram. Its strip is the 0 NM
target — the dot in the threshold markings marks the point — and clicking it
places the aircraft at the threshold with `targetSpeedKt = 0`, so it holds there.
The muted line above the strip shows course, glideslope and TCH.

Every other dot is one `approachReposition` call with the arguments below; the
bar through the dot is the track over the ground, so a dot and its bar say
"here, pointing this way" without a legend. The dot clicked last stays filled in
the active colour, and its bar turns solid, so the active preset is visible from
the fields down to the diagram. Typing in `DIST`, `LAT OFS` or `HDG OFS` clears
that mark, because the placement no longer matches any preset, and selecting
another approach clears it too.

| Target           | `distanceNm` | `lateralOffsetNm` default | `headingOffsetDeg` default |
| ---------------- | ------------ | ------------------------- | -------------------------- |
| threshold (0 NM) | `0`          | `0`                       | `0°`                       |
| final (centre)   | row distance | `0`                       | `0°`                       |
| 30° left (↗)     | row distance | `-2`                      | `+30°`                     |
| 30° right (↖)    | row distance | `+2`                      | `-30°`                     |
| 90° left (→)     | row distance | `-2`                      | `+90°`                     |
| 90° right (←)    | row distance | `+2`                      | `-90°`                     |

The lateral and heading columns are the fields' defaults: the target fills them
in, and a typed value replaces them. The `distanceNm` column works the same way
through `DIST`, so a typed distance replaces the row's for every target.

Only the threshold forces a speed: the `SPD` field keeps its own value, so a
threshold stop does not leave the next 3/6/9 NM placement at 0 kt.

On each side the 30° intercept is drawn inside the 90° base turn, so the dots
nearest the centreline are the intercepts and the outermost dots are the base
turns.

The 30° intercept puts the aircraft 2 NM abeam the centreline with its track 30°
off the final course. The nose points along the intercept, not at the runway: the
track crosses the localizer `2 NM / tan(30°) = 3.5 NM` further in. At 3 NM that
crossing would be behind the threshold, so the 3 NM row offers only the final dot
and the four side slots are left empty.

The 90° dots are the same idea at a right angle: a base turn 2 NM abeam, pointing
straight at the extended centreline. It reaches the localizer after 2 NM, so it is
not offered at 3 NM either.

Both the intercept and the base turn are 2 NM abeam, so the horizontal spacing in
the diagram is schematic: the intercepts are drawn inboard only to keep the two
targets distinguishable. Every dot's tooltip states the real distance and track.

Side is the side of the extended centreline seen inbound, so an aircraft placed
left of the course points right of it — hence the opposite signs on the lateral
offset and the heading offset.

## The fields

`DIST`, `LAT OFS`, `ALT OFS` and `HDG OFS` sit in one four-column grid, label
over field, with `SPD` alone in the first cell of the second row. Each field
follows a source until it is edited, then holds the entered value; clearing it
returns to the source.

| Field     | Source when untouched                | Unit    | Argument           |
| --------- | ------------------------------------ | ------- | ------------------ |
| `DIST`    | the distance of the last target      | NM      | `distanceNm`       |
| `LAT OFS` | the side of the last target clicked  | NM      | `lateralOffsetNm`  |
| `ALT OFS` | 0                                    | feet    | `altitudeOffsetFt` |
| `HDG OFS` | the track of the last target clicked | degrees | `headingOffsetDeg` |
| `SPD`     | `180`                                | knots   | `targetSpeedKt`    |

`DIST` is the distance from the threshold along the approach, so `6` is the 6 NM
row and `4.5` is halfway between the 3 and 6 NM rows. It starts at `3` and follows
the last target clicked; typing a value overrides the diagram's distance for every
target, which means a dot keeps its track but is placed at the distance in the
field. `0` is the threshold distance.

The whole block renders disabled — dimmed and with no focusable inputs — until an
approach and an airport are selected, so the workflow is visible before it is
usable.

All three offsets are **offsets**, never absolute values. `LAT OFS` is the
distance from the extended centreline, positive to the right, so `0` is the
final course and `2` puts the aircraft 2 NM right of it. `ALT OFS` is added by
the engine to the altitude the glide path gives at that distance, so `0` puts the
aircraft exactly on the path and `+500` puts it 500 ft above it. `HDG OFS` is the
track relative to the final course, positive clockwise, so `0` flies the final
course and `+30` turns 30° right of it.

`SPD` is a fixed 180 kt approach speed, not the aircraft's current speed, so a
placement always asks for the same speed.

Clicking a target pre-fills `DIST`, `LAT OFS` and `HDG OFS` with that target's
distance, side and track, so the fields show the position the placement will use.
Typing a value overrides the pre-fill for every target — the bars in the diagram
still show each target's own track — and clearing the field hands control back to
the diagram.

The threshold is a target like the others: it sets `distanceNm` to 0 and
`targetSpeedKt` to 0 — whatever `DIST` holds — so the aircraft stops at the
threshold, and it keeps the three offset fields, so clear `LAT OFS`, `ALT OFS` and
`HDG OFS` to park it on the centreline at the threshold itself.

## Airport data

`world.airportMetadata()` returns the whole layout — approaches, runways, parking,
holding points and the datum — as plain JavaScript objects. It is not cheap: the
EHAM tree is around two thousand objects and takes about 12 ms to build, so
`snapshotAirport` builds it once per loaded airport and caches it by airport
ident. Do not call it from a render or animation path.

The binding carries no taxi nodes or edges; placement never needs them.

## History

Placement used to be computed in the frontend from an OurAirports-derived
threshold table (`src/Placement.ts`, `public/airport-thresholds.json`, the
`data:airport-thresholds` script). The engine's `approachReposition` made that
table, the fetch and the whole calculation redundant, so they were removed.
Ground targets (runway ends, gates, holding points) were dropped with it; they
return when the engine exposes an equivalent call for them.

The engine's distances moved from metres to nautical miles in the same release
cycle, so the panel stopped converting: `distanceNm` and `lateralOffsetNm` are
passed through as the diagram shows them.
