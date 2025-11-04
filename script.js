// =======================================================
// VARIÁVEIS GLOBAIS E CHAVES DE ARMAZENAMENTO
// =======================================================
const STORAGE_KEY_PRODUTOS = 'produtosCadastrados';
const STORAGE_KEY_VENDAS_DO_DIA = 'vendasDoDiaAtual'; 
const STORAGE_KEY_HISTORICO = 'vendasHistorico'; 

// =======================================================
// ELEMENTOS DA INTERFACE (Seletores)
// =======================================================

// Abas de Navegação
const tabVendasBtn = document.getElementById('tab-vendas');
const tabProdutosBtn = document.getElementById('tab-produtos');
const tabHistoricoBtn = document.getElementById('tab-historico'); 
const contentVendas = document.getElementById('content-vendas');
const contentProdutos = document.getElementById('content-produtos');
const contentHistorico = document.getElementById('content-historico'); 

// ABA PRODUTOS
const formProduto = document.getElementById('form-produto');
const nomeProdutoInput = document.getElementById('nome-produto');
const precoProdutoInput = document.getElementById('preco-produto');
const formExcluirProduto = document.getElementById('form-excluir-produto');
const selectProdutoExcluir = document.getElementById('select-produto-excluir');

// ABA VENDAS
const formVenda = document.getElementById('form-venda');
const selectProdutoVendas = document.getElementById('produto'); 
const quantidadeVendaInput = document.getElementById('quantidade');
const clienteVendaInput = document.getElementById('cliente');
const listaVendasDiv = document.getElementById('lista-vendas'); 

// Resumo do Dia
const totalDiaH2 = document.getElementById('total-dia');
const totalVendasH3 = document.getElementById('total-vendas');
const totalProdutosH3 = document.getElementById('total-produtos'); 

// Botões de Ação
const btnNovoDia = document.getElementById('btnNovoDia');
const btnExportarPdf = document.getElementById('btnExportarPdf');

// Seletores do Histórico
const listaHistoricoDiv = document.getElementById('lista-historico');
const detalhesHistoricoCard = document.getElementById('detalhes-historico-card');
const detalhesHistoricoTitulo = document.getElementById('detalhes-historico-titulo');
const detalhesVendasDoDiaDiv = document.getElementById('detalhes-vendas-do-dia');

let produtosDisponiveis = []; 


// =======================================================
// FUNÇÕES DE PRODUTOS
// =======================================================

function carregarProdutos() {
    const produtosJSON = localStorage.getItem(STORAGE_KEY_PRODUTOS);
    return produtosJSON ? JSON.parse(produtosJSON) : [];
}

function salvarProdutos(produtos) {
    localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(produtos));
}

function handleCadastroProduto(event) {
    event.preventDefault();

    const nome = nomeProdutoInput.value.trim();
    const preco = parseFloat(precoProdutoInput.value);

    if (!nome || isNaN(preco) || preco <= 0) {
        alert("Por favor, preencha o nome do produto e um preço válido.");
        return;
    }

    let produtos = carregarProdutos();
    const produtoExistente = produtos.some(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (produtoExistente) {
        alert(`O produto "${nome}" já está cadastrado.`);
        return;
    }

    const novoProduto = {
        nome: nome,
        preco: preco
    };
    
    produtos.push(novoProduto); 
    salvarProdutos(produtos);
    
    formProduto.reset(); 
    precoProdutoInput.value = "0.00"; 
    
    popularSelectProdutos(); 
    popularSelectProdutosExcluir();
    atualizarResumoDoDia(); 
    
    alert(`Produto "${nome}" cadastrado com sucesso!`);
}


function popularSelectProdutosExcluir() {
    const produtos = carregarProdutos();
    
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    selectProdutoExcluir.innerHTML = '<option value="">Selecione um produto para excluir</option>'; 
    
    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.nome; 
        option.textContent = `${produto.nome} (R$ ${parseFloat(produto.preco).toFixed(2)})`; 
        selectProdutoExcluir.appendChild(option);
    });
}

