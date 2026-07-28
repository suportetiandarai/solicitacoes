const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'google-apps-script', 'Code.gs'), 'utf8');

test('portal envia os três formulários somente pela nova Edge Function', () => {
  assert.match(app, /google-sheets-intake/);
  assert.match(app, /enviarCadastro/);
  assert.match(app, /enviarTreinamento/);
  assert.match(app, /enviarLoginAD/);
  assert.doesNotMatch(app, /createClient|supabaseClient|\.from\(['"]|\.rpc\(['"]|SUPABASE_ANON_KEY/);
});

test('avisos de duplicidade TIMED e AD permanecem', () => {
  assert.match(app, /DUPLICATE_PENDING/);
  assert.match(app, /DUPLICATE_COMPLETED/);
  assert.match(script, /duplicateCode_/);
  assert.match(script, /cpfColumn: 7/);
  assert.match(script, /cpfColumn: 3/);
});

test('upload TIMED preserva conselho e documento nas pastas do Drive', () => {
  assert.match(html, /id="cad_foto_conselho"/);
  assert.match(html, /id="cad_foto_documento"/);
  assert.match(script, /1pLZiumhRNHvkdGPPTRLhSySFjb4OH1rpZPmJodg1Vb5Jekwls8XeLvGOwH-nztnldshUsWz0/);
  assert.match(script, /1YbGK3ReFpsx1H3cZEOL_CGRO_2vIBUhVvUYhgO-kv18D0t3r2v7T2RXWeF3KubSQevyjXzfC/);
  assert.match(script, /DriveApp\.getFolderById/);
});

test('portal não contém chave Supabase antiga nem bloqueio artificial do navegador', () => {
  assert.doesNotMatch(app, /ygnphizpnhcsblmwzmzj|eyJhbGci/);
  assert.doesNotMatch(app, /debugger|contextmenu|F12/);
});

test('Apps Script exige segredo e usa lock antes de gravar', () => {
  assert.match(script, /SHARED_SECRET/);
  assert.match(script, /LockService\.getScriptLock/);
  assert.match(script, /tryLock/);
});
