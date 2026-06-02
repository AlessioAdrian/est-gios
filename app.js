// Senhas de Controle de Acesso
const SENHAS_SISTEMA = {
    coordenador: "1234",
    admin: "admin99"
};

let viewDesejadaEmAguardo = "";
let imagemCarimboGlobalBase64 = localStorage.getItem('imgCarimboCoordenador') || null;

// Inicialização Geral do Sistema
document.addEventListener("DOMContentLoaded", () => {
    configurarCargaInicialCoordenadores();
    atualizarComponentesSelecaoCoordenadores();
    configurarOuvinteUploadCarimbo();
    switchView('aluno');
});

// Mock Inicial de Coordenadores (Evita vir vazio no primeiro acesso)
function configurarCargaInicialCoordenadores() {
    let existentes = JSON.parse(localStorage.getItem('bancoCoordenadores'));
    if (!existentes || existentes.length === 0) {
        existentes = [
            { id: "coord-1", nome: "Prof. Dr. Alberto Santos", curso: "Engenharia de Software" },
            { id: "coord-2", nome: "Profa. Msc. Mariana Costa", curso: "Administração" }
        ];
        localStorage.setItem('bancoCoordenadores', JSON.stringify(existentes));
    }
}

// Sincroniza os selects do aluno e da área de filtros do coordenador
function atualizarComponentesSelecaoCoordenadores() {
    const listaCoords = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    const selectAluno = document.getElementById('aluno-coordenador-select');
    const selectFiltroCoord = document.getElementById('filtro-coordenador');
    
    selectAluno.innerHTML = "";
    selectFiltroCoord.innerHTML = '<option value="todos">-- Exibir Todos os Coordenadores --</option>';

    listaCoords.forEach(c => {
        const itemAluno = new Option(`${c.nome} (${c.curso})`, c.id);
        selectAluno.add(itemAluno);

        const itemFiltro = new Option(c.nome, c.id);
        selectFiltroCoord.add(itemFiltro);
    });
}

// Configuração do Capturador de Imagem JPG para o carimbo do coordenador
function configurarOuvinteUploadCarimbo() {
    const inputCarimbo = document.getElementById('coordenador-carimbo-img');
    if (inputCarimbo) {
        inputCarimbo.addEventListener('change', (e) => {
            const arquivo = e.target.files[0];
            if (arquivo && (arquivo.type === "image/jpeg" || arquivo.type === "image/jpg")) {
                const leitor = new FileReader();
                leitor.onload = function () {
                    imagemCarimboGlobalBase64 = leitor.result;
                    localStorage.setItem('imgCarimboCoordenador', imagemCarimboGlobalBase64);
                    alert("Carimbo JPG configurado com sucesso e salvo para uso!");
                };
                leitor.readAsDataURL(arquivo);
            } else {
                alert("Formato Inválido! Selecione exclusivamente uma imagem .JPG ou .JPEG");
                e.target.value = "";
            }
        });
    }
}

// Sistema Central de chaveamento de telas com Barreira de Senha
// Sistema Central de chaveamento de telas com Barreira de Senha (VERSÃO BLINDADA)
// Sistema Central de chaveamento de telas com Barreira de Senha (VERSÃO BLINDADA)
function switchView(view) {
    // Esconde todas as seções
    const secoes = ['view-aluno', 'view-login', 'view-admin', 'view-coordenador'];
    secoes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (view === 'aluno') {
        const elAluno = document.getElementById('view-aluno');
        if (elAluno) elAluno.classList.remove('hidden');
    } else {
        viewDesejadaEmAguardo = view;
        const autenticado = sessionStorage.getItem(`sessao_auth_${view}`) === 'true';

        if (autenticado) {
            const elDestino = document.getElementById(`view-${view}`);
            if (elDestino) elDestino.classList.remove('hidden');
            
            // Tenta carregar os dados específicos de cada painel sem deixar travar a tela
            try {
                if (view === 'coordenador') {
                    atualizarPainelCoordenadorCompleto();
                }
                if (view === 'admin') {
                    carregarListaAdminCoordenadores();
                }
            } catch (err) {
                console.error(`Erro ao carregar dados da visão ${view}:`, err);
            }
        } else {
            const elTitulo = document.getElementById('login-titulo');
            if (elTitulo) elTitulo.textContent = `Acesso Protegido: ${view.toUpperCase()}`;
            
            const elLogin = document.getElementById('view-login');
            if (elLogin) elLogin.classList.remove('hidden');
            
            const elSenha = document.getElementById('senha-acesso');
            if (elSenha) elSenha.value = "";
        }
    }
}

