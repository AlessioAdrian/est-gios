// Configurações Globais e Senhas
const CONFIG = {
    senhaCoordenador: "1234",
    senhaAdmin: "admin99"
};

let viewPendenteAutenticacao = "";
let cacheCarimboBase64 = localStorage.getItem('imgCarimboCoordenador') || null;
let documentoSelecionadoParaCarimbo = null;
let filaTemporariaArquivosAluno = [];

// Evento disparado assim que o documento HTML carrega completamente
document.addEventListener("DOMContentLoaded", () => {
    garantirDadosIniciaisDoSistema();
    sincronizarListasDeCoordenadores();
    inicializarOuvintesDeEventos();
    switchView('aluno');
});

// Impede que o LocalStorage comece nulo (o que quebrava o script na Vercel)
function garantirDadosIniciaisDoSistema() {
    let coordsAtivos = localStorage.getItem('bancoCoordenadores');
    if (!coordsAtivos) {
        const mockInicial = [
            { id: "coord-padrao-1", nome: "Coordenador Geral de Estágios", curso: "Geral" }
        ];
        localStorage.setItem('bancoCoordenadores', JSON.stringify(mockInicial));
    }
    
    if (!localStorage.getItem('bancoDocumentosEstagio')) {
        localStorage.setItem('bancoDocumentosEstagio', JSON.stringify([]));
    }
    if (!localStorage.getItem('bancoAlunosAtendidos')) {
        localStorage.setItem('bancoAlunosAtendidos', JSON.stringify([]));
    }
}

// Sincroniza todas as caixas de seleção (Selects) de coordenadores na tela
function sincronizarListasDeCoordenadores() {
    const lista = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    
    const selectAluno = document.getElementById('aluno-coordenador-select');
    const selectFiltroCoord = document.getElementById('filtro-coordenador');

    if (selectAluno) {
        selectAluno.innerHTML = "";
        lista.forEach(c => {
            selectAluno.add(new Option(`${c.nome} (${c.curso})`, c.id));
        });
    }

    if (selectFiltroCoord) {
        selectFiltroCoord.innerHTML = '<option value="todos">-- Exibir Todos os Coordenadores --</option>';
        lista.forEach(c => {
            selectFiltroCoord.add(new Option(c.nome, c.id));
        });
    }
}

// Vincula funções aos botões e inputs sem risco de colisão de escopo
function inicializarOuvintesDeEventos() {
    // Input de arquivos do Aluno
    const inputPdf = document.getElementById('pdf-input');
    if (inputPdf) {
        inputPdf.addEventListener('change', (e) => {
            const validos = Array.from(e.target.files).filter(f => f.type === "application/pdf");
            filaTemporariaArquivosAluno = filaTemporariaArquivosAluno.concat(validos);
            
            const display = document.getElementById('lista-arquivos-selecionados');
            if (display) {
                display.innerHTML = "";
                filaTemporariaArquivosAluno.forEach(f => {
                    const li = document.createElement('li');
                    li.textContent = `📎 PDF Selecionado: ${f.name}`;
                    display.appendChild(li);
                });
            }
        });
    }

    // Botão de envio do Aluno
    const btnEnviar = document.getElementById('btn-enviar');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', processarEnvioDocumentosAluno);
    }

    // Validador de Senha (Login)
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', executarAutenticacaoPainel);
    }

    // Cadastro de Coordenador no Admin
    const btnCadastrarCoord = document.getElementById('btn-cadastrar-coord');
    if (btnCadastrarCoord) {
        btnCadastrarCoord.addEventListener('click', processarCadastroNovoCoordenador);
    }

    // Upload de Carimbo do Coordenador
    const inputCarimbo = document.getElementById('coordenador-carimbo-img');
    if (inputCarimbo) {
        inputCarimbo.addEventListener('change', processarUploadImagemCarimbo);
    }

    // Filtro de Coordenador
    const selectFiltro = document.getElementById('filtro-coordenador');
    if (selectFiltro) {
        selectFiltro.addEventListener('change', atualizarListasDoPainelCoordenador);
    }

    // Botão de aplicar carimbo e baixar
    const btnBaixar = document.getElementById('btn-baixar');
    if (btnBaixar) {
        btnBaixar.addEventListener('click', processarInjecaoCarimboEBaixarPDF);
    }
}

