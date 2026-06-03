// ==========================================
// CONFIGURAÇÕES GLOBAIS E LINKS DO SISTEMA
// ==========================================
const CONFIG = {
    senhaCoordenador: "1234",
    senhaAdmin: "admin99",
    
    // 🚨 INSIRA OS DADOS DO SEU REPOSITÓRIO DO GITHUB AQUI EMBAIXO:
    github: {
        token: "SEU_PERSONAL_ACCESS_TOKEN_AQUI", // Seu token gerado no GitHub
        dono: "SEU_USUARIO_OU_ORGANIZACAO",        // Ex: "mariana-dev"
        repositorio: "NOME_DO_REPOSITORIO",      // Ex: "app-estagio-dados"
        pasta: "documentos-homologados"          // Nome da pasta dentro do repositório onde os PDFs serão salvos
    }
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

function garantizarDadosIniciaisDoSistema() {
    let coordsAtivos = localStorage.getItem('bancoCoordenadores');
    if (!coordsAtivos) {
        const mockInicial = [{ id: "coord-padrao-1", nome: "Coordenador Geral de Estágios", curso: "Geral" }];
        localStorage.setItem('bancoCoordenadores', JSON.stringify(mockInicial));
    }
    if (!localStorage.getItem('bancoDocumentosEstagio')) localStorage.setItem('bancoDocumentosEstagio', JSON.stringify([]));
    if (!localStorage.getItem('bancoAlunosAtendidos')) localStorage.setItem('bancoAlunosAtendidos', JSON.stringify([]));
}

function sincronizarListasDeCoordenadores() {
    const lista = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    const selectAluno = document.getElementById('aluno-coordenador-select');
    const selectFiltroCoord = document.getElementById('filtro-coordenador');

    if (selectAluno) {
        selectAluno.innerHTML = "";
        lista.forEach(c => selectAluno.add(new Option(`${c.nome} (${c.curso})`, c.id)));
    }
    if (selectFiltroCoord) {
        selectFiltroCoord.innerHTML = '<option value="todos">-- Exibir Todos os Coordenadores --</option>';
        lista.forEach(c => selectFiltroCoord.add(new Option(c.nome, c.id)));
    }
}

function inicializarOuvintesDeEventos() {
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

    if (document.getElementById('btn-enviar')) document.getElementById('btn-enviar').addEventListener('click', processarEnvioDocumentosAluno);
    if (document.getElementById('btn-login')) document.getElementById('btn-login').addEventListener('click', executarAutenticacaoPainel);
    if (document.getElementById('btn-cadastrar-coord')) document.getElementById('btn-cadastrar-coord').addEventListener('click', processarCadastroNovoCoordenador);
    if (document.getElementById('coordenador-carimbo-img')) document.getElementById('coordenador-carimbo-img').addEventListener('change', processarUploadImagemCarimbo);
    if (document.getElementById('filtro-coordenador')) document.getElementById('filtro-coordenador').addEventListener('change', atualizarListasDoPainelCoordenador);

    // Ouvintes de Ações de Homologação (GitHub / Download Local)
    if (document.getElementById('btn-salvar-github')) {
        document.getElementById('btn-salvar-github').addEventListener('click', () => processarHomologacaoMestre(true));
    }
    if (document.getElementById('btn-baixar-local')) {
        document.getElementById('btn-baixar-local').addEventListener('click', () => processarHomologacaoMestre(false));
    }
}

function switchView(nomeView) {
    const blocosViews = ['view-aluno', 'view-login', 'view-admin', 'view-coordenador'];
    blocosViews.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.classList.add('hidden');
    });

    if (nomeView === 'aluno') {
        if (document.getElementById('view-aluno')) document.getElementById('view-aluno').classList.remove('hidden');
    } else {
        viewPendenteAutenticacao = nomeView;
        const jaAutenticado = sessionStorage.getItem(`sessao_auth_${nomeView}`) === 'true';

        if (jaAutenticado) {
            const telaDestino = document.getElementById(`view-${nomeView}`);
            if (telaDestino) telaDestino.classList.remove('hidden');
            if (nomeView === 'coordenador') atualizarListasDoPainelCoordenador();
            if (nomeView === 'admin') renderizarListaAdminCoordenadores();
        } else {
            if (document.getElementById('login-titulo')) document.getElementById('login-titulo').textContent = `Acesso Controlado: Painel ${nomeView.toUpperCase()}`;
            if (document.getElementById('view-login')) document.getElementById('view-login').classList.remove('hidden');
            if (document.getElementById('senha-acesso')) document.getElementById('senha-acesso').value = "";
        }
    }
}