function handleExcluirProduto(event) {
    event.preventDefault();

    const produtoNome = selectProdutoExcluir.value;

    if (!produtoNome) {
        alert("Por favor, selecione um produto para excluir.");
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir o produto "${produtoNome}"? Isso removerá o produto, mas as vendas antigas permanecerão registradas.`)) {
        return;
    }

    let produtos = carregarProdutos();
    produtos = produtos.filter(p => p.nome !== produtoNome);
    
    salvarProdutos(produtos);
    
    formExcluirProduto.reset();
    
    popularSelectProdutos(); 
    popularSelectProdutosExcluir();
    atualizarResumoDoDia(); 
    renderizarHistorico(); 
    
    alert(`Produto "${produtoNome}" excluído com sucesso!`);
}

// =======================================================
// FUNÇÕES DE VENDAS
// =======================================================

function carregarVendasDoDia() {
    const vendasJSON = localStorage.getItem(STORAGE_KEY_VENDAS_DO_DIA);
    return vendasJSON ? JSON.parse(vendasJSON) : [];
}

function salvarVendasDoDia(vendas) {
    localStorage.setItem(STORAGE_KEY_VENDAS_DO_DIA, JSON.stringify(vendas));
}

function carregarHistorico() {
    const historicoJSON = localStorage.getItem(STORAGE_KEY_HISTORICO);
    return historicoJSON ? JSON.parse(historicoJSON) : {};
}

function salvarHistorico(historico) {
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));
}

function renderizarVendas() {
    const vendasDoDia = carregarVendasDoDia();
    
    listaVendasDiv.innerHTML = ''; 

    vendasDoDia.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)); 

    if (vendasDoDia.length === 0) {
        listaVendasDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>Nenhuma venda registrada hoje</p>
            </div>
        `;
        return;
    }

    const listaHTML = document.createElement('ul');
    listaHTML.className = 'vendas-list'; 
    
    vendasDoDia.forEach(venda => {
        const dataVendaObj = new Date(venda.dataHora);
        const horaFormatada = dataVendaObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const item = document.createElement('li');
        item.innerHTML = `
            <div class="venda-info">
                <strong>${venda.produto}</strong>
                <div class="details">
                    <span>${venda.quantidade}x</span> 
                    <span>R$ ${parseFloat(venda.valorUnitario).toFixed(2)} unit.</span>
                    <span>Cliente: ${venda.cliente || 'Anônimo'}</span>
                </div>
                <span>${horaFormatada}</span>
            </div>
            <div class="venda-valor">
                R$ ${parseFloat(venda.valorTotal).toFixed(2)}
                <button onclick="excluirVenda('${venda.id}')">Excluir</button>
            </div>
        `;
        listaHTML.appendChild(item);
    });

    listaVendasDiv.appendChild(listaHTML);
}


window.excluirVenda = function(vendaId) {
    if (!confirm("Tem certeza que deseja excluir esta venda? Esta ação é irreversível.")) {
        return;
    }
    let vendas = carregarVendasDoDia(); 
    vendas = vendas.filter(venda => venda.id !== vendaId);
    salvarVendasDoDia(vendas);
    renderizarVendas();
    atualizarResumoDoDia();
}

function handleRegistroVenda(event) {
    event.preventDefault();

    const produtoNome = selectProdutoVendas.value;
    const quantidade = parseInt(quantidadeVendaInput.value);
    const cliente = clienteVendaInput.value.trim();

    if (!produtoNome || !quantidade || quantidade <= 0) {
        alert("Por favor, selecione um produto e insira uma quantidade válida.");
        return;
    }

    const produtoSelecionado = produtosDisponiveis.find(p => p.nome === produtoNome);

    if (!produtoSelecionado) {
        alert("Produto selecionado não encontrado. Por favor, cadastre-o na aba 'Produtos'.");
        return;
    }

    const valorUnitario = produtoSelecionado.preco;
    const valorTotal = valorUnitario * quantidade;

    let vendas = carregarVendasDoDia(); 
    const novaVenda = {
        id: Date.now().toString(), 
        produto: produtoNome,
        quantidade: quantidade,
        valorUnitario: valorUnitario,
        valorTotal: valorTotal,
        cliente: cliente || 'Anônimo',
        dataHora: new Date().toISOString() 
    };
    vendas.push(novaVenda);
    salvarVendasDoDia(vendas);

    formVenda.reset();
    selectProdutoVendas.value = produtoNome;
    
    renderizarVendas();
    atualizarResumoDoDia();
}

