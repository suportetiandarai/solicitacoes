// ==========================================
// 0. SISTEMA DE AVISOS INTERATIVOS (TOASTS)
// ==========================================
window.mostrarAviso = function(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    let icone = '💡';
    let titulo = 'Sistema';

    if (tipo === 'erro') { icone = '❌'; titulo = 'Ops, deu erro'; }
    else if (tipo === 'sucesso') { icone = '✅'; titulo = 'Tudo certo!'; }
    else if (tipo === 'aviso') { icone = '⚠️'; titulo = 'Atenção'; }

    toast.innerHTML = `<span class="toast-icon">${icone}</span><div class="toast-content"><span class="toast-title">${titulo}</span><span>${mensagem}</span></div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4500);
};

window.alert = function(mensagem) {
    let tipo = 'info';
    let msgLimpa = mensagem;
    
    if (mensagem.toLowerCase().includes('erro') || mensagem.includes('❌')) tipo = 'erro';
    else if (mensagem.toLowerCase().includes('sucesso') || mensagem.includes('✅')) tipo = 'sucesso';
    else if (mensagem.toLowerCase().includes('atenção') || mensagem.includes('⚠️')) tipo = 'aviso';
    
    msgLimpa = mensagem.replace(/[✅❌⚠️💡]/g, '').trim();
    mostrarAviso(msgLimpa, tipo);
};

// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE 
// ==========================================
const SUPABASE_URL = 'https://ygnphizpnhcsblmwzmzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbnBoaXpwbmhjc2JsbXd6bXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzUyNjAsImV4cCI6MjA5MjAxMTI2MH0.hLhpjB5WUDzZX1MRIPVzPVFgq8mcHmnhkhWreAjEFXI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONTROLE DA TELA E MÁSCARAS
// ==========================================

window.mostrarTela = function(idTela) {
    const telas = ['menu-principal', 'tela-cadastro', 'tela-treinamento', 'tela-login-ad'];
    telas.forEach(t => {
        const el = document.getElementById(t);
        if (el) el.style.display = 'none';
    });
    
    const alvo = document.getElementById(idTela);
    if (alvo) {
        alvo.style.display = (idTela === 'menu-principal') ? 'flex' : 'block';
        window.scrollTo(0,0);
    }
};

window.toggleConselho = function() {
    const select = document.getElementById('cad_tem_conselho').value;
    const bloco = document.getElementById('bloco_conselho');
    const num = document.getElementById('cad_num_conselho');
    const foto = document.getElementById('cad_foto_conselho');
    const fotoVerso = document.getElementById('cad_foto_conselho_verso'); // NOVO

    if (select === 'sim') {
        bloco.style.display = 'flex';
        num.required = true;
        foto.required = true;
        fotoVerso.required = true;
    } else {
        bloco.style.display = 'none';
        num.required = false;
        foto.required = false;
        fotoVerso.required = false;
        num.value = 'ISENTO'; 
        foto.value = ''; 
        fotoVerso.value = '';
    }
};

window.mascaraCPF = function(cpf) {
    let v = cpf.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    cpf.value = v;
};

window.mascaraTelefone = function(tel) {
    let v = tel.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    tel.value = v;
};

window.atualizarAndaresEx = function(predioId, andarId) {
    const predio = document.getElementById(predioId).value; 
    const selectAndar = document.getElementById(andarId); 
    selectAndar.innerHTML = '<option value="">Selecione...</option>';
    let andares = [];
    
    if (predio === 'UPI') andares = ['SL CTI 1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar', '6º Andar', '7º Andar', '8º Andar', '9º Andar', '10º Andar', '11º Andar', '12º Andar', '13º Andar'];
    else if (predio === 'UPE') andares = ['1º Andar', '2º Andar', '3º Andar', '4º Andar', '5º Andar'];
    else if (predio === 'PIMAG') andares = ['1º Andar', '2º Andar', '3º Andar', '4º Andar'];
    else if (predio === 'RADIOTERAPIA') andares = ['Térreo'];
    else if (predio === 'TRAUMA') andares = ['1º Andar', '2º Andar', '3º Andar'];
    else if (predio === 'CASA ROSA') andares = ['1º Andar', '2º Andar'];
    
    andares.forEach(a => { 
        const opt = document.createElement('option'); 
        opt.value = a; 
        opt.textContent = a; 
        selectAndar.appendChild(opt); 
    });
};

function loading(estado) {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = estado ? 'flex' : 'none';
    const botoes = document.querySelectorAll('.submit-btn');
    botoes.forEach(b => b.disabled = estado);
}

// ==========================================
// 3. COMPRESSÃO E UPLOAD
// ==========================================
// ==========================================
// 3. COMPRESSÃO E UPLOAD (MULTILINE)
// ==========================================
async function comprimirEEnviarFoto(fileInput, prefixoNome) {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return null;

    let urlsGeradas = []; // Cria uma lista vazia para guardar os links

    // 🟢 LOOP MÁGICO: Passa por todos os arquivos que o usuário selecionou no campo
    for (let i = 0; i < fileInput.files.length; i++) {
        const arquivoOriginal = fileInput.files[i];
        const ePDF = arquivoOriginal.type === 'application/pdf';

        try {
            let arquivoParaUpload;

            if (ePDF) {
                console.log(`Arquivo PDF detectado. Enviando direto...`);
                arquivoParaUpload = arquivoOriginal;
            } else {
                console.log(`Imagem detectada. Comprimindo...`);
                const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true };
                arquivoParaUpload = await imageCompression(arquivoOriginal, options);
            }
            
            const nomeLimpo = arquivoOriginal.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
            // Colocamos o "i" (número) no nome para o Supabase não sobrepor a frente e o verso
            const nomeArquivo = `${prefixoNome}_${i}_${Date.now()}_${nomeLimpo}`;

            const { data, error } = await supabaseClient.storage.from('documentos_externos').upload(nomeArquivo, arquivoParaUpload);
            if (error) throw error;
            
            // Guarda o link gerado na nossa lista
            urlsGeradas.push(supabaseClient.storage.from('documentos_externos').getPublicUrl(nomeArquivo).data.publicUrl);

        } catch (error) {
            console.error(`Erro no processamento:`, error);
            throw new Error(`Não foi possível processar um dos arquivos. Tente novamente.`);
        }
    }

    // 🟢 Junta todas as URLs geradas separando-as por "|||" e envia pro banco
    return urlsGeradas.join('|||');
}

// ==========================================
// 4. ENVIO DOS FORMULÁRIOS
// ==========================================
window.enviarTreinamento = async function(event) {
    event.preventDefault();
    loading(true);

    const predio = document.getElementById('tr_predio').value;
    const andar = document.getElementById('tr_andar').value;
    const setorInput = document.getElementById('tr_setor').value;
    const localizacaoFormatada = `${predio} - ${setorInput} (${andar})`;

    const dados = {
        nome_solicitante: document.getElementById('tr_nome').value,
        email: document.getElementById('tr_email').value,
        telefone: document.getElementById('tr_telefone').value,
        cargo: document.getElementById('tr_cargo').value,
        setor_andar: localizacaoFormatada, 
        tema: document.getElementById('tr_tema').value,
        data_desejada: document.getElementById('tr_data').value || null,
        status: 'Pendente'
    };

    try {
        const { error } = await supabaseClient.from('solicitacoes_treinamento').insert([dados]);
        if (error) throw error;

        alert("✅ Solicitação de treinamento enviada com sucesso!");
        document.getElementById('form-tr').reset();
        window.mostrarTela('menu-principal');
    } catch (err) {
        alert("❌ Erro ao enviar treinamento: " + err.message);
    } finally {
        loading(false);
    }
};

window.enviarCadastro = async function(event) {
    event.preventDefault();
    loading(true);

    try {
        let urlConselhoFinal = null;
        if (document.getElementById('cad_tem_conselho').value === 'sim') {
            // Sobe a Frente
            const urlFrente = await comprimirEEnviarFoto(document.getElementById('cad_foto_conselho'), 'conselho_frente');
            // Sobe o Verso
            const urlVerso = await comprimirEEnviarFoto(document.getElementById('cad_foto_conselho_verso'), 'conselho_verso');
            
            // Cola os dois links com o nosso separador mágico "|||"
            if (urlFrente && urlVerso) {
                urlConselhoFinal = urlFrente + "|||" + urlVerso;
            } else {
                urlConselhoFinal = urlFrente || urlVerso;
            }
        }

        const predio = document.getElementById('cad_predio').value;
        const andar = document.getElementById('cad_andar').value;
        const setorInput = document.getElementById('cad_setor').value;
        const localizacaoFormatada = `${predio} - ${setorInput} (${andar})`;

        const dados = {
            nome: document.getElementById('cad_nome').value,
            email: document.getElementById('cad_email').value,
            telefone: document.getElementById('cad_telefone').value,
            sexo: document.getElementById('cad_sexo').value,
            data_nascimento: document.getElementById('cad_nascimento').value,
            cpf: document.getElementById('cad_cpf').value,
            cns: document.getElementById('cad_cns').value || null,
            numero_conselho: document.getElementById('cad_num_conselho').value || 'ISENTO',
            cargo: document.getElementById('cad_cargo').value,
            especialidade: document.getElementById('cad_especialidade').value || null,
            vinculo_empregaticio: document.getElementById('cad_vinculo').value,
            matricula: document.getElementById('cad_matricula').value || null,
            setor_andar: localizacaoFormatada, 
            foto_documento_url: null, 
            foto_conselho_url: urlConselhoFinal, // 🟢 Envia as duas URLs coladas aqui
            status: 'Pendente'
        };

        const { error } = await supabaseClient.from('solicitacoes_cadastro').insert([dados]);
        if (error) throw error;

        alert("✅ Cadastro enviado com sucesso!");
        document.getElementById('form-cad').reset();
        window.mostrarTela('menu-principal');

    } catch (err) {
        alert("❌ Erro ao enviar: " + err.message);
    } finally {
        loading(false);
    }
};

window.enviarLoginAD = async function(event) {
    event.preventDefault();
    loading(true);

    const dados = {
        nome_completo: document.getElementById('ad_nome').value,
        cpf: document.getElementById('ad_cpf').value,
        email: document.getElementById('ad_email').value,
        telefone: document.getElementById('ad_telefone').value,
        status: 'Pendente'
    };

    try {
        const { error } = await supabaseClient.from('solicitacoes_ad').insert([dados]);
        if (error) throw error;

        alert("✅ Solicitação de login enviada com sucesso! Aguarde o retorno da equipe de T.I.");
        document.getElementById('form-ad').reset();
        window.mostrarTela('menu-principal');
    } catch (err) {
        alert("❌ Erro ao enviar solicitação: " + err.message);
    } finally {
        loading(false);
    }
};