// Validador do formulário de senhas
document.getElementById('btn-login').addEventListener('click', () => {
    const inputSenha = document.getElementById('senha-acesso').value;
    if (inputSenha === SENHAS_SISTEMA[viewDesejadaEmAguardo]) {
        sessionStorage.setItem(`sessao_auth_${viewDesejadaEmAguardo}`, 'true');
        switchView(viewDesejadaEmAguardo);
    } else {
        alert("Senha incorreta! Verifique as credenciais.");
    }
});

function logout() {
    sessionStorage.removeItem(`sessao_auth_${viewDesejadaEmAguardo}`);
    switchView('aluno');
}


// --- LÓGICA DO PAINEL ADMIN ---
document.getElementById('btn-cadastrar-coord').addEventListener('click', () => {
    const nome = document.getElementById('admin-nome-coord').value.trim();
    const curso = document.getElementById('admin-curso-coord').value.trim();

    if (!nome || !curso) return alert("Por favor, preencha todos os campos cadastrais.");

    let banco = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    banco.push({ id: "coord-" + Date.now(), nome, curso });
    localStorage.setItem('bancoCoordenadores', JSON.stringify(banco));

    alert("Coordenador adicionado com sucesso!");
    document.getElementById('admin-nome-coord').value = "";
    document.getElementById('admin-curso-coord').value = "";
    
    carregarListaAdminCoordenadores();
    atualizarComponentesSelecaoCoordenadores();
});

function carregarListaAdminCoordenadores() {
    const ul = document.getElementById('lista-coordenadores-cadastrados');
    ul.innerHTML = "";
    const dados = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];

    dados.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `💼 ${c.nome} [Curso: ${c.curso}]`;
        ul.appendChild(li);
    });
}


// --- LÓGICA DO PAINEL ALUNO (ENVIO MÚLTIPLO + DADOS) ---
// --- LÓGICA DO PAINEL ALUNO (CORRIGIDA E BLINDADA) ---
let filaArquivosUpload = [];
const inputPdfs = document.getElementById('pdf-input');
const interfaceFilaDisplay = document.getElementById('lista-arquivos-selecionados');

if (inputPdfs) {
    inputPdfs.addEventListener('change', (e) => {
        const arquivosPreSelecionados = Array.from(e.target.files);
        const apenasPdfs = arquivosPreSelecionados.filter(f => f.type === "application/pdf");
        filaArquivosUpload = filaArquivosUpload.concat(apenasPdfs);
        
        interfaceFilaDisplay.innerHTML = "";
        filaArquivosUpload.forEach(f => {
            const li = document.createElement('li');
            li.textContent = `📎 PDF Pronto: ${f.name}`;
            interfaceFilaDisplay.appendChild(li);
        });
    });
}

