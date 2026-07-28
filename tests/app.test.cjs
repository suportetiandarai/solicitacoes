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

test('cards do portal usam configuração central e controles semânticos', () => {
  assert.match(app, /const PORTAL_SERVICES = Object\.freeze/);
  assert.match(app, /document\.createElement\(service\.type === 'external' \? 'a' : 'button'\)/);
  assert.match(app, /element\.type = 'button'/);
  assert.match(app, /element\.setAttribute\('aria-label'/);
  assert.match(app, /element\.target = '_blank'/);
  assert.match(app, /element\.rel = 'noopener noreferrer'/);
  assert.doesNotMatch(html, /class="menu-card" onclick=/);
});

test('portal preserva os quatro serviços existentes e adiciona SCNES e satisfação', () => {
  for (const serviceId of [
    'cadastro-timed',
    'login-ad',
    'treinamento',
    'suporte',
    'ficha-cadastral-scnes',
    'pesquisa-satisfacao-ti'
  ]) {
    assert.match(app, new RegExp(`id: '${serviceId}'`));
  }
  assert.match(app, /1FAIpQLSeFDKRmd9reMR23-mzcGnbiOy43PE_XRag0qC4Za2ZN2CFGtg\/viewform/);
  assert.match(app, /1FAIpQLSdD4E3ywPsZPFx7Eg8nm-dZQ_p2s_TMnWkwvroaZvTwI_g9Ug\/viewform/);
});

test('script não redefine window.location e possui timeout de envio', () => {
  assert.doesNotMatch(app, /function location\s*\(/);
  assert.match(app, /function buildLocation\s*\(/);
  assert.match(app, /const REQUEST_TIMEOUT_MS = 120_000/);
  assert.match(app, /AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/);
  assert.match(app, /finally\s*\{\s*loading\(false\)/);
});

test('envio TIMED respeita o limite total do endpoint antes da requisição', () => {
  assert.match(app, /const MAX_TOTAL_FILES = 4/);
  assert.match(app, /const MAX_REQUEST_BYTES = 2_300_000/);
  assert.match(app, /new TextEncoder\(\)\.encode\(serializedPayload\)\.byteLength/);
  assert.match(app, /councilFiles\.length \+ documentFiles\.length > MAX_TOTAL_FILES/);
});

test('portal utiliza tema claro institucional', () => {
  const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(style, /Tema claro institucional/);
  assert.match(style, /--card-bg:\s*#ffffff/);
  assert.match(style, /linear-gradient\(180deg,\s*#f8fbff/);
  assert.match(style, /\.menu-card,\s*\n\.form-section\s*\{\s*\n\s*background:\s*#ffffff/);
});
