# Performance patch implementation plan

**Goal:** Port the reviewed rendering fixes from Harbringe and AverWasTaken into the current checkout.

**Architecture:** Keep Electron, the existing renderer and all gameplay rules. Apply guarded, reproducible edits to both copies of the game bundles, then adapt the small tracer and visibility modules. Work in the current checkout as requested.

**Tech stack:** Node.js built-ins, Electron, three.js. No new dependencies.

**Scope:** `app/main.js`, both `app/mods/{next/js,_assets/r20261021-1/next/js}/{BiMsX6Xn,CnrSARj_,OkAdunfX}.js`, `app/mods/aim-ui/bot-visibility.mjs`, `app/mods/aim-tracers/renderer.mjs`, a bundle patch script, regression tests, package script and patch notes. `site/`, player saves, simulation, sensitivity, recoil and fire timing stay outside the patch.

**Sources:** Harbringe commit `90de5be6c12b7cdae4a6c3fa471d9b6358f3de51`; AverWasTaken commit `d9f65b23fb` (personal-improvements).

## Decisions

- Take Harbringe's High-tier MSAA-off / 1.25 pixel-ratio cap and Windows rendering flags, while keeping Chromium's GPU blocklist and respecting a user-supplied ANGLE backend. Driver compatibility protections should remain active.
- Take AverWasTaken's muzzle-flash warm-up, PMREM target disposal, actor skeleton disposal, tracer warm-up and time-sliced visibility build. Keep the visibility geometry and fail-open rules unchanged.
- Do not merge the fork's added game modes, UX, analytics or bot mechanics.
- Preflight every bundle replacement and both duplicate copies before writing any bundle; support safe re-runs.
- Static checks pin minified bundle integration; behavior tests cover actual extracted functions, visibility results/cancellation and tracer draw/update behavior. GPU latency remains a live measurement, not a unit-test claim.

## Tasks

- [x] Run adapted upstream regression tests against the unpatched code and confirm relevant failures.
- [x] Add guarded bundle patcher; port and test render warm-up/disposal changes in both bundle paths.
- [x] Adapt visibility scheduling and tracer warm-up; cover cancellation and renderer state restoration.
- [x] Adapt Harbringe's rendering configuration; cover Windows flags, explicit backend choice and render-tier values.
- [x] Add npm test command and source/rollback/live-check documentation.
- [x] Run all relevant tests, scenario validation, syntax checks and inspect the final diff.

## Results and review

32 tests passed (13 performance, 6 import, 13 updater), plus 31 scenarios and 1 example.
Edited bundle syntax and whitespace checks passed (CRLF-aware for the existing README).
Electron loaded Ascent using a separate profile, registered a first shot with zero
new shader submissions during the shot, and completed three restarts with 234, 235,
233 live texture handles. The test window was closed afterwards.

Independent review found that RenderTarget has no target-level UUID. Changed both
warm-up keys to the texture UUID, watched the realistic-target test fail before
the correction, then reran the suite successfully. No other important review
findings. The landing-page contrast finding was fixed without suppressions.

User steering: keep `origin` on the existing `hygef-v4/open-aim` fork; disable pushes
through `upstream`, and route the updater, repository and contribution links to the
fork. The MIT notice is retained. No commit or push was made.

## Verification limits

There is no measured input-to-display baseline. Automated tests cannot establish FPS gains or physical mouse-to-photon latency. If Electron cannot be run in this environment, explicitly record that GPU warm-up and driver behavior still need an in-app check.