// Gerenciador de Navegação (Chaveamento de Telas)
function switchView(nomeView) {
    const blocosViews = ['view-aluno', 'view-login', 'view-admin', 'view-coordenador'];
    blocosViews.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.classList.add('hidden');
    });

    if (nomeView === 'aluno') {
        const tela = document.getElementById('view-aluno');
        if (tela) tela.classList.remove('hidden');
    } else {
        viewPendenteAutenticacao = nomeView;
        const jaAutenticado = sessionStorage.getItem(`sessao_auth_${nomeView}`) === 'true';

        if (jaAutenticado) {
            const telaDestino = document.getElementById(`view-${nomeView}`);
            if (telaDestino) telaDestino.classList.remove('hidden');
            
            // Executa rotinas de carregamento de dados da tela aberta
            if (nomeView === 'coordenador') atualizarListasDoPainelCoordenador();
            if (nomeView === 'admin') renderizarListaAdminCoordenadores();
        } else {
            const tituloLogin = document.getElementById('login-titulo');
            if (tituloLogin) tituloLogin.textContent = `Acesso Controlado: Painel ${nomeView.toUpperCase()}`;
            
            const telaLogin = document.getElementById('view-login');
            if (telaLogin) telaLogin.classList.remove('hidden');
            
            const campoSenha = document.getElementById('senha-acesso');
            if (campoSenha) campoSenha.value = "";
        }
    }
}

// Validador de credenciais de acesso
function executarAutenticacaoPainel() {
    const senhaDigitada = document.getElementById('senha-acesso').value;
    const senhaCorreta = (viewPendenteAutenticacao === 'admin') ? CONFIG.senhaAdmin : CONFIG.senhaCoordenador;

    if (senhaDigitada === senhaCorreta) {
        sessionStorage.setItem(`sessao_auth_${viewPendenteAutenticacao}`, 'true');
        switchView(viewPendenteAutenticacao);
    } else {
        alert("Senha incorreta! Verifique os dados de acesso.");
    }
}

function logout() {
    sessionStorage.removeItem(`sessao_auth_${viewPendenteAutenticacao}`);
    switchView('aluno');
}

// Ações do Aluno
async function processarEnvioDocumentosAluno() {
    const nome = document.getElementById('aluno-nome').value.trim();
    const telefone = document.getElementById('aluno-telefone').value.trim();
    const registro = document.getElementById('aluno-registro').value.trim();
    const curso = document.getElementById('aluno-curso').value.trim();
    const local = document.getElementById('aluno-local').value.trim();
    const selectCoord = document.getElementById('aluno-coordenador-select');
    const idCoordenador = selectCoord ? selectCoord.value : "";

    if (!nome || !registro || !idCoordenador || filaTemporariaArquivosAluno.length === 0) {
        alert("Atenção: Nome, RA/CPF, Coordenador e pelo menos 1 arquivo PDF são obrigatórios!");
        return;
    }

    let bancoDocs = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];

    const lerArquivoParaBase64 = (file) => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    for (let file of filaTemporariaArquivosAluno) {
        const base64 = await lerArquivoParaBase64(file);
        bancoDocs.push({
            idDocumento: "doc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
            nomeOriginalArquivo: file.name,
            pdfDadosBase64: base64,
            coordenadorDestinatarioId: idCoordenador,
            metaAluno: { nome, telefone, registro, curso, local }
        });
    }

    localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(bancoDocs));
    alert(`Sucesso! ${filaTemporariaArquivosAluno.length} documento(s) enviado(s) para análise.`);
    
    // Reset de formulário
    filaTemporariaArquivosAluno = [];
    document.getElementById('lista-arquivos-selecionados').innerHTML = "";
    document.getElementById('pdf-input').value = "";
    document.getElementById('aluno-nome').value = "";
    document.getElementById('aluno-registro').value = "";
    document.getElementById('aluno-telefone').value = "";
    document.getElementById('aluno-curso').value = "";
    document.getElementById('aluno-local').value = "";
}

