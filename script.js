// =======================================================================
// VARIÁVEIS DE ESTADO E INICIALIZAÇÃO
// =======================================================================

const ESTADO_PADRAO = {
    produtos: [
        { id: 1, nome: "Coxinha", preco: 5.00 },
        { id: 2, nome: "Refrigerante Lata", preco: 4.50 },
        { id: 3, nome: "Bolo de Pote", preco: 8.00 },
    ],
    vendasHoje: [],
    historico: []
};

let estado = {};
// ALTERAÇÃO: Inicializa os IDs a partir de 1. Serão atualizados no carregarEstado.
let idProdutoAtual = 1; 
let idVendaAtual = 1; 
let graficoResumo; // Variável para a instância do Chart.js

// =======================================================================
// FUNÇÕES DE UTILIDADE E ARMAZENAMENTO
// =======================================================================

function carregarEstado() {
    try {
        const estadoSalvo = localStorage.getItem('controleVendasEstado');
        if (estadoSalvo) {
            estado = JSON.parse(estadoSalvo);
            
            // CORREÇÃO E REFORÇO: Inicializa contadores de ID baseados no maior ID existente + 1.
            // Isso previne IDs duplicados após recarregamento.
            idProdutoAtual = estado.produtos.length > 0 ? 
                Math.max(...estado.produtos.map(p => p.id)) + 1 : 1;
            idVendaAtual = estado.vendasHoje.length > 0 ?
                Math.max(...estado.vendasHoje.map(v => v.id)) + 1 : 1;
            
            // Garante que 'historico' e 'vendasHoje' existam no objeto de estado
            estado.historico = estado.historico || [];
            estado.vendasHoje = estado.vendasHoje || [];

            return;
        }
    } catch (e) {
        console.error("Erro ao carregar estado do localStorage. Usando estado padrão:", e);
    }
    // Se não houver estado salvo ou se houver erro, usa o padrão
    // ATENÇÃO: É necessário fazer uma cópia profunda (deep copy) do ESTADO_PADRAO
    // para evitar que alterações em 'estado' modifiquem o objeto padrão.
    estado = JSON.parse(JSON.stringify(ESTADO_PADRAO)); 
    idProdutoAtual = estado.produtos.length + 1;
    idVendaAtual = 1;
}

function salvarEstado() {
    try {
        localStorage.setItem('controleVendasEstado', JSON.stringify(estado));
    } catch (e) {
        console.error("Erro ao salvar estado no localStorage:", e);
        showToast("Erro ao salvar dados. Verifique o armazenamento do navegador.", "error");
    }
}

function formatarMoeda(valor) {
    // Melhorado para lidar com valores não numéricos (embora improvável)
    const num = parseFloat(valor);
    if (isNaN(num)) return "R$ 0,00";
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

// Implementação do Toast Notification (mantida como original)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle';
    toast.innerHTML = `<i class="${iconClass}"></i> ${message}`;

    container.appendChild(toast);

    // Força o reflow para aplicar a transição
    setTimeout(() => toast.classList.add('show'), 10); 

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}


// =======================================================================
// RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE (Lógica mantida como original)
// =======================================================================

function atualizarInterface() {
    // 1. Atualizar Selects de Produtos (Venda e Exclusão)
    renderizarSelectProdutos();
    
    // 2. Atualizar Resumo do Dia
    renderizarResumoDia();

    // 3. Atualizar Lista de Vendas de Hoje
    renderizarListaVendas();

    // 4. Atualizar Lista de Produtos Cadastrados
    renderizarListaProdutosCadastrados();

    // 5. Atualizar Histórico (se na aba)
    const isHistoricoTabActive = document.getElementById('content-historico') && 
                                !document.getElementById('content-historico').classList.contains('hidden');
    if (isHistoricoTabActive) {
         renderizarHistorico();
    }
}