function handleNovoDia() {
    const vendasDiaAnterior = carregarVendasDoDia();
    
    if (vendasDiaAnterior.length === 0) {
        alert("Não há vendas para fechar o dia.");
        return;
    }

    if (!confirm("Tem certeza que deseja fechar o dia e limpar o registro de VENDAS? \n\n⚠️ ATENÇÃO: Se o sistema está sendo usado no dia seguinte, certifique-se de que exportou o relatório do dia anterior antes de avançar. Esta ação é irreversível e salvará o histórico.")) {
        return;
    }

    const dataFechamento = new Date(vendasDiaAnterior[0].dataHora).toISOString().slice(0, 10); 

    const historico = carregarHistorico();

    historico[dataFechamento] = vendasDiaAnterior; 
    salvarHistorico(historico);

    salvarVendasDoDia([]); 
    
    renderizarVendas();
    atualizarResumoDoDia();
    alert(`O dia ${dataFechamento} foi fechado e o histórico de vendas foi salvo. Um novo dia começa!`);
}


// =======================================================
// FUNÇÕES DE HISTÓRICO
// =======================================================

function renderizarHistorico() {
    const historico = carregarHistorico();
    const datas = Object.keys(historico).sort().reverse(); 
    
    listaHistoricoDiv.innerHTML = ''; 
    detalhesHistoricoCard.classList.add('hidden'); 

    if (datas.length === 0) {
        listaHistoricoDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>O histórico será exibido aqui após fechar o dia.</p>
            </div>
        `;
        return;
    }

    const listaHTML = document.createElement('ul');
    listaHTML.className = 'historico-list'; 
    
    datas.forEach(dataISO => {
        const vendasDoDia = historico[dataISO];
        const dataFormatada = new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        
        const totalDia = vendasDoDia.reduce((sum, venda) => sum + venda.valorTotal, 0);

        const item = document.createElement('li');
        item.innerHTML = `
            <span class="data-resumo">${dataFormatada}</span>
            <span class="total-resumo">R$ ${totalDia.toFixed(2)}</span>
            <div class="botoes-resumo">
                <button class="btn-export-hist" onclick="exportarPdfHistorico('${dataISO}')">
                    <i class="fas fa-file-pdf"></i> Exportar
                </button>
                <button class="btn-detalhes-hist" onclick="mostrarDetalhesHistorico('${dataISO}')">
                    Detalhes
                </button>
                <button class="btn-apagar-hist" onclick="apagarDiaHistorico('${dataISO}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        listaHTML.appendChild(item);
    });

    listaHistoricoDiv.appendChild(listaHTML);
}

window.apagarDiaHistorico = function(dataISO) {
    const dataFormatada = new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    if (!confirm(`Tem certeza que deseja apagar permanentemente o histórico do dia ${dataFormatada}? Esta ação é irreversível.`)) {
        return;
    }

    const historico = carregarHistorico();
    delete historico[dataISO];
    salvarHistorico(historico);
    
    alert(`Histórico do dia ${dataFormatada} apagado com sucesso!`);
    renderizarHistorico();
}

window.mostrarDetalhesHistorico = function(dataISO) {
    const historico = carregarHistorico();
    const vendasDoDia = historico[dataISO];
    const dataFormatada = new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    detalhesHistoricoTitulo.textContent = `Detalhes de Vendas - ${dataFormatada}`;
    detalhesVendasDoDiaDiv.innerHTML = '';
    
    const listaDetalhes = document.createElement('ul');
    listaDetalhes.className = 'vendas-list'; 
    
    vendasDoDia.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora)); 

    vendasDoDia.forEach(venda => {
        const dataVendaObj = new Date(venda.dataHora);
        const horaFormatada = dataVendaObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const item = document.createElement('li');
        item.innerHTML = `
            <div class="venda-info">
                <strong>${venda.produto}</strong>
                <div class="details">
                    <span>${venda.quantidade}x</span> 
                    <span>R$ ${parseFloat(venda.valorUnitario).toFixed(2)} unit.</span>
                    <span>Cliente: ${venda.cliente || 'Anônimo'}</span>
                </div>
                <span>${horaFormatada}</span>
            </div>
            <div class="venda-valor">
                R$ ${parseFloat(venda.valorTotal).toFixed(2)}
            </div>
        `;
        listaDetalhes.appendChild(item);
    });

    detalhesVendasDoDiaDiv.appendChild(listaDetalhes);
    detalhesHistoricoCard.classList.remove('hidden');
    detalhesHistoricoCard.scrollIntoView({ behavior: 'smooth' });
}


