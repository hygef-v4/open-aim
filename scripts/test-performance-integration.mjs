// Exercise the actual edited bundle functions without booting Electron or a GPU.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bundle = name => read(`app/mods/next/js/${name}.js`);
function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `missing bundle boundary: ${start}`);
  return source.slice(a, b);
}

test('High tier reduces GPU load; Low tier keeps its existing budget', () => {
  const source = between(bundle('BiMsX6Xn'), 'const ML=', ',SL=');
  const tiers = vm.runInNewContext(`${source}; ML`);
  assert.equal(tiers.high.msaa, false);
  assert.equal(tiers.high.maxPixelRatio, 1.25);
  assert.equal(tiers.low.msaa, false);
  assert.equal(tiers.low.maxPixelRatio, 1);
  assert.equal(tiers.high.pointLights, 10);
});

test('Windows GPU switches keep explicit ANGLE choice and driver blocklist', () => {
  const source = between(read('app/main.js'), 'if (!VSYNC)', '// Compiled GPU shaders');
  for (const platform of ['win32', 'linux']) {
    for (const angle of [null, 'gl']) {
      const switches = new Map(angle ? [['use-angle', angle]] : []);
      switches.set('disable-features', 'ExistingFeature');
      const commandLine = {
        appendSwitch: (key, value = '') => switches.set(key, value),
        hasSwitch: key => switches.has(key),
        getSwitchValue: key => switches.get(key) ?? '',
      };
      vm.runInNewContext(source, { VSYNC: false, app: { commandLine }, process: { platform } });
      assert.equal(switches.get('use-angle'), angle ?? (platform === 'win32' ? 'd3d11' : undefined));
      assert.equal(switches.has('enable-gpu-rasterization'), platform === 'win32');
      assert.equal(switches.has('enable-zero-copy'), platform === 'win32');
      assert.equal(switches.has('ignore-gpu-blocklist'), false);
      assert.equal(switches.get('disable-features'), platform === 'win32' ? 'ExistingFeature,CalculateNativeWinOcclusion' : 'ExistingFeature');
    }
  }
});

test('muzzle warm-up draws composites against the real output with zero exposure', () => {
  const source = between(bundle('OkAdunfX'), 'function B(T,X,N,W,te', 'const V=new dt');
  const warm = vm.runInNewContext(`(${source})`, { E: new Map(), vi() {} });
  const passes = {
    warmScene: { clear() {} }, fxCam: {}, quadCam: {},
    lightPass: { scene: { name: 'light' }, mat: { uniforms: { tex: {} } } },
    tonePass: { scene: { name: 'tone' }, mat: { uniforms: { tex: {}, exposure: { value: 1 } } } },
  };
  const target = {}, output = {}, draws = [];
  const renderer = {
    target: null, setRenderTarget(value) { this.target = value; },
    setScissorTest() {}, setScissor() {},
    render(scene) { draws.push({ target: this.target, pass: scene.name, exposure: passes.tonePass.mat.uniforms.exposure.value }); },
  };
  target.scissor = { set() {} };
  warm(passes, renderer, target, {}, {}, output);
  const actual = draws.filter(draw => draw.target === output);
  assert.deepEqual(actual.map(draw => draw.pass), ['light', 'tone']);
  assert.ok(actual.every(draw => draw.exposure === 0));
  assert.equal(passes.tonePass.mat.uniforms.exposure.value, 1);
});

test('environment texture retains the render target so cleanup frees its GPU allocation', () => {
  const source = between(bundle('BiMsX6Xn'), 'function aL(', 'const oL=');
  const events = [], target = { texture: {}, dispose() { events.push('target'); } };
  const make = vm.runInNewContext(`(${source})`, {
    sL: () => ({ dispose() { events.push('source'); } }),
    Xf: class { compileEquirectangularShader() {} fromEquirectangular() { return target; } dispose() { events.push('generator'); } },
  });
  const texture = make({});
  texture.dispose = () => events.push('texture');
  const cleanup = bundle('BiMsX6Xn').match(/dispose\(\)\{g[^{}]*,p\?\.dispose\(\)\}/)?.[0];
  assert.ok(cleanup, 'lighting cleanup exists');
  vm.runInNewContext(`({${cleanup}}).dispose()`, { g: texture, p: null });
  assert.equal(texture.__aimRT, target);
  assert.deepEqual(events, ['source', 'generator', 'target', 'texture']);
});

test('removing a humanoid frees its skeleton; sphere removal still works', () => {
  const source = bundle('CnrSARj_').match(/M=s=>\{for\(const Y of s.mesh.parts\)[^}]*\}/)?.[0];
  assert.ok(source, 'actor removal exists');
  for (const humanoid of [true, false]) {
    const events = [], actor = { mesh: { root: {}, parts: [{ material: { dispose() { events.push('material'); } } }],
      skin: humanoid ? { skeleton: { dispose() { events.push('skeleton'); } } } : null } };
    const remove = vm.runInNewContext(`(${source.slice(2)})`, { A: { root: { remove(node) { assert.equal(node, actor.mesh.root); events.push('remove'); } } } });
    remove(actor);
    assert.deepEqual(events, humanoid ? ['material', 'skeleton', 'remove'] : ['material', 'remove']);
  }
});

test('bundle patcher is repeatable and rejects mismatched copies before any write', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aim-perf-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temp, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/patch-performance.mjs'), path.join(temp, 'scripts/patch-performance.mjs'));
  const dirs = ['next/js', '_assets/r20261021-1/next/js'];
  const files = [];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(temp, 'app/mods', dir), { recursive: true });
    for (const name of ['BiMsX6Xn', 'CnrSARj_', 'OkAdunfX']) {
      const file = path.join(temp, 'app/mods', dir, `${name}.js`);
      fs.copyFileSync(path.join(root, 'app/mods', dir, `${name}.js`), file);
      files.push(file);
    }
  }
  const run = () => spawnSync(process.execPath, [path.join(temp, 'scripts/patch-performance.mjs')], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  const before = files.map(file => fs.readFileSync(file, 'utf8'));
  assert.equal(run().status, 0);
  assert.deepEqual(files.map(file => fs.readFileSync(file, 'utf8')), before);
  fs.appendFileSync(files.at(-1), '\n// different URL copy\n');
  const corrupt = files.map(file => fs.readFileSync(file, 'utf8'));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /URL copies differ/);
  assert.deepEqual(files.map(file => fs.readFileSync(file, 'utf8')), corrupt);
});
