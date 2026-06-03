const CONFIG = {
    senhaCoordenador: "1234",
    senhaAdmin: "admin99"
};

let viewAtual = "";
let imgCarimboBase64 = localStorage.getItem('imgCarimbo') || null;
let docFocado = null;
let filaArquivos = [];

document.addEventListener("DOMContentLoaded", () => {
    garantirDadosIniciais();
    sincronizarCoordenadores();
    configurarEventos();
    switchView('aluno');
});

function garantirDadosIniciais() {
    if (!localStorage.getItem('bancoCoordenadores')) {
        localStorage.setItem('bancoCoordenadores', JSON.stringify([{id: "c1", nome: "Coord. Geral", curso: "Geral"}]));
    }
    if (!localStorage.getItem('bancoDocumentosEstagio')) localStorage.setItem('bancoDocumentosEstagio', "[]");
    if (!localStorage.getItem('bancoAlunosAtendidos')) localStorage.setItem('bancoAlunosAtendidos', "[]");
}

function sincronizarCoordenadores() {
    const lista = JSON.parse(localStorage.getItem('bancoCoordenadores')) || [];
    const selAluno = document.getElementById('aluno-coordenador-select');
    const selFiltro = document.getElementById('filtro-coordenador');
    
    if (selAluno) {
        selAluno.innerHTML = "";
        lista.forEach(c => selAluno.add(new Option(`${c.nome} (${c.curso})`, c.id)));
    }
    if (selFiltro) {
        selFiltro.innerHTML = '<option value="todos">-- Todos --</option>';
        lista.forEach(c => selFiltro.add(new Option(c.nome, c.id)));
    }
}

function configurarEventos() {
    const inputPdf = document.getElementById('pdf-input');
    if (inputPdf) {
        inputPdf.addEventListener('change', (e) => {
            filaArquivos = Array.from(e.target.files).filter(f => f.type === "application/pdf");
            const listaU = document.getElementById('lista-arquivos-selecionados');
            if (listaU) {
                listaU.innerHTML = "";
                filaArquivos.forEach(f => {
                    const li = document.createElement('li');
                    li.textContent = `📄 ${f.name}`;
                    listaU.appendChild(li);
                });
            }
        });
    }

    document.getElementById('btn-enviar').onclick = processarEnvio;
    document.getElementById('btn-login').onclick = autenticar;
    document.getElementById('btn-cadastrar-coord').onclick = cadastrarCoord;
    document.getElementById('btn-baixar-final').onclick = homologarDocumento;

    const carimboIn = document.getElementById('coordenador-carimbo-img');
    if (carimboIn) {
        carimboIn.onchange = (e) => {
            const f = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                imgCarimboBase64 = reader.result;
                localStorage.setItem('imgCarimbo', imgCarimboBase64);
                alert("Carimbo salvo!");
            };
            reader.readAsDataURL(f);
        };
    }
}

function switchView(v) {
    const secoes = ['view-aluno', 'view-login', 'view-admin', 'view-coordenador'];
    secoes.forEach(s => document.getElementById(s).classList.add('hidden'));

    if (v === 'aluno') {
        document.getElementById('view-aluno').classList.remove('hidden');
    } else {
        viewAtual = v;
        if (sessionStorage.getItem('auth_' + v) === 'true') {
            document.getElementById('view-' + v).classList.remove('hidden');
            if (v === 'coordenador') atualizarPainelCoordenador();
            if (v === 'admin') renderAdminList();
        } else {
            document.getElementById('view-login').classList.remove('hidden');
            document.getElementById('senha-acesso').value = "";
        }
    }
}

function autenticar() {
    const s = document.getElementById('senha-acesso').value;
    const correta = (viewAtual === 'admin') ? CONFIG.senhaAdmin : CONFIG.senhaCoordenador;
    if (s === correta) {
        sessionStorage.setItem('auth_' + viewAtual, 'true');
        switchView(viewAtual);
    } else { alert("Senha incorreta!"); }
}

function logout() {
    sessionStorage.removeItem('auth_' + viewAtual);
    switchView('aluno');
}

async function processarEnvio() {
    const n = document.getElementById('aluno-nome').value;
    const r = document.getElementById('aluno-registro').value;
    const c = document.getElementById('aluno-coordenador-select').value;
    
    if (!n || !r || filaArquivos.length === 0) return alert("Preencha todos os dados!");

    let banco = JSON.parse(localStorage.getItem('bancoDocumentosEstagio'));
    const toB64 = (f) => new Promise(res => {
        const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(f);
    });

    for (let f of filaArquivos) {
        const b64 = await toB64(f);
        banco.push({
            id: Date.now() + Math.random(),
            nomeArq: f.name,
            pdf: b64,
            coordId: c,
            aluno: { nome: n, ra: r, curso: document.getElementById('aluno-curso').value, local: document.getElementById('aluno-local').value }
        });
    }
    localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(banco));
    alert("Enviado!");
    filaArquivos = [];
    document.getElementById('lista-arquivos-selecionados').innerHTML = "";
}