window.exportarPdfHistorico = function(dataISO) {
    const historico = carregarHistorico();
    const vendas = historico[dataISO];
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); 
    
    const dataRelatorio = new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    
    doc.setFontSize(16);
    doc.text(`Relatório de Vendas - Dia: ${dataRelatorio} (Histórico)`, 14, 15);

    const vendasDoDia = vendas.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

    let totalDia = 0;
    vendasDoDia.forEach(venda => totalDia += venda.valorTotal);

    const headers = [
        ["Hora", "Produto", "Qtd", "Cliente", "Total (R$)"]
    ];

    const data = vendasDoDia.map(venda => {
        const dataVendaObj = new Date(venda.dataHora);
        const horaFormatada = dataVendaObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return [
            horaFormatada,
            venda.produto,
            venda.quantidade.toString(),
            venda.cliente || 'Anônimo',
            venda.valorTotal.toFixed(2)
        ];
    });

    let startY = 30; 
    let marginX = 14;

    doc.setFontSize(12);
    doc.text(headers[0][0], marginX, startY);
    doc.text(headers[0][1], marginX + 20, startY);
    doc.text(headers[0][2], marginX + 80, startY);
    doc.text(headers[0][3], marginX + 100, startY);
    doc.text(headers[0][4], marginX + 150, startY);
    startY += 5;
    doc.line(marginX, startY, 196, startY); 

    doc.setFontSize(10);
    startY += 5;
    data.forEach(row => {
        doc.text(row[0], marginX, startY);
        doc.text(row[1], marginX + 20, startY);
        doc.text(row[2], marginX + 80, startY);
        doc.text(row[3], marginX + 100, startY);
        doc.text(row[4], marginX + 150, startY);
        startY += 7; 
    });

    doc.line(marginX, startY, 196, startY); 
    startY += 5;
    doc.setFontSize(14);
    doc.text(`Total de Vendas no Dia: R$ ${totalDia.toFixed(2)}`, marginX, startY);
    
    doc.save(`historico_vendas_${dataISO}.pdf`);
}


// =======================================================
// FUNÇÕES DE ATUALIZAÇÃO DO RESUMO E INTEGRAÇÃO
// =======================================================

function atualizarResumoDoDia() {
    const vendas = carregarVendasDoDia(); 
    
    let totalDia = 0;
    let numVendas = 0;

    vendas.forEach(venda => {
        totalDia += venda.valorTotal;
        numVendas++;
    });

    totalDiaH2.textContent = `R$ ${totalDia.toFixed(2)}`;
    totalVendasH3.textContent = numVendas.toString();
    
    const produtosCadastrados = carregarProdutos();
    totalProdutosH3.textContent = produtosCadastrados.length.toString(); 
}

/**
 * CORRIGIDO: Garante que os produtos sejam carregados e populados no <select> de Vendas.
 */
function popularSelectProdutos() {
    // Carrega produtos do LocalStorage e atualiza a variável global
    const produtos = carregarProdutos(); 
    produtosDisponiveis = produtos; 
    
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    selectProdutoVendas.innerHTML = '<option value="">Selecione um produto</option>'; 
    
    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.nome; 
        option.textContent = `${produto.nome}`; 
        selectProdutoVendas.appendChild(option);
    });
}