// Ações do Administrador
function processarCadastroNovoCoordenador() {
    const nome = document.getElementById('admin-nome-coord').value.trim();
    const curso = document.getElementById('admin-curso-coord').value.trim();

    if (!nome || !curso) {
        alert("Preencha todos os campos do coordenador.");
        return;
    }

    let banco = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    banco.push({ id: "coord-" + Date.now(), nome, curso });
    localStorage.setItem('bancoCoordenadores', JSON.stringify(banco));

    alert("Coordenador cadastrado!");
    document.getElementById('admin-nome-coord').value = "";
    document.getElementById('admin-curso-coord').value = "";
    
    renderListaAdminCoordenadores();
    sincronizarListasDeCoordenadores();
}

function renderizarListaAdminCoordenadores() {
    const ul = document.getElementById('lista-coordenadores-cadastrados');
    if (!ul) return;
    ul.innerHTML = "";
    const lista = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    lista.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `💼 ${c.nome} [Curso: ${c.curso}]`;
        ul.appendChild(li);
    });
}

// Ações do Coordenador
function atualizarListasDoPainelCoordenador() {
    const elFiltro = document.getElementById('filtro-coordenador');
    const filtro = elFiltro ? elFiltro.value : "todos";

    // 1. Renderizar Pendentes
    const ulPendentes = document.getElementById('lista-documentos');
    if (ulPendentes) {
        ulPendentes.innerHTML = "";
        const todosDocs = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
        const filtrados = todosDocs.filter(d => filtro === "todos" || d.coordenadorDestinatarioId === filtro);

        if (filtrados.length === 0) {
            ulPendentes.innerHTML = '<li style="color:#64748b; padding:10px; font-size:0.85rem;">Nenhum pendente.</li>';
            fecharAreaDePreviewCoordenador();
        } else {
            filtrados.forEach(doc => {
                const li = document.createElement('li');
                li.textContent = `[${doc.metaAluno.nome}] - ${doc.nomeOriginalArquivo}`;
                li.style.cursor = "pointer";
                li.onclick = () => carregarPreviewDocumentoEstagio(doc);
                ulPendentes.appendChild(li);
            });
        }
    }

    // 2. Renderizar Atendidos
    const ulAtendidos = document.getElementById('lista-alunos-atendidos');
    if (ulAtendidos) {
        ulAtendidos.innerHTML = "";
        const todosAtendidos = JSON.parse(localStorage.getItem('bancoAlunosAtendidos')) || [];
        const filtradosAtendidos = todosAtendidos.filter(a => filtro === "todos" || a.coordenadorId === filtro);

        if (filtradosAtendidos.length === 0) {
            ulAtendidos.innerHTML = '<li style="color:#64748b; padding:10px; font-size:0.85rem;">Nenhum histórico.</li>';
        } else {
            filtradosAtendidos.forEach(aluno => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>🎓 ${aluno.nome}</strong><br><span style="font-size:0.75rem; color:#166534;">✅ ${aluno.arquivoHomologado} (${aluno.dataAtendimento})</span>`;
                ulAtendidos.appendChild(li);
            });
        }
    }
}

function fecharAreaDePreviewCoordenador() {
    const pdf = document.getElementById('pdf-preview');
    const btn = document.getElementById('btn-baixar');
    const dados = document.getElementById('dados-aluno-preview');
    if (pdf) pdf.classList.add('hidden');
    if (btn) btn.classList.add('hidden');
    if (dados) dados.classList.add('hidden');
    documentoSelecionadoParaCarimbo = null;
}

function carregarPreviewDocumentoEstagio(doc) {
    documentoSelecionadoParaCarimbo = doc;
    
    const dados = document.getElementById('dados-aluno-preview');
    if (dados) {
        dados.innerHTML = `
            <strong>ALUNO:</strong> ${doc.metaAluno.nome} | <strong>RA/CPF:</strong> ${doc.metaAluno.registro}<br>
            <strong>CURSO:</strong> ${doc.metaAluno.curso} | <strong>EMPRESA:</strong> ${doc.metaAluno.local}
        `;
        dados.classList.remove('hidden');
    }

    const preview = document.getElementById('pdf-preview');
    if (preview) {
        preview.src = doc.pdfDadosBase64;
        preview.classList.remove('hidden');
    }

    const btn = document.getElementById('btn-baixar');
    if (btn) btn.classList.remove('hidden');
}

function processarUploadImagemCarimbo(e) {
    const file = e.target.files[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/jpg")) {
        const reader = new FileReader();
        reader.onload = function() {
            cacheCarimboBase64 = reader.result;
            localStorage.setItem('imgCarimboCoordenador', cacheCarimboBase64);
            alert("Carimbo configurado!");
        };
        reader.readAsDataURL(file);
    } else {
        alert("Formato inválido! Insira um arquivo com extensão .JPG");
        e.target.value = "";
    }
}

async function processarInjecaoCarimboEBaixarPDF() {
    if (!documentoSelecionadoParaCarimbo) return;
    if (!cacheCarimboBase64) {
        alert("Por favor, faça upload da sua imagem de carimbo JPG antes de prosseguir.");
        return;
    }

    try {
        const pdfBytes = Uint8Array.from(atob(documentoSelecionadoParaCarimbo.pdfDadosBase64.split(',')[1]), c => c.charCodeAt(0));
        const imgBytes = Uint8Array.from(atob(cacheCarimboBase64.split(',')[1]), c => c.charCodeAt(0));

        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const paginas = pdfDoc.getPages();
        const ultimaPagina = paginas[paginas.length - 1];

        const imgEmbed = await pdfDoc.embedJpg(imgBytes);
        const dimensoes = imgEmbed.scaleToFit(150, 150);

        ultimaPagina.drawImage(imgEmbed, {
            x: ultimaPagina.getWidth() - dimensoes.width - 50,
            y: 50,
            width: dimensoes.width,
            height: dimensoes.height,
            opacity: 0.75
        });

        const pdfModificadoBytes = await pdfDoc.save();
        const blob = new Blob([pdfModificadoBytes], { type: "application/pdf" });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `HOMOLOGADO_${documentoSelecionadoParaCarimbo.metaAluno.nome}_${documentoSelecionadoParaCarimbo.nomeOriginalArquivo}`;
        link.click();

        // Salva no histórico de atendidos
        let atendidos = JSON.parse(localStorage.getItem('bancoAlunosAtendidos')) || [];
        const dataAgora = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        atendidos.push({
            coordenadorId: documentoSelecionadoParaCarimbo.coordenadorDestinatarioId,
            nome: documentoSelecionadoParaCarimbo.metaAluno.nome,
            curso: documentoSelecionadoParaCarimbo.metaAluno.curso,
            arquivoHomologado: documentoSelecionadoParaCarimbo.nomeOriginalArquivo,
            dataAtendimento: dataAgora
        });
        localStorage.setItem('bancoAlunosAtendidos', JSON.stringify(atendidos));

        // Remove dos pendentes
        let pendentes = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
        pendentes = pendentes.filter(d => d.idDocumento !== documentoSelecionadoParaCarimbo.idDocumento);
        localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(pendentes));

        fecharAreaDePreviewCoordenador();
        atualizarListasDoPainelCoordenador();
        alert("Documento assinado com carimbo!");

    } catch (err) {
        console.error(err);
        alert("Erro técnico ao carimbar o PDF. Verifique se o carimbo enviado é um JPG legítimo.");
    }
}
