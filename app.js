const INTAKE_URL = 'https://cctygrudsyoowuotlyfo.supabase.co/functions/v1/google-sheets-intake';
const MAX_FILE_BYTES = 300_000;
const MAX_TOTAL_FILES = 4;
const MAX_REQUEST_BYTES = 2_300_000;
const REQUEST_TIMEOUT_MS = 120_000;
const PORTAL_SERVICES = Object.freeze([
    {
        id: 'suporte',
        title: 'Abra seu chamado',
        description: 'Acesse o canal para realizar a abertura do seu chamado.',
        action: 'Acessar suporte',
        type: 'external',
        url: 'https://chat.whatsapp.com/BP3FAoRrdva8NfVKnBn72R',
        icon: 'support',
        accent: 'whatsapp'
    },
    {
        id: 'cadastro-timed',
        title: 'Solicitar Cadastro TIMED',
        description: 'Solicite o cadastro de novos colaboradores no Prontuário Eletrônico.',
        action: 'Abrir formulário',
        type: 'internal',
        screen: 'tela-cadastro',
        icon: 'clipboard'
    },
    {
        id: 'login-ad',
        title: 'Solicitar Login de Computador',
        description: '⚠️ Atenção: Para os andares 2 / 3 / 10 UPI / UPE 3 Andar Ambulatório / Trauma, a senha e o usuário são padrão. Solicite diretamente à chefia do setor.',
        action: 'Abrir formulário',
        type: 'internal',
        screen: 'tela-login-ad',
        icon: 'computer'
    },
    {
        id: 'treinamento',
        title: 'Solicitar Treinamento',
        description: 'Agende um treinamento sobre TIMED (Prontuário Eletrônico).',
        action: 'Abrir formulário',
        type: 'internal',
        screen: 'tela-treinamento',
        icon: 'training'
    },
    {
        id: 'ficha-cadastral-scnes',
        title: 'Ficha Cadastral Scnes',
        description: 'Preencha ou atualize as informações necessárias para o cadastro SCNES.',
        action: 'Acessar formulário',
        type: 'external',
        url: 'https://docs.google.com/forms/d/e/1FAIpQLSeFDKRmd9reMR23-mzcGnbiOy43PE_XRag0qC4Za2ZN2CFGtg/viewform',
        icon: 'identification'
    }
]);

const SERVICE_ICONS = Object.freeze({
    clipboard: '<path d="M9 5h6m-5-2h4a1 1 0 0 1 1 1v2H9V4a1 1 0 0 1 1-1Z"/><path d="M9 5H7a2 2 0 0 0-2 2v12h14V7a2 2 0 0 0-2-2h-2M8 11h8M8 15h5"/>',
    computer: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4M7 8h10"/>',
    training: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6"/>',
    support: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h4v-5H4Zm12 0v5h4v-5h-4ZM8 21h5a3 3 0 0 0 3-3"/>',
    identification: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.8-2 4.2-2 5 0M13 10h5m-5 4h5"/>'
});

let navigationLocked = false;

function serviceIcon(name, label) {
    const paths = SERVICE_ICONS[name] || SERVICE_ICONS.clipboard;
    return `<span class="service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${paths}</svg></span><span class="sr-only">${label}</span>`;
}

function serviceCardContent(service) {
    return `
        ${serviceIcon(service.icon, `Ícone de ${service.title}`)}
        <span class="service-copy">
            <strong class="service-title">${service.title}</strong>
            <span class="service-description">${service.description}</span>
        </span>
        <span class="service-action">${service.action}<span aria-hidden="true">→</span></span>
    `;
}

function openInternalService(service) {
    if (navigationLocked) return;
    navigationLocked = true;
    const target = document.getElementById(service.screen);
    if (!target) {
        console.error(`Tela não encontrada para o serviço: ${service.id}`);
        window.mostrarAviso('Não foi possível abrir este formulário. Tente novamente.', 'erro');
        navigationLocked = false;
        return;
    }
    window.mostrarTela(service.screen);
    window.setTimeout(() => { navigationLocked = false; }, 250);
}

