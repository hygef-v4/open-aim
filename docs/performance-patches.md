# Performance patches in this fork

This is [hygef-v4/open-aim](https://github.com/hygef-v4/open-aim), based on
[unkwsr/open-aim](https://github.com/unkwsr/open-aim). The original MIT notice and
asset credits are retained. Development and releases belong to this fork.

## Sources and changes

- [Harbringe, commit 90de5be6](https://github.com/Harbringe/open-aim/commit/90de5be6c12b7cdae4a6c3fa471d9b6358f3de51):
  High-tier MSAA is off and automatic pixel ratio is capped at 1.25 instead of 2.
  The Low tier is unchanged. Explicit render resolution still uses the requested size.
  On Windows, prefer D3D11 ANGLE unless a backend was passed on the command line,
  enable GPU rasterization and zero-copy, and disable native window-occlusion polling.
  Unlike the source patch, Chromium's GPU blocklist remains active. Existing
  `--disable-features` entries are preserved.
- [AverWasTaken, snapshot d9f65b23fb](https://github.com/AverWasTaken/open-aim/tree/d9f65b23fb):
  warm the muzzle-flash light/tone composites against their actual output target;
  re-warm when the output target, colour space or tone mapping changes; retain and
  dispose the PMREM render target; dispose removed humanoid skeletons; warm custom
  tracers before the first shot; and build visibility triangles in roughly 8 ms
  slices with MessageChannel instead of a fixed triangle count and nested timers.

Both game bundle URL copies are patched. Simulation, weapon accuracy, input
sensitivity and recoil are unchanged. The visibility proof and fail-open behavior
are preserved. Channel ports are both closed after yielding; tracer warm-up is
marked successful only after a render succeeds.
The warm-up key uses the output texture's UUID: this three.js version does not
give render targets their own UUID, unlike the source fork's test fixture.

Lower MSAA and pixel ratio trade some edge smoothness/sharpness for less GPU work,
especially on high-DPI displays. These patches do not establish a measured FPS gain
or remove every source of input latency.

## Reproduce and check

The patched bundles are tracked source files; no extra setup is needed to use them.
After regenerating mods, reapply their edits with:

```powershell
node scripts/patch-performance.mjs
cd app
npm run test:performance
npm run test:import
npm run test:updates
npm run check
```

The patcher checks every expected replacement and checks that the two URL copies
match before writing. It preserves each file's line endings and can be run again.
It refuses unknown bundle versions instead of silently applying partial edits.
The older `tools/perf_patch.py` starts from `site/` and overwrites later changes;
do not run it against an existing modified bundle without reconstructing all mods.

Tests cover output-target warm-up, GPU resource disposal, visibility equivalence
and cancellation, live tracer buffers, Windows flags, duplicate bundles and patcher
preflight. They do not measure the GPU driver or physical mouse-to-display delay.

## Live verification

Use a separate test profile; source builds otherwise use the installed game's saves:

```powershell
cd app
$env:AIM_PROFILE = Join-Path $env:TEMP 'open-aim-performance-test'
$env:AIM_PORT = '8011'
npm start -- --remote-debugging-port=9223
```

Compare the same drill, resolution and frame cap before and after. Check frame time
and 1% lows during movement and shooting, including the first shot and repeated retries.
For a cold-shader comparison use a fresh test profile for each version. On a map,
WebGL `createTexture` / `deleteTexture` instrumentation can track live texture handles
on the game context across retries; count lost contexts separately.
Shader compilation during a first shot can be observed with DevTools/WebGL instrumentation;
`globalThis.__aimFxWarmN` is only a warm-up counter, not a latency metric.

If D3D11 causes a driver-specific issue, test another supported backend using
`npm start -- --use-angle=<backend>`. To undo the High-tier visual trade-off, change
the tier replacement in `scripts/patch-performance.mjs` and both bundle copies together.

## Verification performed on 2026-11-10

- 13 performance regression tests, 6 import tests and 13 update tests passed.
- All 31 scenarios and the starter example validated; edited game bundles passed syntax checks.
- A real Electron test profile loaded Ascent, entered a round and registered a shot.
  WebGL `shaderSource` instrumentation recorded zero new shader submissions during
  that first shot after preparation. Three restarts left 234, 235 and 233 live
  texture handles on the game context, without an increasing trend or runtime errors.
- A review caught the source fork's target-level UUID assumption; the corrected
  texture UUID key and a realistic render-target fixture now cover that case.
- The landing-page button's text contrast was corrected; the design hook then
  reported no deterministic issues. No findings were suppressed.

This was a functional smoke check, not a controlled before/after FPS benchmark or
a physical input-latency measurement. The test profile is separate from player data.

## Own-fork workflow

`origin` is `https://github.com/hygef-v4/open-aim.git`. In this checkout,
`remote.pushDefault` and `branch.main.pushRemote` select `origin`; the `upstream`
push URL is `DISABLED`, while fetching upstream remains possible. These local Git
settings do not travel with a clone.

The updater, releases link, repository metadata and contribution links target this
fork. Installers from `unkwsr/open-aim` are rejected by the fork updater. Until this
fork publishes an installer, run from source. No commit, push or release is part of
applying these patches.