// Ouvinte do botão de envio com validações robustas
const btnEnviar = document.getElementById('btn-enviar');
if (btnEnviar) {
    btnEnviar.addEventListener('click', async () => {
        try {
            const nome = document.getElementById('aluno-nome').value.trim();
            const telefone = document.getElementById('aluno-telefone').value.trim();
            const registro = document.getElementById('aluno-registro').value.trim();
            const curso = document.getElementById('aluno-curso').value.trim();
            const local = document.getElementById('aluno-local').value.trim();
            const selectCoordenador = document.getElementById('aluno-coordenador-select');
            
            const idCoordenadorDestino = selectCoordenador ? selectCoordenador.value : "";

            // Verifica se os campos obrigatórios foram preenchidos
            if (!nome || !registro) {
                alert("Erro: Nome e RA/CPF são obrigatórios!");
                return;
            }

            // Verifica se há um coordenador selecionado
            if (!idCoordenadorDestino) {
                alert("Erro: Você precisa selecionar um Coordenador! Se a lista estiver vazia, acesse a Área do Admin e cadastre um coordenador primeiro.");
                return;
            }

            // Verifica se há arquivos na fila
            if (filaArquivosUpload.length === 0) {
                alert("Erro: Selecione pelo menos 1 arquivo PDF para enviar!");
                return;
            }

            let bancoEstagios = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];

            const converterParaBase64 = (arquivoItem) => new Promise((sucesso, rejeito) => {
                const reader = new FileReader(); 
                reader.onload = () => sucesso(reader.result); 
                reader.onerror = (err) => rejeito(err);
                reader.readAsDataURL(arquivoItem);
            });

            // Processa e converte todos os arquivos da fila
            for (let arquivo of filaArquivosUpload) {
                const base64Convertido = await converterParaBase64(arquivo);
                bancoEstagios.push({
                    idDocumento: "doc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
                    nomeOriginalArquivo: arquivo.name,
                    pdfDadosBase64: base64Convertido,
                    coordenadorDestinatarioId: idCoordenadorDestino,
                    metaAluno: { nome, telefone, registro, curso, local }
                });
            }

            localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(bancoEstagios));
            alert(`Sucesso! ${filaArquivosUpload.length} documento(s) enviado(s) para o coordenador.`);
            
            // Limpeza e reset do formulário após o sucesso
            filaArquivosUpload = [];
            if (interfaceFilaDisplay) interfaceFilaDisplay.innerHTML = "";
            if (inputPdfs) inputPdfs.value = "";
            
            document.getElementById('aluno-nome').value = "";
            document.getElementById('aluno-telefone').value = "";
            document.getElementById('aluno-registro').value = "";
            document.getElementById('aluno-curso').value = "";
            document.getElementById('aluno-local').value = "";

        } catch (error) {
            console.error("Erro no processo de envio:", error);
            alert("Ocorreu um erro interno ao processar os arquivos. Verifique o console do navegador.");
        }
    });
}

// --- LÓGICA DO PAINEL DO COORDENADOR (FILTRAGEM + CARIMBO REAL JPG) ---
// --- LÓGICA DO PAINEL DO COORDENADOR (FILTRAGEM, HISTÓRICO E CARIMBO JPG) ---
// --- LÓGICA DO PAINEL DO COORDENADOR (FILTRAGEM, HISTÓRICO E CARIMBO JPG) ---
let docAtivoEmFoco = null;

// ATENÇÃO: Esta função deve ficar no topo deste bloco para o JavaScript achá-la logo
function atualizarPainelCoordenadorCompleto() {
    try {
        carregarDocumentosPendentes();
        carregarAlunosAtendidos();
    } catch (e) {
        console.error("Erro ao atualizar o painel completo do coordenador:", e);
    }
}