function executarAutenticacaoPainel() {
    const senhaDigitada = document.getElementById('senha-acesso').value;
    const senhaCorreta = (viewPendenteAutenticacao === 'admin') ? CONFIG.senhaAdmin : CONFIG.senhaCoordenador;

    if (senhaDigitada === senhaCorreta) {
        sessionStorage.setItem(`sessao_auth_${viewPendenteAutenticacao}`, 'true');
        switchView(viewPendenteAutenticacao);
    } else {
        alert("Senha incorreta!");
    }
}

function logout() {
    sessionStorage.removeItem(`sessao_auth_${viewPendenteAutenticacao}`);
    switchView('aluno');
}

async function processarEnvioDocumentosAluno() {
    const nome = document.getElementById('aluno-nome').value.trim();
    const registro = document.getElementById('aluno-registro').value.trim();
    const curso = document.getElementById('aluno-curso').value.trim();
    const local = document.getElementById('aluno-local').value.trim();
    const selectCoord = document.getElementById('aluno-coordenador-select');
    const idCoordenador = selectCoord ? selectCoord.value : "";

    if (!nome || !registro || !idCoordenador || filaTemporariaArquivosAluno.length === 0) {
        alert("Campos obrigatórios faltando ou nenhum PDF anexado!");
        return;
    }

    let bancoDocs = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
    const lerBase64 = (file) => new Promise(res => {
        const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file);
    });

    for (let file of filaTemporariaArquivosAluno) {
        const base64 = await lerBase64(file);
        bancoDocs.push({
            idDocumento: "doc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
            nomeOriginalArquivo: file.name,
            pdfDadosBase64: base64,
            coordenadorDestinatarioId: idCoordenador,
            metaAluno: { nome, registro, curso, local }
        });
    }

    localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(bancoDocs));
    alert("Documentos enviados com sucesso!");
    filaTemporariaArquivosAluno = [];
    document.getElementById('lista-arquivos-selecionados').innerHTML = "";
    document.getElementById('pdf-input').value = "";
}

function processarCadastroNovoCoordenador() {
    const nome = document.getElementById('admin-nome-coord').value.trim();
    const curso = document.getElementById('admin-curso-coord').value.trim();
    if (!nome || !curso) return alert("Preencha todos os campos.");

    let banco = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    banco.push({ id: "coord-" + Date.now(), nome, curso });
    localStorage.setItem('bancoCoordenadores', JSON.stringify(banco));
    
    document.getElementById('admin-nome-coord').value = "";
    document.getElementById('admin-curso-coord').value = "";
    renderizarListaAdminCoordenadores();
    sincronizarListasDeCoordenadores();
}

function renderizarListaAdminCoordenadores() {
    const ul = document.getElementById('lista-coordenadores-cadastrados');
    if (!ul) return; ul.innerHTML = "";
    const lista = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    lista.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `💼 ${c.nome} [Curso: ${c.curso}]`;
        ul.appendChild(li);
    });
}