function renderizarSelectProdutos() {
    const selectVenda = document.getElementById('produto');
    const selectExcluir = document.getElementById('select-produto-excluir');
    
    const produtosOrdenados = [...estado.produtos].sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR')
    );

    [selectVenda, selectExcluir].forEach(select => {
        // CORREÇÃO: Pega o valor selecionado ANTES de limpar o innerHTML
        const selectedValue = select.value; 
        select.innerHTML = '';
        
        // Adiciona a opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = select.id === 'produto' ? "Selecione um produto" : "Selecione um produto para excluir";
        select.appendChild(defaultOption);

        // Adiciona os produtos ORDENADOS
        produtosOrdenados.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = produto.nome; 
            option.dataset.price = produto.preco; 

            select.appendChild(option);
        });

        // Tenta restaurar o valor selecionado
        if (selectedValue && Array.from(select.options).some(opt => opt.value == selectedValue)) {
             select.value = selectedValue;
        } else {
             select.value = "";
        }
    });
}

function renderizarResumoDia() {
    const totalDiaElement = document.getElementById('total-dia');
    const totalVendasElement = document.getElementById('total-vendas');
    const totalProdutosElement = document.getElementById('total-produtos');

    // REFORÇO: Garantindo que as somas lidem com arrays vazios
    const totalArrecadado = estado.vendasHoje.reduce((acc, venda) => acc + (venda.total || 0), 0);
    const totalItensVendidos = estado.vendasHoje.reduce((acc, venda) => acc + (venda.quantidade || 0), 0);

    totalDiaElement.textContent = formatarMoeda(totalArrecadado);
    totalVendasElement.textContent = estado.vendasHoje.length;
    totalProdutosElement.textContent = totalItensVendidos; 

    // NOVO: Renderiza o Gráfico
    renderizarGraficoResumo();
}


// Plugin Chart.js para renderizar a legenda como uma UL (HTML)
// Mantido inalterado - É perfeito!
const getOrCreateLegendList = (chart, id) => {
    const legendContainer = document.getElementById(id);
    let listContainer = legendContainer.nextElementSibling; 

    if (!listContainer || listContainer.tagName !== 'UL') {
        listContainer = document.createElement('ul');
        
        if (legendContainer.nextElementSibling) {
            legendContainer.parentNode.insertBefore(listContainer, legendContainer.nextElementSibling);
        } else {
            legendContainer.parentNode.appendChild(listContainer);
        }
    }

    return listContainer;
};

const htmlLegendPlugin = {
    id: 'htmlLegend',
    afterUpdate(chart, args, options) {
        if (!options.htmlLegend || !options.htmlLegend.containerID) return;
        
        const ul = getOrCreateLegendList(chart, options.htmlLegend.containerID);
        
        while (ul.firstChild) {
            ul.firstChild.remove();
        }

        const items = chart.options.plugins.legend.labels.generateLabels(chart);

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.cursor = 'pointer';
            
            li.onclick = () => {
                chart.toggleDataVisibility(item.index); 
                chart.update();
            };

            const boxSpan = document.createElement('span');
            boxSpan.style.backgroundColor = item.fillStyle;
            boxSpan.style.borderColor = item.strokeStyle;
            boxSpan.style.borderWidth = item.lineWidth + 'px';
            boxSpan.style.display = 'inline-block';
            boxSpan.style.width = '12px';
            boxSpan.style.height = '12px';
            boxSpan.style.borderRadius = '3px';

            const textContainer = document.createElement('p');
            textContainer.style.color = item.fontColor;
            textContainer.style.margin = 0;
            textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

            const text = document.createTextNode(item.text);
            textContainer.appendChild(text);

            li.appendChild(boxSpan);
            li.appendChild(textContainer);
            ul.appendChild(li);
        });
    }
};

