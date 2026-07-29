const CONFIG = Object.freeze({
  timed: {
    spreadsheetId: '1EVGXL_NUV_koXR1mH_X4z_YqVmsaLytCX84ONYTzD9I',
    sheetName: 'Respostas ao formulário 1',
    cpfColumn: 7,
    statusColumn: 17,
    statusUpdatedAtColumn: 20,
    completedAtColumn: 21,
    lastColumn: 21
  },
  training: {
    spreadsheetId: '1vcNxK3VQ4TwIxdHWWPCQcyYY6nS1MfRLFw9c8lxza_U',
    sheetName: 'Respostas ao formulário 1',
    statusColumn: 11,
    statusUpdatedAtColumn: 15,
    completedAtColumn: 16,
    lastColumn: 16
  },
  ad: {
    spreadsheetId: '1_j13tglIFAWDcvLx2dsMGLugThdrrzbjKHYNt9H5Qj4',
    sheetName: 'SOLICITACÕES AD',
    cpfColumn: 3,
    statusColumn: 6,
    statusUpdatedAtColumn: 8,
    completedAtColumn: 9,
    lastColumn: 9
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

function normalizeRequestStatus_(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const aliases = {
    realizados: 'realizado',
    realizada: 'realizado',
    realizadas: 'realizado',
    pendentes: 'pendente',
    nao_realizados: 'nao_realizado',
    nao_realizadas: 'nao_realizado',
    agendados: 'agendado',
    agendadas: 'agendado',
    nao_agendados: 'nao_agendado',
    nao_agendadas: 'nao_agendado'
  };
  return aliases[normalized] || normalized;
}

function isCompletedStatus_(source, status) {
  const normalized = normalizeRequestStatus_(status);
  if (source === 'ad') return ['realizado', 'ja_existente'].includes(normalized);
  return ['realizado', 'cadastrado', 'concluido'].includes(normalized);
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

function findNextAvailableRequestRow_(sheet, keyColumns) {
  const firstDataRow = 2;
  const maxRows = Math.max(firstDataRow, sheet.getMaxRows());
  const height = maxRows - firstDataRow + 1;
  const keyValues = keyColumns.map(function(column) {
    return sheet.getRange(firstDataRow, column, height, 1).getDisplayValues();
  });
  let lastOccupiedRow = firstDataRow - 1;
  for (let offset = 0; offset < height; offset += 1) {
    const occupied = keyValues.some(function(values) {
      return String(values[offset][0] || '').trim() !== '';
    });
    if (occupied) lastOccupiedRow = firstDataRow + offset;
  }
  const nextRow = lastOccupiedRow + 1;
  if (nextRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
  return nextRow;
}

function writeRequestRow_(sheet, config, values, keyColumns) {
  if (values.length !== config.lastColumn) {
    throw new Error('Quantidade de colunas inválida para a solicitação.');
  }
  const row = findNextAvailableRequestRow_(sheet, keyColumns);
  sheet.getRange(row, 1, 1, config.lastColumn).setValues([values]);
  return row;
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
  writeRequestRow_(sheet, config, [
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
    '',
    '',
    '',
    '',
    ''
  ], [1, 4, 7]);
  return { ok: true, protocol: 'TIMED-' + stamp };
}

function appendTraining_(payload) {
  const config = CONFIG.training;
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss');
  writeRequestRow_(sheet, config, [
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
    '',
    '',
    ''
  ], [1, 3]);
  return { ok: true, protocol: 'TREINAMENTO-' + stamp };
}

function appendAd_(payload) {
  const config = CONFIG.ad;
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  const cpf = normalizeCpf_(payload.cpf);
  const duplicate = duplicateCode_(sheet, cpf, config.cpfColumn, config.statusColumn);
  if (duplicate) return { ok: false, code: duplicate };
  const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss');
  writeRequestRow_(
    sheet,
    config,
    [new Date(), payload.name, cpf, payload.phone, payload.email, '', '', '', ''],
    [1, 2, 3]
  );
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

function validateSheet_(source) {
  const config = CONFIG[source];
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  if (!sheet) throw new Error('Aba não encontrada: ' + source);
}

function configureStatusAutomation() {
  ['timed', 'training', 'ad'].forEach(validateSheet_);

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'handleStatusEdit') ScriptApp.deleteTrigger(trigger);
  });
  ['timed', 'training', 'ad'].forEach(function(source) {
    ScriptApp.newTrigger('handleStatusEdit')
      .forSpreadsheet(CONFIG[source].spreadsheetId)
      .onEdit()
      .create();
  });
  return 'STATUS_AUTOMATION_OK';
}

function handleStatusEdit(event) {
  if (!event || !event.range) return;
  const spreadsheetId = event.source.getId();
  const source = ['timed', 'training', 'ad'].find(function(candidate) {
    return CONFIG[candidate].spreadsheetId === spreadsheetId;
  });
  if (!source) return;
  const config = CONFIG[source];
  const range = event.range;
  if (range.getSheet().getName() !== config.sheetName ||
      range.getColumn() !== config.statusColumn ||
      range.getRow() < 2) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Não foi possível registrar a alteração de status.');
  try {
    const now = new Date();
    for (let offset = 0; offset < range.getNumRows(); offset += 1) {
      const row = range.getRow() + offset;
      const status = range.getSheet().getRange(row, config.statusColumn).getDisplayValue();
      range.getSheet().getRange(row, config.statusUpdatedAtColumn).setValue(now);
      range.getSheet().getRange(row, config.completedAtColumn)
        .setValue(isCompletedStatus_(source, status) ? now : '');
    }
  } finally {
    lock.releaseLock();
  }
}