function renderPortalServices() {
    const grid = document.getElementById('menu-principal');
    if (!grid) {
        console.error('Container do Portal de Serviços não encontrado.');
        return;
    }
    const fragment = document.createDocumentFragment();
    PORTAL_SERVICES.forEach(service => {
        const element = document.createElement(service.type === 'external' ? 'a' : 'button');
        element.className = `menu-card${service.accent ? ` ${service.accent}` : ''}`;
        element.dataset.serviceId = service.id;
        element.setAttribute('aria-label', `${service.action}: ${service.title}`);
        element.innerHTML = serviceCardContent(service);
        if (service.type === 'external') {
            element.href = service.url;
            element.target = '_blank';
            element.rel = 'noopener noreferrer';
        } else {
            element.type = 'button';
            element.addEventListener('click', () => openInternalService(service));
        }
        fragment.appendChild(element);
    });
    grid.replaceChildren(fragment);
}

function normalizeJobRole(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function getAvailableJobRoles() {
    const source = document.getElementById('job-role-options');
    const seen = new Set();

    return Array.from(source?.content.querySelectorAll('option') || [])
        .map((option) => normalizeJobRole(option.value))
        .filter((role) => {
            const normalizedKey = role
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase('pt-BR');

            if (!role || seen.has(normalizedKey)) {
                return false;
            }

            seen.add(normalizedKey);
            return true;
        });
}

function loadJobRoleOptions() {
    const roles = getAvailableJobRoles();

    document.querySelectorAll('[data-job-role-select]').forEach((select) => {
        const currentValue = normalizeJobRole(select.value);
        const options = document.createDocumentFragment();
        options.appendChild(new Option('Selecione o cargo', ''));

        roles.forEach((role) => {
            options.appendChild(new Option(role, role));
        });

        select.replaceChildren(options);
        if (roles.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

function initializePortal() {
    loadJobRoleOptions();
    renderPortalServices();
}

let portalNotificationTimer = null;

window.showPortalNotification = function({
    type = 'info',
    message = '',
    duration = 3000
} = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    if (portalNotificationTimer) clearTimeout(portalNotificationTimer);
    container.replaceChildren();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'erro' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'erro' ? 'assertive' : 'polite');
    const titles = { erro: 'Não foi possível enviar', sucesso: 'Tudo certo!', aviso: 'Atenção', info: 'Sistema' };
    const content = document.createElement('div');
    content.className = 'toast-content';
    const title = document.createElement('span');
    title.className = 'toast-title';
    title.textContent = titles[type] || titles.info;
    const messageElement = document.createElement('span');
    messageElement.textContent = String(message || '');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Fechar notificação');
    close.textContent = '×';
    const dismiss = () => {
        if (portalNotificationTimer) clearTimeout(portalNotificationTimer);
        portalNotificationTimer = null;
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };
    close.addEventListener('click', dismiss);
    content.append(title, messageElement);
    toast.append(content, close);
    container.appendChild(toast);
    portalNotificationTimer = setTimeout(dismiss, duration);
};

window.mostrarAviso = function(mensagem, tipo = 'info') {
    window.showPortalNotification({
        type: tipo,
        message: mensagem,
        duration: 3000
    });
};

window.alert = function(mensagem) {
    const clean = String(mensagem || '').replace(/[✅❌⚠️💡]/g, '').trim();
    const lower = clean.toLowerCase();
    const type = lower.includes('erro') || lower.includes('não foi possível') ? 'erro'
        : lower.includes('sucesso') ? 'sucesso'
            : lower.includes('atenção') || lower.includes('já ') ? 'aviso' : 'info';
    window.mostrarAviso(clean, type);
};

window.mostrarTela = function(idTela) {
    for (const id of ['menu-principal', 'tela-cadastro', 'tela-treinamento', 'tela-login-ad']) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    }
    const target = document.getElementById(idTela);
    if (target) {
        target.style.display = idTela === 'menu-principal' ? 'grid' : 'block';
        window.scrollTo(0, 0);
        const focusTarget = idTela === 'menu-principal'
            ? target.querySelector('.menu-card')
            : target.querySelector('h2');
        if (focusTarget) {
            if (focusTarget.matches('h2')) focusTarget.tabIndex = -1;
            focusTarget.focus({ preventScroll: true });
        }
    }
};

window.toggleConselho = function() {
    const requiresCouncil = document.getElementById('cad_tem_conselho').value === 'sim';
    const block = document.getElementById('bloco_conselho');
    const number = document.getElementById('cad_num_conselho');
    const files = document.getElementById('cad_foto_conselho');
    block.style.display = requiresCouncil ? 'flex' : 'none';
    number.required = requiresCouncil;
    files.required = requiresCouncil;
    if (!requiresCouncil) {
        number.value = 'ISENTO';
        files.value = '';
    } else if (number.value === 'ISENTO') {
        number.value = '';
    }
};

window.mascaraCPF = function(input) {
    let value = input.value.replace(/\D/g, '').slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = value;
};

window.mascaraTelefone = function(input) {
    let value = input.value.replace(/\D/g, '').slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    input.value = value;
};

window.atualizarAndaresEx = function(buildingId, floorId) {
    const building = document.getElementById(buildingId).value;
    const floor = document.getElementById(floorId);
    const options = {
        UPI: ['SL CTI 1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar'],
        UPE: ['1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar'],
        PIMAG: ['1º Andar', '2º Andar', '3º Andar', '4º Andar'],
        RADIOTERAPIA: ['Térreo'],
        TRAUMA: ['1º Andar', '2º Andar', '3º Andar'],
        'CASA ROSA': ['1º Andar', '2º Andar']
    };
    floor.replaceChildren(new Option('Selecione...', ''));
    for (const value of options[building] || []) floor.add(new Option(value, value));
};

function loading(active) {
    document.getElementById('loader').style.display = active ? 'flex' : 'none';
    document.querySelectorAll('.submit-btn').forEach(button => { button.disabled = active; });
}

function fullName(value) {
    return String(value || '').trim().split(/\s+/).length >= 2;
}

function buildLocation(prefix) {
    const building = document.getElementById(`${prefix}_predio`).value;
    const floor = document.getElementById(`${prefix}_andar`).value;
    const sector = document.getElementById(`${prefix}_setor`).value.trim();
    return `${building} - ${sector} (${floor})`;
}

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
}

async function prepareFiles(input) {
    const files = Array.from(input?.files || []).slice(0, 4);
    const result = [];
    for (const original of files) {
        if (!/^(image\/(?:jpeg|png|webp)|application\/pdf)$/.test(original.type)) {
            throw new Error('Envie somente imagens JPG, PNG, WEBP ou arquivos PDF.');
        }
        let processed = original;
        if (original.type.startsWith('image/')) {
            processed = await imageCompression(original, {
                maxSizeMB: 0.25,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            });
        }
        if (processed.size > MAX_FILE_BYTES) {
            throw new Error(`O arquivo “${original.name}” excede o limite após a compactação.`);
        }
        result.push({
            name: original.name,
            type: original.type,
            base64: toBase64(await processed.arrayBuffer())
        });
    }
    return result;
}

function errorMessage(code, type) {
    if (code === 'DUPLICATE_PENDING') {
        return type === 'ad'
            ? 'Sua solicitação de Login já está na fila. Aguarde o retorno da equipe de T.I.'
            : 'Você já possui uma solicitação de TIMED em andamento. Aguarde o processamento pela T.I.';
    }
    if (code === 'DUPLICATE_COMPLETED') {
        return type === 'ad'
            ? 'Já existe uma conta ativa para este CPF. Para recuperar o acesso, solicite o reset da senha.'
            : 'Já existe um cadastro TIMED para este CPF. Caso não tenha acesso, solicite o reset da senha.';
    }
    if (code === 'PAYLOAD_TOO_LARGE') return 'Os arquivos enviados excedem o limite permitido.';
    if (code === 'INVALID_REQUEST') return 'Revise os campos informados e tente novamente.';
    return 'Não foi possível enviar agora. Tente novamente em alguns instantes.';
}

async function submit(payload) {
    const serializedPayload = JSON.stringify(payload);
    if (new TextEncoder().encode(serializedPayload).byteLength > MAX_REQUEST_BYTES) {
        const error = new Error(errorMessage('PAYLOAD_TOO_LARGE', payload.type));
        error.code = 'PAYLOAD_TOO_LARGE';
        throw error;
    }
    let response;
    try {
        response = await fetch(INTAKE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: serializedPayload,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
    } catch (error) {
        if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
            throw new Error('A solicitação demorou mais que o esperado. Verifique sua conexão e tente novamente.');
        }
        console.error('Falha de rede ao enviar solicitação:', error?.name || 'erro');
        throw new Error('Não foi possível enviar agora. Verifique sua conexão e tente novamente.');
    }
    const result = await response.json().catch(() => ({ ok: false, code: 'INVALID_RESPONSE' }));
    if (!response.ok || !result.ok) {
        const error = new Error(errorMessage(result.code, payload.type));
        error.code = result.code;
        throw error;
    }
    return result;
}

window.enviarTreinamento = async function(event) {
    event.preventDefault();
    const name = document.getElementById('tr_nome').value.trim();
    if (!fullName(name)) return alert('Informe seu nome e sobrenome completos.');
    loading(true);
    try {
        await submit({
            type: 'training',
            name,
            email: document.getElementById('tr_email').value,
            phone: document.getElementById('tr_telefone').value,
            jobTitle: document.getElementById('tr_cargo').value,
            location: buildLocation('tr'),
            topic: document.getElementById('tr_tema').value,
            desiredAt: document.getElementById('tr_data').value,
            website: document.getElementById('tr_website').value
        });
        mostrarAviso('Solicitação enviada com sucesso.', 'sucesso');
        document.getElementById('form-tr').reset();
        window.mostrarTela('menu-principal');
    } catch (error) {
        mostrarAviso(
            error.code?.startsWith('DUPLICATE_')
                ? error.message
                : 'Não foi possível enviar a solicitação. Tente novamente.',
            error.code?.startsWith('DUPLICATE_') ? 'aviso' : 'erro'
        );
    } finally {
        loading(false);
    }
};

window.enviarCadastro = async function(event) {
    event.preventDefault();
    const name = document.getElementById('cad_nome').value.trim();
    if (!fullName(name)) return alert('Informe seu nome e sobrenome completos para o cadastro.');
    loading(true);
    try {
        const councilFiles = await prepareFiles(document.getElementById('cad_foto_conselho'));
        const documentFiles = await prepareFiles(document.getElementById('cad_foto_documento'));
        if (councilFiles.length + documentFiles.length > MAX_TOTAL_FILES) {
            const error = new Error(`Envie no máximo ${MAX_TOTAL_FILES} arquivos no total.`);
            error.code = 'PAYLOAD_TOO_LARGE';
            throw error;
        }
        const payload = {
            type: 'timed',
            name,
            email: document.getElementById('cad_email').value,
            phone: document.getElementById('cad_telefone').value,
            sex: document.getElementById('cad_sexo').value,
            birthDate: document.getElementById('cad_nascimento').value,
            cpf: document.getElementById('cad_cpf').value,
            cns: document.getElementById('cad_cns').value,
            councilNumber: document.getElementById('cad_num_conselho').value,
            jobTitle: document.getElementById('cad_cargo').value,
            specialty: document.getElementById('cad_especialidade').value,
            employment: document.getElementById('cad_vinculo').value,
            registration: document.getElementById('cad_matricula').value,
            location: buildLocation('cad'),
            councilFiles,
            documentFiles,
            website: document.getElementById('cad_website').value
        };
        await submit(payload);
        mostrarAviso('Solicitação enviada com sucesso.', 'sucesso');
        document.getElementById('form-cad').reset();
        window.mostrarTela('menu-principal');
    } catch (error) {
        mostrarAviso(
            error.code?.startsWith('DUPLICATE_')
                ? error.message
                : 'Não foi possível enviar a solicitação. Tente novamente.',
            error.code?.startsWith('DUPLICATE_') ? 'aviso' : 'erro'
        );
    } finally {
        loading(false);
    }
};

window.enviarLoginAD = async function(event) {
    event.preventDefault();
    const name = document.getElementById('ad_nome').value.trim();
    if (!fullName(name)) return alert('Informe seu nome e sobrenome completos para criar o Login.');
    loading(true);
    try {
        await submit({
            type: 'ad',
            name,
            cpf: document.getElementById('ad_cpf').value,
            email: document.getElementById('ad_email').value,
            phone: document.getElementById('ad_telefone').value,
            jobTitle: document.getElementById('ad_cargo').value,
            sector: document.getElementById('ad_setor').value,
            website: document.getElementById('ad_website').value
        });
        mostrarAviso('Solicitação enviada com sucesso.', 'sucesso');
        document.getElementById('form-ad').reset();
        window.mostrarTela('menu-principal');
    } catch (error) {
        mostrarAviso(
            error.code?.startsWith('DUPLICATE_')
                ? error.message
                : 'Não foi possível enviar a solicitação. Tente novamente.',
            error.code?.startsWith('DUPLICATE_') ? 'aviso' : 'erro'
        );
    } finally {
        loading(false);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePortal, { once: true });
} else {
    initializePortal();
}