function renderizarGraficoResumo() {
    const canvasContainer = document.getElementById('resumo-grafico-container');

    // 1. Coleta e Agrega os Dados
    const dadosProdutos = estado.vendasHoje.reduce((acc, venda) => {
        const nome = venda.nomeProduto;
        acc[nome] = (acc[nome] || 0) + venda.total;
        return acc;
    }, {});

    const labels = Object.keys(dadosProdutos);
    const data = Object.values(dadosProdutos);

    // 2. Cores (Exemplo: cores predefinidas para melhor visualização)
    const backgroundColors = [
        '#2563eb', // Azul
        '#16a34a', // Verde
        '#f59e0b', // Amarelo/Laranja
        '#ef4444', // Vermelho
        '#6366f1', // Indigo
        '#a855f7', // Roxo
        '#06b6d4', // Ciano
        '#f97316', // Laranja Escuro
    ];
    const borderColors = backgroundColors.map(color => color + 'dd'); // Um pouco mais escura

    // 3. Destrói o gráfico anterior (se existir)
    if (graficoResumo) {
        graficoResumo.destroy();
    }
    
    // 4. Verifica se há dados para exibir
    if (labels.length === 0) {
        // Remove a UL da legenda se ela existir e houver dados
        let oldLegend = canvasContainer.nextElementSibling;
        if (oldLegend && oldLegend.tagName === 'UL') {
            oldLegend.remove();
        }
        // MODIFICAÇÃO: Garante que o estado vazio seja visível
        canvasContainer.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Nenhuma venda registrada para o gráfico.</p></div>';
        return;
    }

    // Cria ou reutiliza o elemento canvas
    let canvas = document.getElementById('resumo-grafico');
    if (!canvas || canvas.parentNode !== canvasContainer) {
        // Limpa e cria o canvas se não existir ou se o conteúdo foi substituído por 'empty-state'
        canvasContainer.innerHTML = ''; 
        canvas = document.createElement('canvas');
        canvas.id = 'resumo-grafico';
        canvasContainer.appendChild(canvas);
    }

    // 5. Cria o novo gráfico
    graficoResumo = new Chart(canvas, {
        type: 'doughnut', 
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderColor: borderColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false 
                },
                htmlLegend: {
                    containerID: 'resumo-grafico-container', 
                },
                title: {
                    display: true,
                    text: 'Distribuição de Vendas por Produto (R$)',
                    font: { size: 14 }
                }
            }
        },
        plugins: [htmlLegendPlugin] 
    });
}


