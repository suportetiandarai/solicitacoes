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
  assert.match(script, /cpf: \['CPF'\]/);
  assert.match(script, /duplicateCode_\(sheet, cpf, columns\.cpf, columns\.status\)/);
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

test('novas solicitações não são gravadas como pendentes', () => {
  assert.doesNotMatch(script, /sheet\.appendRow/);
  assert.doesNotMatch(script, /\[\s*new Date\(\)[\s\S]{0,500}'PENDENTE'/);
  assert.match(script, /writeRequestRow_\(sheet, config/);
});

test('próxima linha considera somente dados reais e a escrita ocorre sob lock', () => {
  assert.match(script, /function findNextAvailableRequestRow_/);
  assert.match(script, /getDisplayValues\(\)/);
  assert.match(script, /String\(values\[offset\]\[0\] \|\| ''\)\.trim\(\) !== ''/);
  assert.match(script, /findNextAvailableRequestRow_\(sheet, keyColumns\)/);
  assert.match(script, /if \(!lock\.tryLock\(15000\)\)/);
});

test('status inicial e timestamps permanecem vazios até ação do técnico', () => {
  assert.match(script, /\], \[1, 4, 7\]\)/);
  assert.match(script, /\], \[1, 3\]\)/);
  assert.match(script, /new Array\(sheet\.getLastColumn\(\)\)\.fill\(''\)/);
  assert.doesNotMatch(script, /values\[columns\.status - 1\]\s*=/);
  assert.match(script, /handleStatusEdit/);
  assert.match(script, /statusUpdatedAtColumn/);
  assert.match(script, /completedAtColumn/);
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

test('portal preserva os quatro serviços existentes, mantém SCNES e remove satisfação', () => {
  for (const serviceId of [
    'cadastro-timed',
    'login-ad',
    'treinamento',
    'suporte',
    'ficha-cadastral-scnes'
  ]) {
    assert.match(app, new RegExp(`id: '${serviceId}'`));
  }
  assert.match(app, /title: 'Ficha Cadastral Scnes'/);
  assert.match(app, /1FAIpQLSeFDKRmd9reMR23-mzcGnbiOy43PE_XRag0qC4Za2ZN2CFGtg\/viewform/);
  assert.doesNotMatch(app, /pesquisa-satisfacao-ti|1FAIpQLSdD4E3ywPsZPFx7Eg8nm-dZQ_p2s_TMnWkwvroaZvTwI_g9Ug/);
});