// 1. Carrega os arquivos pendentes que vieram da Área do Aluno
// 1. Carrega os arquivos pendentes (VERSÃO ULTRA-PROTEGIDA)
function carregarDocumentosPendentes() {
    const ulLista = document.getElementById('lista-documentos');
    if (!ulLista) return; // Se o elemento não existir, não faz nada e não trava o app
    ulLista.innerHTML = "";
    
    const todosDocumentos = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
    const elFiltro = document.getElementById('filtro-coordenador');
    const filtroSelecionado = elFiltro ? elFiltro.value : "todos";

    const filtrados = todosDocumentos.filter(doc => {
        if (filtroSelecionado === "todos") return true;
        return doc.coordenadorDestinatarioId === filtroSelecionado;
    });

    if (filtrados.length === 0) {
        ulLista.innerHTML = '<li class="empty-list" style="padding:10px; font-size:0.85rem; color:#64748b;">Nenhum pendente.</li>';
        fecharPainelDeVisualizacao();
        return;
    }

    filtrados.forEach(doc => {
        if (doc && doc.metaAluno) { // Proteção contra dados corrompidos
            const li = document.createElement('li');
            li.textContent = `[${doc.metaAluno.nome || 'Sem Nome'}] - ${doc.nomeOriginalArquivo || 'Documento'}`;
            li.onclick = () => abrirVisualizadorDoEstagio(doc);
            ulLista.appendChild(li);
        }
    });
}