function renderizarListaVendas() {
    const listaVendasDiv = document.getElementById('lista-vendas');
    
    if (estado.vendasHoje.length === 0) {
        listaVendasDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>Nenhuma venda registrada hoje</p>
            </div>`;
        return;
    }

    const listaHtml = document.createElement('ul');
    listaHtml.className = 'vendas-list';

    // Ordena as vendas pela hora de registro (ID em ordem decrescente)
    const vendasOrdenadas = [...estado.vendasHoje].sort((a, b) => b.id - a.id);

    vendasOrdenadas.forEach(venda => {
        const item = document.createElement('li');
        const dataVenda = new Date(venda.timestamp);
        // REFORÇO: Adiciona uma verificação para garantir que o timestamp é válido
        const horaFormatada = isNaN(dataVenda.getTime()) ? 'Horário Desconhecido' : dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const clienteTexto = venda.cliente ? ` | Cliente: ${venda.cliente}` : '';

        item.innerHTML = `
            <div class="venda-info">
                <strong>${venda.nomeProduto} x${venda.quantidade}</strong>
                <div class="details">
                    <span>${horaFormatada}</span>
                    <span>${clienteTexto}</span>
                </div>
                <span>Unidade: ${formatarMoeda(venda.precoUnitario)}</span>
            </div>
            <div class="venda-valor">
                ${formatarMoeda(venda.total)}
                <button onclick="excluirVenda(${venda.id})">Excluir</button>
            </div>
        `;
        listaHtml.appendChild(item);
    });

    listaVendasDiv.innerHTML = '';
    listaVendasDiv.appendChild(listaHtml);
}


function renderizarListaProdutosCadastrados() {
    const listaProdutosDiv = document.getElementById('lista-produtos-cadastrados');

    if (estado.produtos.length === 0) {
           listaProdutosDiv.innerHTML = `
             <div class="empty-state">
                 <i class="fas fa-box-open"></i>
                 <p>Nenhum produto cadastrado.</p>
             </div>`;
        return;
    }
    
    // REFORÇO: Ordena por nome
    const produtosOrdenados = [...estado.produtos].sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR')
    );


    const listaHtml = document.createElement('ul');
    listaHtml.className = 'vendas-list'; 

    produtosOrdenados.forEach(produto => {
        const item = document.createElement('li');
        item.innerHTML = `
            <div class="venda-info">
                <strong>${produto.nome}</strong>
            </div>
            <div class="venda-valor">
                ${formatarMoeda(produto.preco)}
            </div>
        `;
        listaHtml.appendChild(item);
    });

    listaProdutosDiv.innerHTML = '';
    listaProdutosDiv.appendChild(listaHtml);
}

function renderizarHistorico() {
    const listaHistoricoDiv = document.getElementById('lista-historico');
    const detalhesCard = document.getElementById('detalhes-historico-card');
    detalhesCard.classList.add('hidden'); // Esconde detalhes ao recarregar
    listaHistoricoDiv.innerHTML = '';

    if (estado.historico.length === 0) {
        listaHistoricoDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>O histórico será exibido aqui após fechar o dia.</p>
            </div>`;
        return;
    }

    const listaHtml = document.createElement('ul');
    listaHtml.className = 'historico-list';

    // Ordena o histórico por data (mais recente primeiro)
    const historicoOrdenado = [...estado.historico].sort((a, b) => new Date(b.data) - new Date(a.data));

    historicoOrdenado.forEach(dia => {
        const item = document.createElement('li');
        const dataFormatada = new Date(dia.data).toLocaleDateString('pt-BR');

        item.innerHTML = `
            <span class="data-resumo">${dataFormatada}</span>
            <span class="total-resumo">${formatarMoeda(dia.totalArrecadado)}</span>
            <p>Vendas: ${dia.totalVendas} • Itens: ${dia.totalItensVendidos}</p>
            <div class="botoes-resumo">
                <button class="btn-detalhes-hist" onclick="mostrarDetalhesHistorico('${dia.data}')">
                    <i class="fas fa-eye"></i> Detalhes
                </button>
                <button class="btn-detalhes-hist export-hist-pdf" onclick="exportarHistoricoPdf('${dia.data}')">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button> 
                <button class="btn-apagar-hist" onclick="excluirHistorico('${dia.data}')">
                    <i class="fas fa-trash"></i> Apagar
                </button>
            </div>
        `;
        listaHtml.appendChild(item);
    });
    
    listaHistoricoDiv.appendChild(listaHtml);
}

function mostrarDetalhesHistorico(data) {
    const dia = estado.historico.find(d => d.data === data);
    const detalhesCard = document.getElementById('detalhes-historico-card');
    const titulo = document.getElementById('detalhes-historico-titulo');
    const listaDetalhes = document.getElementById('detalhes-vendas-do-dia');

    if (!dia) {
        showToast("Histórico não encontrado.", "error");
        return;
    }
    
    // Rola para o topo para ver o card de detalhes
    detalhesCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    titulo.textContent = `Detalhes de ${new Date(data).toLocaleDateString('pt-BR')}`;
    listaDetalhes.innerHTML = '';

    const listaVendasHtml = document.createElement('ul');
    listaVendasHtml.className = 'vendas-list';

    // Ordena as vendas do histórico por hora
    const vendasOrdenadas = [...dia.vendas].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));


    vendasOrdenadas.forEach(venda => {
        const item = document.createElement('li');
        const dataVenda = new Date(venda.timestamp);
        const horaFormatada = dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const clienteTexto = venda.cliente ? ` | Cliente: ${venda.cliente}` : '';

        item.innerHTML = `
            <div class="venda-info">
                <strong>${venda.nomeProduto} x${venda.quantidade}</strong>
                <div class="details">
                    <span>${horaFormatada}</span>
                    <span>${clienteTexto}</span>
                </div>
                <span>Unidade: ${formatarMoeda(venda.precoUnitario)}</span>
            </div>
            <div class="venda-valor">
                ${formatarMoeda(venda.total)}
            </div>
        `;
        listaVendasHtml.appendChild(item);
    });

    listaDetalhes.appendChild(listaVendasHtml);
    detalhesCard.classList.remove('hidden');
}