function handleExportarPdf() {
    // ... (Mantida a função de Exportar PDF para o dia atual)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); 
    
    const vendas = carregarVendasDoDia(); 

    if (vendas.length === 0) {
        alert("Não há vendas registradas hoje para exportar.");
        return;
    }
    
    const dataRelatorio = new Date(vendas[0].dataHora).toLocaleDateString('pt-BR');
    
    doc.setFontSize(16);
    doc.text(`Relatório de Vendas - Dia: ${dataRelatorio}`, 14, 15);

    const vendasDoDia = vendas.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

    let totalDia = 0;
    vendasDoDia.forEach(venda => totalDia += venda.valorTotal);

    const headers = [
        ["Hora", "Produto", "Qtd", "Cliente", "Total (R$)"]
    ];

    const data = vendasDoDia.map(venda => {
        const dataVendaObj = new Date(venda.dataHora);
        const horaFormatada = dataVendaObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return [
            horaFormatada,
            venda.produto,
            venda.quantidade.toString(),
            venda.cliente || 'Anônimo',
            venda.valorTotal.toFixed(2)
        ];
    });

    let startY = 30; 
    let marginX = 14;

    doc.setFontSize(12);
    doc.text(headers[0][0], marginX, startY);
    doc.text(headers[0][1], marginX + 20, startY);
    doc.text(headers[0][2], marginX + 80, startY);
    doc.text(headers[0][3], marginX + 100, startY);
    doc.text(headers[0][4], marginX + 150, startY);
    startY += 5;
    doc.line(marginX, startY, 196, startY); 

    doc.setFontSize(10);
    startY += 5;
    data.forEach(row => {
        doc.text(row[0], marginX, startY);
        doc.text(row[1], marginX + 20, startY);
        doc.text(row[2], marginX + 80, startY);
        doc.text(row[3], marginX + 100, startY);
        doc.text(row[4], marginX + 150, startY);
        startY += 7; 
    });

    doc.line(marginX, startY, 196, startY); 
    startY += 5;
    doc.setFontSize(14);
    doc.text(`Total de Vendas no Dia: R$ ${totalDia.toFixed(2)}`, marginX, startY);
    
    doc.save(`relatorio_vendas_${new Date(vendas[0].dataHora).toISOString().slice(0, 10)}.pdf`);
}


// =======================================================
// FUNÇÃO DE TROCA DE ABAS (CORRIGIDA)
// =======================================================

function trocarAba(abaAtiva) {
    tabVendasBtn.classList.remove('active');
    tabProdutosBtn.classList.remove('active');
    tabHistoricoBtn.classList.remove('active'); 

    contentVendas.classList.add('hidden');
    contentProdutos.classList.add('hidden');
    contentHistorico.classList.add('hidden'); 

    if (abaAtiva === 'vendas') {
        tabVendasBtn.classList.add('active');
        contentVendas.classList.remove('hidden');
        
        popularSelectProdutos(); // Garante que o SELECT seja populado
        
        renderizarVendas(); 
        atualizarResumoDoDia(); 
    } else if (abaAtiva === 'produtos') {
        tabProdutosBtn.classList.add('active');
        contentProdutos.classList.remove('hidden');
        popularSelectProdutosExcluir();
    } else if (abaAtiva === 'historico') { 
        tabHistoricoBtn.classList.add('active');
        contentHistorico.classList.remove('hidden');
        renderizarHistorico();
    }
}

// =======================================================
// EVENT LISTENERS E INICIALIZAÇÃO (CORRIGIDA)
// =======================================================

tabVendasBtn.addEventListener('click', () => trocarAba('vendas'));
tabProdutosBtn.addEventListener('click', () => trocarAba('produtos'));
tabHistoricoBtn.addEventListener('click', () => trocarAba('historico')); 

formProduto.addEventListener('submit', handleCadastroProduto);
formExcluirProduto.addEventListener('submit', handleExcluirProduto);
formVenda.addEventListener('submit', handleRegistroVenda);
btnExportarPdf.addEventListener('click', handleExportarPdf);
btnNovoDia.addEventListener('click', handleNovoDia);


// Inicialização: Garante que os produtos sejam carregados no SELECT logo de início.
document.addEventListener('DOMContentLoaded', () => {
    popularSelectProdutos(); // Chamada de segurança
    trocarAba('vendas'); 
});