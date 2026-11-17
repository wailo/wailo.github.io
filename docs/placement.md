# Placing the aircraft on an approach

The Airport panel can put the aircraft on the selected approach: at the threshold
with the aircraft stopped, or at 3, 6 or 9 NM from it on the extended centreline,
a 30° intercept or a 90° base turn. This is an experimental training aid.

## The panel is a thin layer

The panel does no geometry. It names the airport, the runway end and the preset's
distance, offset and target speed, and the engine does the rest:

```ts
FlightSimModule.approachReposition(
  airportId, // e.g. EHAM_Scenery_Pack
  runwayId, // the runway end name, e.g. 36R
  distanceM, // from the threshold along the final course
  lateralOffsetM, // signed: positive is right of the extended centreline
  headingOffsetDeg, // track relative to the final course
  targetSpeedKt, // knots
)
```

The engine resolves the threshold position, the height on the glide path and the
heading, applies them to the flight model and handles a paused simulation
itself. Calling the function is therefore the whole placement: there is no
unpause/pause dance and no returned position to apply.

`src/components/AirportBody.vue` only converts the diagram dots into the
arguments above (nautical miles to metres) and emits an
`ApproachRepositionRequest`; `src/components/Sim.vue` forwards it to the engine.
Nothing else in the frontend needs to know where the threshold is.

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
target — the red dot in the threshold markings marks the point — and clicking it
places the aircraft at the threshold with `targetSpeedKt = 0`, so it holds there.
The muted line above the strip shows course, glideslope and TCH.

Every other dot is one `approachReposition` call with the arguments below; the
bar through the dot is the track over the ground, so a dot and its bar say
"here, pointing this way" without a legend.

| Target           | Argument                                                                           |
| ---------------- | ---------------------------------------------------------------------------------- |
| threshold (0 NM) | `distanceM = 0`, `lateralOffsetM = 0`, `headingOffsetDeg = 0`, `targetSpeedKt = 0` |
| final (centre)   | `lateralOffsetM = 0`, `headingOffsetDeg = 0`                                       |
| 30° left (↗)     | `lateralOffsetM < 0`, `headingOffsetDeg = +30`                                     |
| 30° right (↖)    | `lateralOffsetM > 0`, `headingOffsetDeg = -30`                                     |
| 90° left (→)     | `lateralOffsetM < 0`, `headingOffsetDeg = +90`                                     |
| 90° right (←)    | `lateralOffsetM > 0`, `headingOffsetDeg = -90`                                     |

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

## Target speed

The panel's `SPD` field is in knots. It follows the live indicated airspeed until
it is edited, then keeps the entered value, so a placement does not drift while
the aircraft accelerates or slows down. The value is passed straight through as
`targetSpeedKt`.

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