// =======================================================================
// LÓGICA DE NEGÓCIO (CRUD)
// =======================================================================

// --- PRODUTOS ---
document.getElementById('form-produto').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome-produto').value.trim();
    // REFORÇO: Sempre parsear para garantir que é um número (float)
    const preco = parseFloat(document.getElementById('preco-produto').value); 

    if (nome === "" || isNaN(preco) || preco <= 0) {
        showToast("Dados do produto inválidos (nome vazio ou preço <= 0).", "error");
        return;
    }
    
    // Evita produtos duplicados
    if (estado.produtos.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
        showToast(`O produto "${nome}" já existe.`, "error");
        return;
    }

    const novoProduto = {
        id: idProdutoAtual++,
        nome: nome,
        preco: preco
    };

    estado.produtos.push(novoProduto);
    salvarEstado();
    atualizarInterface();
    document.getElementById('form-produto').reset();
    showToast(`Produto "${nome}" adicionado!`);
});

document.getElementById('form-excluir-produto').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // REFORÇO: Sempre parsear para garantir que é um número (int)
    const produtoId = parseInt(document.getElementById('select-produto-excluir').value); 
    
    if (!produtoId) {
        showToast("Selecione um produto para excluir.", "error");
        return;
    }

    const index = estado.produtos.findIndex(p => p.id === produtoId);
    
    if (index !== -1) {
        const nomeProdutoExcluido = estado.produtos[index].nome;
        estado.produtos.splice(index, 1);
        salvarEstado();
        atualizarInterface();
        document.getElementById('form-excluir-produto').reset();
        showToast(`Produto "${nomeProdutoExcluido}" excluído com sucesso.`, "error");
    }
});


// --- VENDAS ---
document.getElementById('form-venda').addEventListener('submit', function(e) {
    e.preventDefault();

    const produtoId = parseInt(document.getElementById('produto').value);
    const quantidade = parseInt(document.getElementById('quantidade').value);
    const cliente = document.getElementById('cliente').value.trim();
    
    if (!produtoId || isNaN(quantidade) || quantidade <= 0) {
        showToast("Selecione um produto e uma quantidade válida.", "error");
        return;
    }

    const produto = estado.produtos.find(p => p.id === produtoId);

    if (!produto) {
        showToast("Erro: Produto não encontrado. Recarregue a página.", "error");
        return;
    }

    // REFORÇO: Utiliza o preco do objeto produto, garantindo que seja um number
    const total = parseFloat((produto.preco * quantidade).toFixed(2)); 

    const novaVenda = {
        id: idVendaAtual++,
        idProduto: produto.id,
        nomeProduto: produto.nome,
        precoUnitario: produto.preco,
        quantidade: quantidade,
        cliente: cliente,
        total: total,
        timestamp: Date.now()
    };

    estado.vendasHoje.push(novaVenda);
    salvarEstado();
    atualizarInterface();
    document.getElementById('form-venda').reset();
    document.getElementById('quantidade').value = 1; // Reseta a quantidade para 1
    showToast(`Venda de ${produto.nome} (${formatarMoeda(total)}) registrada!`);
});

function excluirVenda(id) {
    // REFORÇO: Garantir que o ID é um número para a comparação
    const idNum = parseInt(id);
    const index = estado.vendasHoje.findIndex(v => v.id === idNum);
    
    if (index !== -1) {
        const nomeProduto = estado.vendasHoje[index].nomeProduto;
        estado.vendasHoje.splice(index, 1);
        salvarEstado();
        atualizarInterface();
        showToast(`Venda de ${nomeProduto} cancelada.`, "error");
    }
}

