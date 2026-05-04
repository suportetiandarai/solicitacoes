// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ygnphizpnhcsblmwzmzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbnBoaXpwbmhjc2JsbXd6bXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzUyNjAsImV4cCI6MjA5MjAxMTI2MH0.hLhpjB5WUDzZX1MRIPVzPVFgq8mcHmnhkhWreAjEFXI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONTROLE DA TELA E MÁSCARAS
// ==========================================
function mostrarTela(idTela) {
    const telas = ['menu-principal', 'tela-cadastro', 'tela-treinamento'];
    telas.forEach(t => {
        const el = document.getElementById(t);
        if (el) el.style.display = 'none';
    });
    
    const alvo = document.getElementById(idTela);
    if (alvo) {
        alvo.style.display = (idTela === 'menu-principal') ? 'flex' : 'block';
        window.scrollTo(0,0);
    }
}

function toggleConselho() {
    const select = document.getElementById('cad_tem_conselho').value;
    const bloco = document.getElementById('bloco_conselho');
    const num = document.getElementById('cad_num_conselho');
    const foto = document.getElementById('cad_foto_conselho');

    if (select === 'sim') {
        bloco.style.display = 'flex';
        num.required = true;
        foto.required = true;
    } else {
        bloco.style.display = 'none';
        num.required = false;
        foto.required = false;
        num.value = 'ISENTO'; 
        foto.value = ''; 
    }
}

function mascaraCPF(cpf) {
    let v = cpf.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    cpf.value = v;
}

function mascaraTelefone(tel) {
    let v = tel.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    tel.value = v;
}

function loading(estado) {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = estado ? 'block' : 'none';
    const botoes = document.querySelectorAll('.submit-btn');
    botoes.forEach(b => b.disabled = estado);
}

// ==========================================
// 3. INTELIGÊNCIA: COMPRESSÃO E UPLOAD
// ==========================================
async function comprimirEEnviarFoto(fileInput, prefixoNome) {
    if (!fileInput.files || fileInput.files.length === 0) return null;

    const arquivoOriginal = fileInput.files[0];
    const options = {
        maxSizeMB: 0.2, // Máximo 200KB
        maxWidthOrHeight: 1920,
        useWebWorker: true
    };

    try {
        console.log(`Comprimindo ${prefixoNome}...`);
        const arquivoComprimido = await imageCompression(arquivoOriginal, options);
        
        // Limpa o nome do arquivo de espaços e acentos
        const nomeLimpo = arquivoOriginal.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
        const nomeArquivo = `${prefixoNome}_${Date.now()}_${nomeLimpo}`;

        console.log(`Enviando ${prefixoNome} ao Supabase...`);
        const { data, error } = await supabase.storage.from('documentos_externos').upload(nomeArquivo, arquivoComprimido);
        
        if (error) throw error;
        return supabase.storage.from('documentos_externos').getPublicUrl(nomeArquivo).data.publicUrl;

    } catch (error) {
        console.error(`Erro no upload de ${prefixoNome}:`, error);
        throw new Error(`Falha ao processar foto (${prefixoNome}). Tente novamente.`);
    }
}

// ==========================================
// 4. ENVIO DOS FORMULÁRIOS
// ==========================================
async function enviarTreinamento(event) {
    event.preventDefault();
    loading(true);

    const dados = {
        nome_solicitante: document.getElementById('tr_nome').value,
        email: document.getElementById('tr_email').value,
        telefone: document.getElementById('tr_telefone').value,
        cargo: document.getElementById('tr_cargo').value,
        setor_andar: document.getElementById('tr_setor').value,
        tema: document.getElementById('tr_tema').value,
        data_desejada: document.getElementById('tr_data').value || null,
        status: 'Pendente'
    };

    try {
        const { error } = await supabase.from('solicitacoes_treinamento').insert([dados]);
        if (error) throw error;

        alert("Solicitação de treinamento enviada com sucesso!");
        document.getElementById('form-tr').reset();
        mostrarTela('menu-principal');
    } catch (err) {
        alert("Erro ao enviar treinamento: " + err.message);
    } finally {
        loading(false);
    }
}

async function enviarCadastro(event) {
    event.preventDefault();
    loading(true);

    try {
        // 1. Uploads em paralelo para ganhar tempo
        const uploadDoc = comprimirEEnviarFoto(document.getElementById('cad_foto_doc'), 'doc');
        
        let uploadConselho = Promise.resolve(null);
        if (document.getElementById('cad_tem_conselho').value === 'sim') {
            uploadConselho = comprimirEEnviarFoto(document.getElementById('cad_foto_conselho'), 'conselho');
        }

        const [urlDoc, urlConselho] = await Promise.all([uploadDoc, uploadConselho]);

        // 2. Monta o pacote
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
            setor_andar: document.getElementById('cad_setor').value,
            foto_documento_url: urlDoc,
            foto_conselho_url: urlConselho,
            status: 'Pendente'
        };

        const { error } = await supabase.from('solicitacoes_cadastro').insert([dados]);
        if (error) throw error;

        alert("Cadastro enviado com sucesso! A T.I analisará seus documentos.");
        document.getElementById('form-cad').reset();
        mostrarTela('menu-principal');

    } catch (err) {
        alert("Erro crítico: " + err.message);
    } finally {
        loading(false);
    }
}
