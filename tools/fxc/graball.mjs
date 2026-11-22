// Saves every large fragment shader's GLSL and first-copy HLSL; links are skipped.
// Usage: node graball.mjs <url> <out-prefix> [waitMs]
import { chromium } from 'file:///C:/Users/tmlns/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const [url, out, wait] = process.argv.slice(2);
const init = () => {
  const S = (window.__shaders = []);
  const G = WebGL2RenderingContext.prototype;
  const src = G.shaderSource;
  G.shaderSource = function (s, text) { S.push({ s, text, gl: this }); return src.call(this, s, text); };
  G.linkProgram = function () {};
  const gp = G.getProgramParameter;
  G.getProgramParameter = function (p, k) { return k === this.LINK_STATUS || k === 0x91B1 ? true : gp.call(this, p, k); };
};
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
await page.addInitScript(init);
await page.goto(url, { waitUntil: 'commit' });
await page.waitForTimeout(Number(wait || 12000));
const all = await page.evaluate(() => window.__shaders.filter(x => !/gl_Position/.test(x.text)).map((x, i) => {
  const dbg = x.gl.getExtension('WEBGL_debug_shaders');
  const name = (x.text.match(/\/\/ PASS: (\w+)/) || [])[1] || 'fs' + i;
  return { name, glsl: x.text, hlsl: dbg.getTranslatedShaderSource(x.s) };
}));
for (const x of all) {
  if (x.glsl.length < 15000) continue;
  writeFileSync(`${out}-${x.name}.glsl`, x.glsl);
  writeFileSync(`${out}-${x.name}.hlsl`, x.hlsl.split('// INITIAL HLSL END')[0]);
  console.log(x.name, x.glsl.length);
}
await browser.close();