// --- HISTÓRICO / NOVO DIA ---
document.getElementById('btnNovoDia').addEventListener('click', function() {
    if (estado.vendasHoje.length === 0) {
        showToast("Não há vendas para fechar o dia.", "error");
        return;
    }
    
    if (confirm("Deseja realmente fechar o dia e arquivar as vendas atuais? Esta ação irá limpar as vendas de hoje.")) {
        const totalArrecadado = estado.vendasHoje.reduce((acc, v) => acc + (v.total || 0), 0);
        const totalItensVendidos = estado.vendasHoje.reduce((acc, v) => acc + (v.quantidade || 0), 0);
        
        // CORREÇÃO LÓGICA: Verifica se já existe um histórico para a data de hoje.
        // Se sim, sobrescreve. Se não, cria um novo.
        const dataHoje = new Date().toISOString().split('T')[0]; 
        
        const novoDiaHistorico = {
            data: dataHoje,
            totalArrecadado: totalArrecadado,
            totalVendas: estado.vendasHoje.length,
            totalItensVendidos: totalItensVendidos,
            // ATENÇÃO: Faz uma cópia profunda do array de vendas para o histórico.
            vendas: JSON.parse(JSON.stringify(estado.vendasHoje)) 
        };
        
        // Encontra o índice do dia no histórico (se já existe)
        const histIndex = estado.historico.findIndex(dia => dia.data === dataHoje);
        
        if (histIndex !== -1) {
            estado.historico[histIndex] = novoDiaHistorico; // Sobrescreve
        } else {
            estado.historico.push(novoDiaHistorico); // Adiciona novo
        }

        estado.vendasHoje = []; // Limpa as vendas de hoje
        idVendaAtual = 1; // Reseta o ID de vendas para o novo dia

        salvarEstado();
        atualizarInterface();
        
        showToast(`Dia fechado com sucesso! Total: ${formatarMoeda(totalArrecadado)}`, 'success');
        
        // Verifica se o elemento da aba existe antes de tentar clicar
        const tabHistorico = document.getElementById('tab-historico');
        if (tabHistorico) {
            tabHistorico.click(); 
        }
    }
});

function excluirHistorico(data) {
     if (confirm(`Deseja realmente excluir o histórico de vendas do dia ${new Date(data).toLocaleDateString('pt-BR')}? Esta ação não pode ser desfeita.`)) {
         estado.historico = estado.historico.filter(dia => dia.data !== data);
         salvarEstado();
         atualizarInterface();
         showToast(`Histórico de ${new Date(data).toLocaleDateString('pt-BR')} excluído.`, 'error');
     }
}

/**
 * NOVO: Exporta para PDF os detalhes de um dia específico do histórico.
 * Usa a biblioteca jsPDF. (Mantido inalterado - Perfeito!)
 */
