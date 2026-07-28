const CONFIG = Object.freeze({
  timed: {
    spreadsheetId: '1EVGXL_NUV_koXR1mH_X4z_YqVmsaLytCX84ONYTzD9I',
    sheetName: 'Respostas ao formulário 1',
    cpfColumn: 7,
    statusColumn: 17
  },
  training: {
    spreadsheetId: '1vcNxK3VQ4TwIxdHWWPCQcyYY6nS1MfRLFw9c8lxza_U',
    sheetName: 'Respostas ao formulário 1'
  },
  ad: {
    spreadsheetId: '1_j13tglIFAWDcvLx2dsMGLugThdrrzbjKHYNt9H5Qj4',
    sheetName: 'SOLICITACÕES AD',
    cpfColumn: 3,
    statusColumn: 6
  },
  councilFolderId: '1pLZiumhRNHvkdGPPTRLhSySFjb4OH1rpZPmJodg1Vb5Jekwls8XeLvGOwH-nztnldshUsWz0',
  documentFolderId: '1YbGK3ReFpsx1H3cZEOL_CGRO_2vIBUhVvUYhgO-kv18D0t3r2v7T2RXWeF3KubSQevyjXzfC'
});

function response_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeCpf_(value) {
  return String(value || '').replace(/\D/g, '');
}

function duplicateCode_(sheet, cpf, cpfColumn, statusColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';
  const width = Math.max(cpfColumn, statusColumn);
  const values = sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (normalizeCpf_(values[index][cpfColumn - 1]) !== cpf) continue;
    const status = String(values[index][statusColumn - 1] || '').trim().toUpperCase();
    if (['PENDENTE', 'AGUARDANDO', 'AGENDADO'].includes(status)) return 'DUPLICATE_PENDING';
    if (['REALIZADO', 'CADASTRADO', 'CONCLUÍDO', 'CONCLUIDO'].includes(status)) return 'DUPLICATE_COMPLETED';
    if (status !== 'CANCELADO') return 'DUPLICATE_PENDING';
    return '';
  }
  return '';
}

function safeFileName_(value) {
  return String(value || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 100);
}

function saveFiles_(files, folderId, prefix) {
  if (!Array.isArray(files) || !files.length) return '';
  const folder = DriveApp.getFolderById(folderId);
  return files.map(function(item, index) {
    const bytes = Utilities.base64Decode(String(item.base64 || ''));
    const blob = Utilities.newBlob(
      bytes,
      String(item.type || 'application/octet-stream'),
      safeFileName_(prefix + '_' + (index + 1) + '_' + item.name)
    );
    return folder.createFile(blob).getUrl();
  }).join('|||');
}

function appendTimed_(payload) {
  const config = CONFIG.timed;
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  const cpf = normalizeCpf_(payload.cpf);
  const duplicate = duplicateCode_(sheet, cpf, config.cpfColumn, config.statusColumn);
  if (duplicate) return { ok: false, code: duplicate };
  const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss');
  const councilLinks = saveFiles_(payload.councilFiles, CONFIG.councilFolderId, cpf + '_conselho_' + stamp);
  const documentLinks = saveFiles_(payload.documentFiles, CONFIG.documentFolderId, cpf + '_documento_' + stamp);
  sheet.appendRow([
    new Date(),
    payload.email,
    payload.phone,
    payload.name,
    payload.sex,
    payload.birthDate,
    cpf,
    payload.cns,
    payload.councilNumber,
    payload.jobTitle,
    payload.employment,
    payload.registration,
    payload.specialty,
    payload.location,
    councilLinks,
    documentLinks,
    'PENDENTE',
    '',
    ''
  ]);
  return { ok: true, protocol: 'TIMED-' + stamp };
}

function appendTraining_(payload) {
  const config = CONFIG.training;
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss');
  sheet.appendRow([
    new Date(),
    payload.email,
    payload.name,
    payload.location,
    payload.jobTitle,
    payload.phone,
    '',
    '',
    payload.topic,
    payload.desiredAt,
    '',
    '',
    '',
    ''
  ]);
  return { ok: true, protocol: 'TREINAMENTO-' + stamp };
}

function appendAd_(payload) {
  const config = CONFIG.ad;
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  const cpf = normalizeCpf_(payload.cpf);
  const duplicate = duplicateCode_(sheet, cpf, config.cpfColumn, config.statusColumn);
  if (duplicate) return { ok: false, code: duplicate };
  const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss');
  sheet.appendRow([new Date(), payload.name, cpf, payload.phone, payload.email, 'PENDENTE', '']);
  return { ok: true, protocol: 'AD-' + stamp };
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    const request = JSON.parse(event && event.postData ? event.postData.contents : '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!expectedSecret || request.secret !== expectedSecret) {
      return response_({ ok: false, code: 'UNAUTHORIZED' });
    }
    if (!lock.tryLock(15000)) return response_({ ok: false, code: 'BUSY' });
    const payload = request.payload || {};
    if (payload.type === 'timed') return response_(appendTimed_(payload));
    if (payload.type === 'training') return response_(appendTraining_(payload));
    if (payload.type === 'ad') return response_(appendAd_(payload));
    return response_({ ok: false, code: 'INVALID_REQUEST' });
  } catch (error) {
    console.error('Falha sanitizada no recebimento: ' + String(error && error.message || 'erro').slice(0, 200));
    return response_({ ok: false, code: 'TEMPORARILY_UNAVAILABLE' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function testConfiguration() {
  Object.keys(CONFIG).filter(function(key) {
    return ['timed', 'training', 'ad'].includes(key);
  }).forEach(function(key) {
    const config = CONFIG[key];
    const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
    if (!sheet) throw new Error('Aba não encontrada: ' + key);
  });
  DriveApp.getFolderById(CONFIG.councilFolderId).getName();
  DriveApp.getFolderById(CONFIG.documentFolderId).getName();
  return 'CONFIGURATION_OK';
}