function atualizarListasDoPainelCoordenador() {
    const elFiltro = document.getElementById('filtro-coordenador');
    const filtro = elFiltro ? elFiltro.value : "todos";

    const ulPendentes = document.getElementById('lista-documentos');
    if (ulPendentes) {
        ulPendentes.innerHTML = "";
        const todosDocs = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
        const filtrados = todosDocs.filter(d => filtro === "todos" || d.coordenadorDestinatarioId === filtro);

        if (filtrados.length === 0) {
            ulPendentes.innerHTML = '<li style="color:gray; padding:10px;">Nenhum pendente.</li>';
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

    const ulAtendidos = document.getElementById('lista-alunos-atendidos');
    if (ulAtendidos) {
        ulAtendidos.innerHTML = "";
        const todosAtendidos = JSON.parse(localStorage.getItem('bancoAlunosAtendidos')) || [];
        const filtradosAtendidos = todosAtendidos.filter(a => filtro === "todos" || a.coordenadorId === filtro);

        if (filtradosAtendidos.length === 0) {
            ulAtendidos.innerHTML = '<li style="color:gray; padding:10px;">Nenhum histórico.</li>';
        } else {
            filtradosAtendidos.forEach(aluno => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>🎓 ${aluno.nome}</strong><br><small style="color:green;">✅ ${aluno.arquivoHomologado} (${aluno.dataAtendimento})</small>`;
                ulAtendidos.appendChild(li);
            });
        }
    }
}

function fecharAreaDePreviewCoordenador() {
    if (document.getElementById('pdf-preview')) document.getElementById('pdf-preview').classList.add('hidden');
    if (document.getElementById('dados-aluno-preview')) document.getElementById('dados-aluno-preview').classList.add('hidden');
    if (document.getElementById('acoes-coordenador-botoes')) document.getElementById('acoes-coordenador-botoes').classList.add('hidden');
    documentoSelecionadoParaCarimbo = null;
}

function carregarPreviewDocumentoEstagio(doc) {
    documentoSelecionadoParaCarimbo = doc;
    const dados = document.getElementById('dados-aluno-preview');
    if (dados) {
        dados.innerHTML = `<strong>ALUNO:</strong> ${doc.metaAluno.nome} | <strong>EMPRESA:</strong> ${doc.metaAluno.local}`;
        dados.classList.remove('hidden');
    }
    if (document.getElementById('pdf-preview')) {
        document.getElementById('pdf-preview').src = doc.pdfDadosBase64;
        document.getElementById('pdf-preview').classList.remove('hidden');
    }
    if (document.getElementById('acoes-coordenador-botoes')) document.getElementById('acoes-coordenador-botoes').classList.remove('hidden');
}

function processarUploadImagemCarimbo(e) {
    const file = e.target.files[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/jpg")) {
        const reader = new FileReader();
        reader.onload = function() {
            cacheCarimboBase64 = reader.result;
            localStorage.setItem('imgCarimboCoordenador', cacheCarimboBase64);
            alert("Carimbo institucional configurado com sucesso!");
        };
        reader.readAsDataURL(file);
    } else {
        alert("Formato inválido! Envie apenas imagens .JPG");
    }
}

// FUNÇÃO MESTRE ATUALIZADA COM SUCESSO DO GITHUB E DOWNLOAD LOCAL
async function processarHomologacaoMestre(enviarParaGitHub = false) {
    if (!documentoSelecionadoParaCarimbo) return;
    if (!cacheCarimboBase64) return alert("Faça o upload do seu carimbo JPG antes de assinar.");

    try {
        // 1. Processamento e Injeção do Carimbo Transparente na Última Página
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
        const nomeArquivoFinal = `HOMOLOGADO_${documentoSelecionadoParaCarimbo.metaAluno.nome.replace(/\s+/g, '_')}_${documentoSelecionadoParaCarimbo.nomeOriginalArquivo.replace(/\s+/g, '_')}`;

        // Converte os bytes gerados em string binária comum
        let binarioString = "";
        for (let i = 0; i < pdfModificadoBytes.length; i++) {
            binarioString += String.fromCharCode(pdfModificadoBytes[i]);
        }
        // Converte a string binária para Base64 puro (exigido pelo GitHub API)
        const base64PuroGitHub = btoa(binarioString);

        // 2. Executa a ação selecionada pelo Coordenador
        if (enviarParaGitHub) {
            // Ação GitHub: Envio via API REST em segundo plano
            const urlApi = `https://api.github.com/repos/${CONFIG.github.dono}/${CONFIG.github.repositorio}/contents/${CONFIG.github.pasta}/${nomeArquivoFinal}`;
            
            const payload = {
                message: `Adicionando documento homologado: ${nomeArquivoFinal}`,
                content: base64PuroGitHub
            };

            const resposta = await fetch(urlApi, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${CONFIG.github.token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (resposta.ok) {
                alert(`Sucesso! O documento assinado foi enviado diretamente para o repositório do GitHub com o nome:\n${nomeArquivoFinal}`);
            } else {
                const erroDados = await resposta.json();
                console.error("Erro GitHub API:", erroDados);
                alert("Falha ao enviar para o GitHub. Verifique se o Token e as configurações no topo do script estão corretos.");
                return; // Interrompe o processo para não remover o arquivo da fila caso dê erro
            }
        } else {
            // Ação Local: Tradicional download físico
            const blob = new Blob([pdfModificadoBytes], { type: "application/pdf" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nomeArquivoFinal;
            link.click();
            alert(`Arquivo baixado localmente em segurança!\nNome: ${nomeArquivoFinal}`);
        }

        // 3. Registra no histórico de Atendidos
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

        // 4. Remove da fila de documentos pendentes
        let pendentes = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')) || [];
        pendentes = pendentes.filter(d => d.idDocumento !== documentoSelecionadoParaCarimbo.idDocumento);
        localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(pendentes));

        // 5. Atualiza o painel
        fecharAreaDePreviewCoordenador();
        atualizarListasDoPainelCoordenador();

    } catch (err) {
        console.error(err);
        alert("Erro crítico no processamento do PDF.");
    }
}