function cadastrarCoord() {
    const n = document.getElementById('admin-nome-coord').value;
    const c = document.getElementById('admin-curso-coord').value;
    let banco = JSON.parse(localStorage.getItem('bancoCoordenadores'));
    banco.push({id: "coord-" + Date.now(), nome: n, curso: c});
    localStorage.setItem('bancoCoordenadores', JSON.stringify(banco));
    renderAdminList();
    sincronizarCoordenadores();
}

function renderAdminList() {
    const ul = document.getElementById('lista-coordenadores-cadastrados');
    ul.innerHTML = "";
    JSON.parse(localStorage.getItem('bancoCoordenadores')).forEach(c => {
        const li = document.createElement('li');
        li.textContent = `${c.nome} [${c.curso}]`;
        ul.appendChild(li);
    });
}

function atualizarPainelCoordenador() {
    const f = document.getElementById('filtro-coordenador').value;
    
    const ulP = document.getElementById('lista-documentos');
    ulP.innerHTML = "";
    const docs = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')).filter(d => f === "todos" || d.coordId === f);
    docs.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.aluno.nome + " - " + d.nomeArq;
        li.onclick = () => {
            docFocado = d;
            document.getElementById('dados-aluno-preview').innerHTML = `<strong>Aluno:</strong> ${d.aluno.nome} | <strong>Local:</strong> ${d.aluno.local}`;
            document.getElementById('dados-aluno-preview').classList.remove('hidden');
            document.getElementById('pdf-preview').src = d.pdf;
            document.getElementById('pdf-preview').classList.remove('hidden');
            document.getElementById('btn-baixar-final').classList.remove('hidden');
        };
        ulP.appendChild(li);
    });

    const ulA = document.getElementById('lista-alunos-atendidos');
    ulA.innerHTML = "";
    JSON.parse(localStorage.getItem('bancoAlunosAtendidos')).filter(a => f === "todos" || a.coordId === f).forEach(a => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${a.nome}</strong><br><small>${a.arq} (${a.data})</small>`;
        ulA.appendChild(li);
    });
}

async function homologarDocumento() {
    if (!docFocado || !imgCarimboBase64) return alert("Falta o carimbo JPG!");

    try {
        const pdfB = Uint8Array.from(atob(docFocado.pdf.split(',')[1]), c => c.charCodeAt(0));
        const imgB = Uint8Array.from(atob(imgCarimboBase64.split(',')[1]), c => c.charCodeAt(0));

        const pdfDoc = await PDFLib.PDFDocument.load(pdfB);
        const pgs = pdfDoc.getPages();
        const ultima = pgs[pgs.length - 1];

        const carimbo = await pdfDoc.embedJpg(imgB);
        const dim = carimbo.scaleToFit(150, 150);

        ultima.drawImage(carimbo, {
            x: ultima.getWidth() - dim.width - 50,
            y: 50,
            width: dim.width,
            height: dim.height,
            opacity: 0.75
        });

        const modificado = await pdfDoc.save();
        const blob = new Blob([modificado], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `HOMOLOGADO_${docFocado.aluno.nome.replace(/\s/g,'_')}.pdf`;
        link.click();

        // Salva histórico
        let atendidos = JSON.parse(localStorage.getItem('bancoAlunosAtendidos'));
        atendidos.push({coordId: docFocado.coordId, nome: docFocado.aluno.nome, arq: docFocado.nomeArq, data: new Date().toLocaleDateString()});
        localStorage.setItem('bancoAlunosAtendidos', JSON.stringify(atendidos));

        // Remove pendente
        let pendentes = JSON.parse(localStorage.getItem('bancoDocumentosEstagio')).filter(d => d.id !== docFocado.id);
        localStorage.setItem('bancoDocumentosEstagio', JSON.stringify(pendentes));

        docFocado = null;
        document.getElementById('pdf-preview').classList.add('hidden');
        document.getElementById('btn-baixar-final').classList.add('hidden');
        atualizarPainelCoordenador();
        alert("Sucesso!");

    } catch (e) { alert("Erro ao gerar PDF."); }
}
