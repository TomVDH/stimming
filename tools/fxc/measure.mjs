// Saves ANGLE's HLSL for every large fragment shader a page compiles.
// Usage: node measure.mjs <url> <outDir> [minChars]
// Then time each file with fxc.py.
import { chromium } from 'file:///C:/Users/tmlns/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const [url, out, minArg] = process.argv.slice(2);
const min = Number(minArg || 20000);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const init = () => {
  const S = (window.__shaders = []);
  const G = WebGL2RenderingContext.prototype;
  const src = G.shaderSource;
  G.shaderSource = function (s, text) { S.push({ s, text, gl: this }); return src.call(this, s, text); };
};
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 300)));
await page.addInitScript(init);
await page.goto(url, { waitUntil: 'commit' });
await page.waitForTimeout(8000);
const res = await page.evaluate(min => window.__shaders
  .map((x, i) => ({ i, text: x.text, x }))
  .filter(o => o.text.length >= min && /gl_FragCoord|out vec4/.test(o.text) && !/gl_Position/.test(o.text))
  .map(o => {
    const dbg = o.x.gl.getExtension('WEBGL_debug_shaders');
    const name = (o.text.match(/\/\/ PASS: (\w+)/) || [])[1] || `fs${o.i}`;
    return { name, glsl: o.text, hlsl: dbg ? dbg.getTranslatedShaderSource(o.x.s) : '' };
  }), min);
for (const r of res) {
  writeFileSync(`${out}/${r.name}.glsl`, r.glsl);
  writeFileSync(`${out}/${r.name}.hlsl`, r.hlsl);
  console.log(`${r.name}: glsl ${r.glsl.length} hlsl ${r.hlsl.length}`);
}
await browser.close();