function exportarHistoricoPdf(data) {
    const dia = estado.historico.find(d => d.data === data);
    
    if (!dia) {
        showToast("Histórico não encontrado.", "error");
        return;
    }

    // Checa se a biblioteca jsPDF está carregada (é uma boa prática)
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Erro: jsPDF não carregado. Verifique o link no HTML.", "error");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dataFormatada = new Date(dia.data).toLocaleDateString('pt-BR');
    
    // Título
    doc.setFontSize(22);
    doc.text(`Relatório de Vendas - ${dataFormatada}`, 10, 20);
    
    doc.setFontSize(10);
    doc.text(`Arquivo gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 10, 26);
    doc.setLineWidth(0.5);
    doc.line(10, 28, 200, 28); // Linha de separação

    // Resumo
    doc.setFontSize(16);
    doc.text(`TOTAL ARRECADADO: ${formatarMoeda(dia.totalArrecadado)}`, 10, 40);
    doc.setFontSize(12);
    doc.text(`Total de Vendas Registradas: ${dia.totalVendas}`, 10, 48);
    doc.text(`Total de Itens Vendidos: ${dia.totalItensVendidos}`, 10, 56);
    
    let y = 70; // Posição Y inicial para a lista

    doc.setFontSize(14);
    doc.text("Detalhes das Vendas Arquivadas:", 10, y);
    y += 8;

    doc.setFontSize(10);
    
    // Ordena as vendas do histórico por hora
    const vendasOrdenadas = [...dia.vendas].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    vendasOrdenadas.forEach((venda, index) => {
        const dataVenda = new Date(venda.timestamp);
        const horaFormatada = dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const clienteTexto = venda.cliente ? ` | Cliente: ${venda.cliente}` : 'N/A';
        
        const linha = `${index + 1}. ${horaFormatada} | ${venda.nomeProduto} (x${venda.quantidade}) | Unidade: ${formatarMoeda(venda.precoUnitario)} | TOTAL: ${formatarMoeda(venda.total)} ${clienteTexto}`;
        
        doc.text(linha, 10, y);
        y += 7;
        
        // Quebra de página se necessário
        if (y > 280) { 
            doc.addPage();
            y = 15;
        }
    });
    
    // Salva o PDF
    doc.save(`relatorio_vendas_${dia.data}.pdf`);
    showToast(`Relatório PDF de ${dataFormatada} exportado!`, "success");
}


// =======================================================================
// LÓGICA DE ABAS E EVENTOS GERAIS
// =======================================================================

function gerenciarAbas() {
    const tabs = document.querySelectorAll('.tabs button');
    const contents = [
        document.getElementById('content-vendas'),
        document.getElementById('content-produtos'),
        document.getElementById('content-historico')
    ];

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 1. Desativa todas as abas e esconde todos os conteúdos
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));

            // 2. Ativa a aba clicada e mostra o conteúdo correspondente
            tab.classList.add('active');
            const targetId = tab.id.replace('tab-', 'content-');
            document.getElementById(targetId).classList.remove('hidden');
            
            // 3. Garante a atualização de dados ao trocar de aba
            atualizarInterface();
        });
    });
}


// =======================================================================
// EXPORTAÇÃO (PDF do Resumo do Dia)
// =======================================================================

document.getElementById('btnExportarPdf').addEventListener('click', function() {
    // Checa se a biblioteca jsPDF está carregada
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Erro: jsPDF não carregado. Verifique o link no HTML.", "error");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(22);
    doc.text("Relatório de Vendas (Resumo do Dia)", 10, 20);
    
    // Data
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 10, 26);
    doc.setLineWidth(0.5);
    doc.line(10, 28, 200, 28); // Linha de separação

    // Resumo
    const totalArrecadado = estado.vendasHoje.reduce((acc, venda) => acc + (venda.total || 0), 0);
    const totalVendas = estado.vendasHoje.length;

    doc.setFontSize(16);
    doc.text(`TOTAL ARRECADADO: ${formatarMoeda(totalArrecadado)}`, 10, 40);
    doc.setFontSize(12);
    doc.text(`Total de Vendas Registradas: ${totalVendas}`, 10, 48);

    let y = 60; // Posição Y inicial para a lista

    if (estado.vendasHoje.length > 0) {
        doc.setFontSize(14);
        doc.text("Detalhes das Vendas de Hoje:", 10, y);
        y += 8;

        doc.setFontSize(10);
        // ORDENAÇÃO: Garante que o PDF lista as vendas na ordem em que foram registradas (ID)
        const vendasOrdenadas = [...estado.vendasHoje].sort((a, b) => a.id - b.id); 
        
        vendasOrdenadas.forEach((venda, index) => {
            const linha = `[${index + 1}] ${venda.nomeProduto} (x${venda.quantidade}) | Total: ${formatarMoeda(venda.total)} | Cliente: ${venda.cliente || 'N/A'}`;
            doc.text(linha, 10, y);
            y += 7;
            
            // Quebra de página se necessário
            if (y > 280) { 
                doc.addPage();
                y = 15;
            }
        });
    } else {
        doc.text("Nenhuma venda registrada hoje.", 10, y);
    }
    
    // Salva o PDF
    doc.save("relatorio_vendas_hoje.pdf");
    showToast("Relatório PDF exportado!", "success");
});

// =======================================================================
// INICIALIZAÇÃO
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    carregarEstado();
    gerenciarAbas();
    atualizarInterface();
    // Garante que a aba Vendas esteja ativa na inicialização
    // REFORÇO: Adiciona a classe 'active' ao botão da aba inicial, se não estiver.
    document.getElementById('tab-vendas').classList.add('active'); 
    document.getElementById('content-vendas').classList.remove('hidden'); 
    
    // O listener para o histórico foi movido para a função 'gerenciarAbas' para ser mais limpo.
});
