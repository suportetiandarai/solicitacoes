// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE (COLE SUAS CHAVES AQUI)
// ==========================================
const SUPABASE_URL = 'COLE_AQUI_SUA_URL';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_CHAVE_ANON';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONTROLE DA TELA E MÁSCARAS
// ==========================================
function mostrarTela(idTela) {
    document.getElementById('menu-principal').style.display = 'none';
    document.getElementById('tela-cadastro').style.display = 'none';
    document.getElementById('tela-treinamento').style.display = 'none';
    
    if(idTela === 'menu-principal') {
        document.getElementById(idTela).style.display = 'flex'; // Volta ao menu de grid
    } else {
        document.getElementById(idTela).style.display = 'block'; // Mostra o form
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
        num.value = 'ISENTO'; // Marca como isento pro banco de dados
        foto.value = ''; // Limpa se selecionou algo antes
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
    document.getElementById('loader').style.display = estado ? 'block' : 'none';
    const botoes = document.querySelectorAll('.submit-btn');
    botoes.forEach(b => b.disabled = estado);
}

// ==========================================
// 3. INTELIGÊNCIA: COMPRESSÃO DE IMAGENS E UPLOAD
// ==========================================
async function comprimirEEnviarFoto(fileInput, prefixoNome) {
    if (!fileInput.files || fileInput.files.length === 0) return null;

    const arquivoOriginal = fileInput.files[0];
    
    // Configuração do compressor: Máximo 200KB e largura máxima de 1920px
    const options = {
        maxSizeMB: 0.2,          
        maxWidthOrHeight: 1920,   
        useWebWorker: true        
    };

    try {
        console.log("Comprimindo imagem...");
        const arquivoComprimido = await imageCompression(arquivoOriginal, options);
        
        const nomeArquivo = `${prefixoNome}_${Date.now()}_${arquivoOriginal.name.replace(/\s+/g, '_')}`;

        console.log("Fazendo upload pro Supabase...");
        const { data, error } = await supabase.storage.from('documentos_externos').upload(nomeArquivo, arquivoComprimido);
        
        if (error) throw error;

        // Retorna a URL pública da foto salva
        return supabase.storage.from('documentos_externos').getPublicUrl(nomeArquivo).data.publicUrl;

    } catch (error) {
        console.error("Erro no upload da imagem:", error);
        throw new Error("Não foi possível enviar a foto. Tente novamente.");
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
        data_desejada: document.getElementById('tr_data').value || null
    };

    try {
        const { error } = await supabase.from('solicitacoes_treinamento').insert([dados]);
        if (error) throw error;

        alert("Sua solicitação de treinamento foi enviada para a equipe de T.I! Em breve entraremos em contato.");
        document.getElementById('form-tr').reset();
        mostrarTela('menu-principal');
    } catch (err) {
        alert("Erro ao enviar: " + err.message);
    } finally {
        loading(false);
    }
}

async function enviarCadastro(event) {
    event.preventDefault();
    loading(true);

    try {
        // 1. Faz upload das fotos já comprimidas
        let urlDoc = await comprimirEEnviarFoto(document.getElementById('cad_foto_doc'), 'doc');
        
        let urlConselho = null;
        const temConselho = document.getElementById('cad_tem_conselho').value;
        if (temConselho === 'sim') {
            urlConselho = await comprimirEEnviarFoto(document.getElementById('cad_foto_conselho'), 'conselho');
        }

        // 2. Monta o pacote de dados
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
            foto_conselho_url: urlConselho
        };

        // 3. Salva no banco de dados
        const { error } = await supabase.from('solicitacoes_cadastro').insert([dados]);
        if (error) throw error;

        alert("Cadastro enviado com sucesso! Seus dados e documentos serão analisados pela T.I.");
        document.getElementById('form-cad').reset();
        mostrarTela('menu-principal');

    } catch (err) {
        alert(err.message || "Ocorreu um erro inesperado.");
    } finally {
        loading(false);
    }
}
