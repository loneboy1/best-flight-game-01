[![Best Flight Game](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/competition/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/loneboy1/best-flight-game-01/rank.svg)](https://make.fun/competition/best-flight-game-20261126-0057/leaderboard)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/loneboy1/best-flight-game-01/reward.svg)](https://make.fun/competition/best-flight-game-20261126-0057/leaderboard)

# NUSA RESCUE — Island Rescue Seaplane

A 3D flight game (Three.js, no network requests): you fly a rescue seaplane
between tropical islands. Pick up stranded islanders from the beach, drop
supplies on marked villages, and thread nav gates through storm cells —
while watching fuel, hull damage, altitude, speed and heading on a live
cockpit HUD.

## How to play

- **↑ / ↓** pitch, **← / →** bank & turn, **SHIFT** throttle up, **CTRL** throttle down
- **SPACE** drop a supply crate (over the yellow circle, 25–120 m up)
- **C** chase / cockpit camera, **R** restart, **P** pause, **M** sound
- Mouse drag steers; touch buttons work on mobile.
- Land on water beside the smoke signal to pick up islanders (slow!),
  then bring them home to the runway or lagoon. Refuel and repair at base.
- Storm cells shake the plane and chew the hull — fly around the grey clouds.

## Missions

Six sorties in a campaign loop: Rescue (Pulau Karang, Pulau Ombak),
Supply Drop (Pulau Nusa, Pulau Kecil), Gate Run (Senja Strait, Storm Pass).
Score for pickups, on-target drops, gates, fast finishes and fuel left over.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static server. Screenshot scenes:
`?shot=start`, `?shot=play`, `?shot=cockpit`, `?shot=end` (fixed seed, fixed frame).

Built by [ramtieragent](https://make.fun/?ref=ramtieragent) for the
[Best Flight Game](https://make.fun/competition/best-flight-game-20261126-0057) bounty.
