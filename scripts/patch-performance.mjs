// Reviewed bundle edits from Harbringe (90de5be6) and AverWasTaken (d9f65b23fb), MIT.
// Run after rebuilding mods; preflight every edit and both URL copies before writing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['next/js', '_assets/r20261021-1/next/js'];
const edits = {
  'BiMsX6Xn.js': [
    ['high:{pointLights:10,spotLights:4,msaa:!0,maxPixelRatio:2}',
     'high:{pointLights:10,spotLights:4,msaa:!1,maxPixelRatio:1.25}'],
    ['const o=a.fromEquirectangular(s);return s.dispose(),a.dispose(),o.texture}',
     'const o=a.fromEquirectangular(s);return s.dispose(),a.dispose(),o.texture.__aimRT=o/* graphics-leak */,o.texture}'],
    ['dispose(){g?.dispose(),p?.dispose()}',
     'dispose(){g&&(g.__aimRT?.dispose(),g.dispose()),p?.dispose()}'],
  ],
  'CnrSARj_.js': [
    ['M=s=>{for(const Y of s.mesh.parts)Y.material.dispose();A.root.remove(s.mesh.root)}',
     'M=s=>{for(const Y of s.mesh.parts)Y.material.dispose();/* graphics-leak */s.mesh.skin?.skeleton?.dispose();A.root.remove(s.mesh.root)}'],
  ],
  'OkAdunfX.js': [
    ['function B(T,X,N,W,te){T.warmScene.clear()',
     'function B(T,X,N,W,te,__aimOut){/* graphics-warm */globalThis.__aimFxWarmN=(globalThis.__aimFxWarmN|0)+1;T.warmScene.clear()'],
    ['X.render(T.lightPass.scene,T.quadCam),X.render(T.tonePass.scene,T.quadCam),N.scissorTest=!1',
     'X.render(T.lightPass.scene,T.quadCam),X.render(T.tonePass.scene,T.quadCam),N.scissorTest=!1,X.setRenderTarget(__aimOut??null),X.setScissorTest(!0),X.setScissor(0,0,1,1),T.tonePass.mat.uniforms.exposure.value=0,X.render(T.lightPass.scene,T.quadCam),X.render(T.tonePass.scene,T.quadCam),T.tonePass.mat.uniforms.exposure.value=1,X.setScissorTest(!1)'],
    ['y&&(y=!1,B(q,T,Re,W.scene,le))',
     'q.__aimWarmKey!==(q.__aimWarmKey=T.toneMapping+"|"+T.outputColorSpace+"|"+(Oe?.texture?.uuid??"null"))&&(y=!0),y&&(y=!1,B(q,T,Re,W.scene,le,Oe))'],
  ],
};

const count = (text, value) => text.split(value).length - 1;
const writes = [];
for (const [name, replacements] of Object.entries(edits)) {
  const files = dirs.map(dir => path.join(root, 'app/mods', dir, name));
  const originals = files.map(file => fs.readFileSync(file, 'utf8'));
  let text = originals[0].replace(/\r\n/g, '\n');
  if (originals[1].replace(/\r\n/g, '\n') !== text) throw new Error(`${name}: URL copies differ; no bundles written`);
  for (const [before, after] of replacements) {
    const oldCount = count(text, before), newCount = count(text, after);
    if (newCount === 1 && count(text.replace(after, ''), before) === 0) continue;
    if (oldCount !== 1 || newCount !== 0) throw new Error(`${name}: expected one original or patched match for ${before.slice(0, 60)}; no bundles written`);
    text = text.replace(before, after);
  }
  files.forEach((file, i) => {
    const output = originals[i].includes('\r\n') ? text.replace(/\n/g, '\r\n') : text;
    if (output !== originals[i]) writes.push([file, output]);
  });
}
for (const [file, output] of writes) fs.writeFileSync(file, output);
console.log(writes.length ? `Patched ${writes.length} bundles.` : 'Performance bundles already patched.');