test('portal exibe os cinco cards na ordem operacional solicitada', () => {
  const orderedIds = ['suporte', 'cadastro-timed', 'login-ad', 'treinamento', 'ficha-cadastral-scnes'];
  const positions = orderedIds.map((id) => app.indexOf(`id: '${id}'`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(app, /title: 'Abra seu chamado'/);
  assert.match(app, /Acesse o canal para realizar a abertura do seu chamado\./);
  assert.match(app, /UPI \/ UPE 3 Andar Ambulatório \/ Trauma, a senha e o usuário são padrão/);
  assert.match(app, /Agende um treinamento sobre TIMED \(Prontuário Eletrônico\)\./);
});

test('grid organiza três cards na primeira linha e dois centralizados na segunda', () => {
  const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(style, /\.menu-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(6,/);
  assert.match(style, /\.menu-card\s*\{\s*grid-column:\s*span 2;/);
  assert.match(style, /\.menu-card:nth-child\(4\)\s*\{\s*grid-column:\s*2 \/ span 2;/);
  assert.match(style, /@media \(max-width: 1100px\)[\s\S]*repeat\(2,/);
  assert.match(style, /@media \(max-width: 600px\)[\s\S]*grid-template-columns:\s*1fr/);
});

test('treinamento usa a lista central de cargos e o novo exemplo de tema', () => {
  assert.match(html, /<select id="tr_cargo" data-job-role-select required>/);
  assert.match(html, /id="tr_tema" placeholder="Ex: Evolução de Paciente Interno, Prontuário, Etc\.\.\."/);
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

test('cabeçalho mantém somente o título oficial do Portal de Solicitações', () => {
  assert.match(html, /<title>Portal de Solicitações T\.I Rio Saúde - Hospital do Andaraí<\/title>/);
  assert.match(html, /<h1>Portal de Solicitações T\.I Rio Saúde - Hospital do Andaraí<\/h1>/);
  assert.doesNotMatch(html, /Acesse os formulários e serviços disponíveis/);
  assert.doesNotMatch(html, />GESTÃO TI<\/span>/);
});

test('formulário AD exige Cargo e Setor e envia os dois campos', () => {
  assert.match(html, /id="ad_cargo"[^>]*required/);
  assert.match(html, /id="ad_setor"[^>]*required/);
  assert.match(app, /jobTitle: document\.getElementById\('ad_cargo'\)\.value/);
  assert.match(app, /sector: document\.getElementById\('ad_setor'\)\.value/);
  assert.match(script, /cargo: \['CARGO'\]/);
  assert.match(script, /sector: \['SETOR'\]/);
});

test('TIMED, Treinamento e Login de Computador compartilham a mesma fonte de cargos', () => {
  for (const fieldId of ['cad_cargo', 'tr_cargo', 'ad_cargo']) {
    assert.match(
      html,
      new RegExp(`<select id="${fieldId}" data-job-role-select required>`),
    );
  }

  assert.equal((html.match(/id="job-role-options"/g) || []).length, 1);
  assert.equal((html.match(/<option value="">Selecione o cargo<\/option>/g) || []).length, 3);
  assert.doesNotMatch(html, /id="lista-cargos"|list="lista-cargos"/);
  assert.match(app, /function normalizeJobRole\(/);
  assert.match(app, /function getAvailableJobRoles\(/);
  assert.match(app, /function loadJobRoleOptions\(/);
  assert.match(app, /querySelectorAll\('\[data-job-role-select\]'\)/);
  assert.match(app, /const seen = new Set\(\)/);
});

test('os três cargos selecionados são enviados sem deslocar os campos do AD', () => {
  assert.match(app, /jobTitle: document\.getElementById\('cad_cargo'\)\.value/);
  assert.match(app, /jobTitle: document\.getElementById\('tr_cargo'\)\.value/);
  assert.match(
    app,
    /cpf: document\.getElementById\('ad_cpf'\)\.value,[\s\S]*phone: document\.getElementById\('ad_telefone'\)\.value,[\s\S]*jobTitle: document\.getElementById\('ad_cargo'\)\.value,[\s\S]*sector: document\.getElementById\('ad_setor'\)\.value/,
  );
  assert.match(script, /values\[columns\.cargo - 1\] = payload\.jobTitle/);
  assert.match(script, /const cpf = normalizeCpf_\(payload\.cpf\)/);
  assert.match(script, /values\[columns\.cpf - 1\] = cpf/);
  assert.match(script, /values\[columns\.phone - 1\] = payload\.phone/);
});

test('data da solicitação AD preserva e exibe data e hora completas', () => {
  assert.match(script, /values\[columns\.requestedAt - 1\] = new Date\(\)/);
  assert.match(script, /const row = writeRequestRow_/);
  assert.match(script, /getRange\(row, columns\.requestedAt\)[\s\S]*setNumberFormat\('dd\/MM\/yyyy HH:mm:ss'\)/);
});

test('portal usa o azul escuro institucional e a nova descrição TIMED', () => {
  const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(style, /--primary:\s*#0d5770/);
  assert.match(app, /Solicite o cadastro de novos colaboradores no Prontuário Eletrônico\./);
});

test('envio usa mensagem de andamento e notificação única no topo por três segundos', () => {
  const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(html, /<p>Solicitação em Andamento<\/p>/);
  assert.doesNotMatch(html, /Conectando|conectando/);
  assert.match(app, /window\.showPortalNotification/);
  assert.match(app, /container\.replaceChildren\(\)/);
  assert.match(app, /duration = 3000/);
  assert.match(app, /clearTimeout\(portalNotificationTimer\)/);
  assert.match(app, /Solicitação enviada com sucesso\./);
  assert.match(app, /Não foi possível enviar a solicitação\. Tente novamente\./);
  assert.match(style, /\.toast-container\s*\{[\s\S]*top:\s*24px/);
  assert.match(style, /\.toast-close/);
});

test('aviso AD inclui Trauma e concordância solicitada', () => {
  assert.match(
    html,
    /UPI e UPE 3 Andar Ambulatório \/ Trauma, a senha e o usuário são padrão\. Solicite diretamente à chefia do setor\./,
  );
});