// 2. Carrega a lista histórica de alunos atendidos (VERSÃO ULTRA-PROTEGIDA)
function carregarAlunosAtendidos() {
    const ulAtendidos = document.getElementById('lista-alunos-atendidos');
    if (!ulAtendidos) return; // Se o elemento não existir, não trava o app
    ulAtendidos.innerHTML = "";

    const historicoAtendidos = JSON.parse(localStorage.getItem('bancoAlunosAtendidos')) || [];
    const elFiltro = document.getElementById('filtro-coordenador');
    const filtroSelecionado = elFiltro ? elFiltro.value : "todos";

    const filtrados = historicoAtendidos.filter(aluno => {
        if (filtroSelecionado === "todos") return true;
        return aluno.coordenadorId === filtroSelecionado;
    });

    if (filtrados.length === 0) {
        ulAtendidos.innerHTML = '<li class="empty-list" style="padding:10px; font-size:0.85rem; color:#64748b;">Nenhum aluno atendido ainda.</li>';
        return;
    }

    filtrados.forEach(aluno => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>🎓 ${aluno.nome || 'Aluno'}</strong> (${aluno.curso || 'Geral'})<br>
            <span class="badge-data">✅ Documento: ${aluno.arquivoHomologado || 'Arquivo'}</span>
            <span class="badge-data">🕒 Atendido em: ${aluno.dataAtendimento || '--/--/----'}</span>
        `;
        ulAtendidos.appendChild(li);
    });
}
function fecharPainelDeVisualizacao() {
    document.getElementById('pdf-preview').classList.add('hidden');
    document.getElementById('btn-baixar').classList.add('hidden');
    document.getElementById('dados-aluno-preview').classList.add('hidden');
}

function abrirVisualizadorDoEstagio(doc) {
    docAtivoEmFoco = doc;
    
    const areaDossie = document.getElementById('dados-aluno-preview');
    areaDossie.innerHTML = `
        <strong>DADOS COMPLETOS DO ALUNO:</strong><br>
        • <strong>Nome:</strong> ${doc.metaAluno.nome} | • <strong>RA/CPF:</strong> ${doc.metaAluno.registro}<br>
        • <strong>Curso:</strong> ${doc.metaAluno.curso} | • <strong>Telefone:</strong> ${doc.metaAluno.telefone}<br>
        • <strong>Empresa / Local do Estágio:</strong> ${doc.metaAluno.local}
    `;
    areaDossie.classList.remove('hidden');

    const frame = document.getElementById('pdf-preview');
    frame.src = doc.pdfDadosBase64;
    frame.classList.remove('hidden');
    document.getElementById('btn-baixar').classList.remove('hidden');
}

// Processador de Injeção de Imagem Nativa (JPG) com Transparência e na Última Página
document.getElementById('btn-baixar').addEventListener('click', async () => {
    if (!docAtivoEmFoco) return;

    if (!imagemCarimboGlobalBase64) {
        return alert("Atenção: Carregue primeiro a imagem JPG do seu carimbo/assinatura no campo verde acima!");
    }

    try {
        const rawPdfBytes = Uint8Array.from(atob(docAtivoEmFoco.pdfDadosBase64.split(',')[1]), c => c.charCodeAt(0));
        const rawImgBytes = Uint8Array.from(atob(imagemCarimboGlobalBase64.split(',')[1]), c => c.charCodeAt(0));

        const documentoPdfInstancia = await PDFLib.PDFDocument.load(rawPdfBytes);
        
        const paginas = documentoPdfInstancia.getPages();
        const ultimaPagina = paginas[paginas.length - 1]; 

        const imagemCarimboInjetavel = await documentoPdfInstancia.embedJpg(rawImgBytes);

        const larguraDesejada = 150;
        const dimensoesCarimbo = imagemCarimboInjetavel.scaleToFit(larguraDesejada, larguraDesejada);

        ultimaPagina.drawImage(imagemCarimboInjetavel, {
            x: ultimaPagina.getWidth() - dimensoesCarimbo.width - 50, 
            y: 50, 
            width: dimensoesCarimbo.width,
            height: dimensoesCarimbo.height,
            opacity: 0.75, 
        });

        const bytesFinaisModificados = await documentoPdfInstancia.save();

        const blob = new Blob([bytesFinaisModificados], { type: "application/pdf" });
        const linkDownload = document.createElement('a');
        linkDownload.href = URL.createObjectURL(blob);
        linkDownload.download = `HOMOLOGADO_${docAtivoEmFoco.metaAluno.nome}_${docAtivoEmFoco.nomeOriginalArquivo}`;
        linkDownload.click();

        // --- SALVAR NO HISTÓRICO DE ATENDIDOS ANTES DE REMOVER DA FILA ---
        let historicoAtendidos = JSON.parse(localStorage.getItem('bancoAlunosAtendidos')) || [];
        
        const agora = new Date();
        const dataFormatada = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        historicoAtendidos.push({
            coordenadorId: docAtivoEmFoco.coordenadorDestinatarioId,
            nome: docAtivoEmFoco.metaAluno.nome,
            curso: docAtivoEmFoco.metaAluno.curso,
            arquivoHomologado: docAtivoEmFoco.nomeOriginalArquivo,
            dataAtendimento: dataFormatada
        });
        localStorage.setItem('bancoAlunosAtendidos', JSON.stringify(historicoAtendidos));
        // -----------------------------------------------------------------

        // Remove o item despachado dos pendentes
        let listaGlobal = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
        listaGlobal = listaGlobal.filter(d => d.idDocumento !== docAtivoEmFoco.idDocumento);
        localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(listaGlobal));
        
        fecharPainelDeVisualizacao();
        
        // Atualiza ambas as listas simultaneamente na interface
        atualizarPainelCoordenadorCompleto();
        
        alert("Documento autenticado com carimbo transparente na última página e movido para 'Alunos Atendidos'!");

    } catch (erro) {
        console.error(erro);
        alert("Erro ao processar PDF. Verifique se o carimbo é um JPG válido.");
    }
});

// Altere também a chamada do "onchange" na função de sincronização de selects lá em cima no app.js se necessário
function atualizarComponentesSelecaoCoordenadores() {
    const listaCoords = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    const selectAluno = document.getElementById('aluno-coordenador-select');
    const selectFiltroCoord = document.getElementById('filtro-coordenador');
    
    if(selectAluno && selectFiltroCoord) {
        selectAluno.innerHTML = "";
        selectFiltroCoord.innerHTML = '<option value="todos">-- Exibir Todos os Coordenadores --</option>';

        listaCoords.forEach(c => {
            const itemAluno = new Option(`${c.nome} (${c.curso})`, c.id);
            selectAluno.add(itemAluno);

            const itemFiltro = new Option(c.nome, c.id);
            selectFiltroCoord.add(itemFiltro);
        });
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js'); });
}
