/* blog.js - Lógica principal do blog
   Versão: Integrada com Ticker REAL e Widgets
*/

document.addEventListener('DOMContentLoaded', () => {
    initVisualEffects();
    initLLMWidget();
    initNewsWidget();
    initNasaWidget();
    loadBlogPosts(); 
    initTicker();   
});

// =================================================================
// 1. EFEITOS VISUAIS E DE UI
// =================================================================
function initVisualEffects() {
    // Typewriter
    const typewriterElement = document.getElementById('typewriter');
    if (typewriterElement) {
        const text = "Tecnologia aberta, mídia independente e o fortalecimento do terceiro setor...";
        let i = 0;
        function type() {
            if (i < text.length) {
                typewriterElement.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, 40);
            }
        }
        type();
    }

    // Barra de Progresso
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = scrollPercent + "%";
    });

    // Header Shrink
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 80) header.classList.add('shrink');
            else header.classList.remove('shrink');
        });
    }

    // Tooltips
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    document.body.appendChild(tooltip);

    document.addEventListener('mousemove', (e) => {
        const target = e.target.closest('.tooltip-trigger');
        if (target) {
            tooltip.textContent = target.getAttribute('data-tooltip');
            tooltip.style.display = 'block';
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    });
}

// =================================================================
// 2. WIDGET DE RANKING DE LLMs (HUGGING FACE - DADOS REAIS)
// =================================================================
// Nota: Esta função usa a API pública, sem necessidade de chaves.
const llmFallbackData = [
    { rank: 1, name: "Llama-3-8B-Instruct", meta: "Meta | 2.5M+ DLs", score: "9.8", trend: "up", description: "Modelo eficiente e muito popular." },
    { rank: 2, name: "Mistral-7B-v0.3", meta: "Mistral AI | 1.8M+ DLs", score: "9.5", trend: "up", description: "Performance alta com baixo recurso." },
    { rank: 3, name: "Mixtral-8x7B", meta: "Mistral AI | 900k+ DLs", score: "9.3", trend: "stable", description: "Arquitetura MoE de alta qualidade." }
];

function initLLMWidget() {
    window.updateLLMRanking = async function(fetchOnline = true) {
        const listContainer = document.getElementById('llm-list');
        const updateInfo = document.getElementById('last-update');
        const refreshBtn = document.getElementById('refresh-llm-btn');
        
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="loading-state">Acessando Neural Net...</div>';
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="refreshing">↻</span> Buscando...';
        }

        try {
            if (fetchOnline) {
                // API Pública da Hugging Face
                const params = new URLSearchParams({
                    'pipeline_tag': 'text-generation',
                    'sort': 'downloads',
                    'direction': '-1',
                    'limit': '15',
                    'full': 'false'
                });
                const response = await fetch(`https://huggingface.co/api/models?${params}`);
                if (!response.ok) throw new Error(`Status HF: ${response.status}`);
                const models = await response.json();
                renderLLMList(processHFModels(models));
                
                if (updateInfo) {
                    const now = new Date();
                    updateInfo.textContent = `Atualizado: ${now.toLocaleTimeString()}`;
                }
            } else { throw new Error("Offline mode"); }
        } catch (error) {
            console.warn('Usando fallback LLM:', error);
            renderLLMList(llmFallbackData);
            if (updateInfo) updateInfo.textContent = 'Modo Offline (Cache)';
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<span class="icon">🤗</span> Atualizar da HF';
            }
        }
    };

    // Inicializa
    const widget = document.getElementById('llm-ranking-widget');
    if (widget) {
        window.updateLLMRanking(true);
        const btn = document.getElementById('refresh-llm-btn');
        if (btn) btn.addEventListener('click', () => window.updateLLMRanking(true));
    }
}

function processHFModels(models) {
    // Filtra modelos para mostrar apenas os mais relevantes/abertos
    const validLicenses = ['apache', 'mit', 'bsd', 'cc', 'openrail'];
    return models.filter(model => {
        if (!model.tags) return false;
        // Verifica licença open source
        const hasOpenLicense = model.tags.some(tag => tag.startsWith('license:') && validLicenses.some(l => tag.includes(l)));
        return hasOpenLicense && !model.id.toLowerCase().includes('checkpoint') && model.downloads > 1000;
    }).slice(0, 5).map((model, index) => ({
        rank: index + 1,
        name: formatModelName(model.id),
        meta: `${formatNumber(model.downloads)} DLs`,
        score: (Math.log10(model.downloads + model.likes) * 1.2).toFixed(1),
        trend: index < 2 ? 'up' : 'stable',
        description: `Modelo ${model.pipeline_tag} popular.`
    }));
}

function renderLLMList(data) {
    const listContainer = document.getElementById('llm-list');
    listContainer.innerHTML = '';
    data.forEach(item => {
        const trendIcon = item.trend === 'up' ? '▲' : '■';
        const div = document.createElement('div');
        div.className = 'llm-item tooltip-trigger';
        div.setAttribute('data-tooltip', item.description);
        div.innerHTML = `
            <div class="llm-rank">#${item.rank}</div>
            <div class="llm-info">
                <div class="llm-name">${item.name}</div>
                <div class="llm-meta">${item.meta}</div>
            </div>
            <div class="llm-stats">
                <div class="llm-score">${item.score}</div>
                <div class="llm-trend trend-${item.trend}">${trendIcon}</div>
            </div>`;
        listContainer.appendChild(div);
    });
}

// =================================================================
// 3. WIDGET DE NOTÍCIAS (GNEWS)
// =================================================================
function initNewsWidget() {
    // ATENÇÃO: Se o GitHub bloquear o upload, apague esta chave e deixe vazio ''
    const GNEWS_API_KEY = 'd4617843322ccb5e2b3480a09cebe78f'; 
    const NEWS_CACHE_KEY = 'blog_tech_news_cache';
    
    // Notícias de Fallback (Caso a API falhe)
    const newsFallbackData = [
        { title: "Open Source e a soberania digital", url: "#", source: "System Core", publishedAt: new Date().toISOString() },
        { title: "Ferramentas de criptografia para ativistas", url: "#", source: "Privacy Daily", publishedAt: new Date().toISOString() },
        { title: "IA Generativa: Avanços e Ética", url: "#", source: "Neural Net", publishedAt: new Date().toISOString() }
    ];

    async function fetchTechNews() {
        const listContainer = document.getElementById('tech-news-list');
        const spinner = document.getElementById('news-spinner');
        if (!listContainer) return;

        // Verifica Cache (1 hora)
        const cached = localStorage.getItem(NEWS_CACHE_KEY);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (new Date().getTime() - timestamp < 3600000) { 
                renderNews(data);
                return;
            }
        }

        if (spinner) spinner.style.display = 'inline';
        
        try {
            const url = `https://gnews.io/api/v4/search?q="open source" OR "artificial intelligence"&lang=pt&max=4&apikey=${GNEWS_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro API: ${response.status}`);
            const result = await response.json();

            if (result.articles && result.articles.length > 0) {
                renderNews(result.articles);
                localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
                    timestamp: new Date().getTime(),
                    data: result.articles
                }));
            } else { throw new Error("Sem artigos."); }

        } catch (error) {
            console.warn("Usando notícias de fallback:", error);
            renderNews(newsFallbackData);
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function renderNews(articles) {
        const listContainer = document.getElementById('tech-news-list');
        if(listContainer) {
            listContainer.innerHTML = '';
            articles.forEach(article => {
                const date = new Date(article.publishedAt).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
                const li = document.createElement('li');
                li.innerHTML = `> <a href="${article.url}" target="_blank">${article.title} <span class="news-meta">[${date}] :: <span class="news-source">${article.source.name || article.source}</span></span></a>`;
                listContainer.appendChild(li);
            });
        }
    }
    fetchTechNews();
}

// =================================================================
// 4. WIDGET NASA APOD
// =================================================================
function initNasaWidget() {
    const NASA_API_KEY = 'DEMO_KEY'; // Chave pública
    const NASA_CACHE_KEY = 'blog_nasa_apod_cache';

    async function fetchNasaApod() {
        const container = document.getElementById('nasa-content');
        const loading = document.getElementById('nasa-loading');
        const dataContainer = document.getElementById('nasa-data');
        
        if (!container) return;

        try {
            let apodData;
            const cached = localStorage.getItem(NASA_CACHE_KEY);
            const today = new Date().toISOString().split('T')[0];

            if (cached) {
                const { date, data } = JSON.parse(cached);
                if (date === today) apodData = data;
            }

            if (!apodData) {
                const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
                if (!response.ok) throw new Error('NASA API Error');
                apodData = await response.json();
                localStorage.setItem(NASA_CACHE_KEY, JSON.stringify({ date: today, data: apodData }));
            }

            renderNasaWidget(apodData);
            if (loading) loading.style.display = 'none';
            if (dataContainer) dataContainer.style.display = 'block';

        } catch (error) {
            if (container) container.innerHTML = '<div class="error-msg">[ERRO: FALHA NA TELEMETRIA ORBITAL]</div>';
        }
    }

    function renderNasaWidget(data) {
        const imgContainer = document.querySelector('.nasa-image-container');
        const title = document.querySelector('.nasa-title');
        const explanation = document.getElementById('nasa-explanation');
        const toggleBtn = document.getElementById('toggle-explanation-btn');

        if (imgContainer) {
            if (data.media_type === 'image') {
                imgContainer.innerHTML = `<img src="${data.url}" alt="${data.title}">`;
            } else {
                imgContainer.innerHTML = `<iframe src="${data.url}" frameborder="0" allowfullscreen></iframe>`;
            }
        }
        if (title) title.textContent = `> ARQUIVO: ${data.title.toUpperCase()}`;
        if (explanation) explanation.textContent = data.explanation;
        
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                const isHidden = explanation.style.display === 'none';
                explanation.style.display = isHidden ? 'block' : 'none';
                toggleBtn.textContent = isHidden ? '[OCULTAR RELATÓRIO]' : '[VER RELATÓRIO TÉCNICO]';
            };
        }
    }
    fetchNasaApod();
}

// =================================================================
// 5. CARREGADOR DE POSTS DINÂMICO
// =================================================================
async function loadBlogPosts() {
    const featuredContainer = document.getElementById('featured-post-container');
    const listContainer = document.getElementById('posts-list-ul');
    if (!featuredContainer) return;

    try {
        const response = await fetch('posts.json');
        if (!response.ok) throw new Error('Falha ao carregar posts.json');
        const posts = await response.json();
        
        if (posts.length === 0) {
            featuredContainer.innerHTML = '<p>Nenhum dado encontrado no buffer.</p>';
            return;
        }

        const latestPost = posts[0];
        const olderPosts = posts.slice(1);

        featuredContainer.innerHTML = `
            <article class="post">
                <div class="post-img-container">
                    <img src="${latestPost.image}" alt="${latestPost.title}">
                    <div class="post-img-overlay">
                        <h1 class="post-title">${latestPost.title}</h1>
                        <h2 class="post-subtitle">${latestPost.subtitle}</h2>
                    </div>
                </div>
                <div class="post-body">
                    <span class="post-category">${latestPost.category}</span>
                    <p style="margin-top: 20px; font-size: 1.1rem; color: var(--text-main);">${latestPost.summary}</p>
                    <div style="margin-top: 30px;">
                        <a href="post.html?id=${latestPost.id}" class="terminal-btn">
                            <span class="icon">➜</span> ACESSAR ARQUIVO COMPLETO
                        </a>
                    </div>
                    <span class="date-label" style="display:block; margin-top:30px; color:var(--text-dim)">DATA_REF: ${latestPost.date}</span>
                </div>
            </article>`;

        if (listContainer && olderPosts.length > 0) {
            listContainer.innerHTML = '';
            olderPosts.forEach(post => {
                const li = document.createElement('li');
                li.innerHTML = `> <a href="post.html?id=${post.id}" class="archive-link">[${post.date}] ${post.title} <span class="dim">:: ${post.category.replace('// ', '')}</span></a>`;
                listContainer.appendChild(li);
            });
        }
    } catch (error) {
        featuredContainer.innerHTML = `<div class="error-msg">[ERRO DE SISTEMA: ${error.message}]</div>`;
    }
}

// =================================================================
// 6. GLOBAL DATA TICKER (AGORA COM DADOS REAIS - FINNHUB & OPENALEX)
// =================================================================
const FINNHUB_KEY = 'cp0j1hhr01qjff863jrgcp0j1hhr01qjff863js0'; // Chave pública Finnhub

function initTicker() {
    updateFinanceData('NVDA', '#ticker-nvda'); // Nvidia Real
    updateFinanceData('LIT', '#ticker-setm');  // ETF Baterias/Litio Real
    updateHFCounter();      // Hugging Face Real
    updateOpenAlexData();   // Papers Reais
    startEnergySimulation(); // Energia Estimada
}

// --- A. FINANÇAS (FINNHUB API) ---
async function updateFinanceData(symbol, selector) {
    const el = document.querySelector(`${selector} .value`);
    if (!el) return;

    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
        const data = await response.json();
        
        if (data.c) {
            const price = data.c.toFixed(2);
            const change = data.dp.toFixed(2);
            const isUp = data.dp >= 0;
            el.innerHTML = `$${price} <span class="${isUp ? 'up' : 'down'}">(${isUp ? '+' : ''}${change}%)</span>`;
        }
    } catch (e) {
        // Fallback silencioso se a API falhar
        console.warn(`Erro ticker ${symbol}`, e);
    }
}

// --- B. MODELOS DE IA (HUGGING FACE) ---
async function updateHFCounter() {
    const el = document.querySelector('#ticker-hf .value');
    if (!el) return;
    try {
        const response = await fetch('https://huggingface.co/api/models?limit=1');
        const totalHeader = response.headers.get('x-total-count');
        if (totalHeader) {
            const totalInt = parseInt(totalHeader, 10);
            el.innerText = new Intl.NumberFormat('en-US', { notation: "compact" }).format(totalInt);
        }
    } catch (e) { el.innerText = "1M+"; }
}

// --- C. PAPERS ACADÊMICOS (OPENALEX) ---
async function updateOpenAlexData() {
    const currentYear = new Date().getFullYear();
    
    // GenAI Papers
    const elGenAI = document.querySelector('#ticker-genai .value') || document.querySelector('#ticker-openalex .value');
    if (elGenAI) {
        try {
            const url = `https://api.openalex.org/works?filter=publication_year:${currentYear},default.search:generative+ai&group_by=publication_year`;
            const res = await fetch(url);
            const data = await res.json();
            const count = data.group_by.find(g => g.key == currentYear)?.count || 0;
            elGenAI.innerText = `+${new Intl.NumberFormat('en-US').format(count)}`;
        } catch (e) { elGenAI.innerText = "+54k"; }
    }

    // ArXiv (CS) Papers
    const elArxiv = document.querySelector('#ticker-arxiv .value');
    if (elArxiv) {
        try {
            const url = `https://api.openalex.org/works?filter=publication_year:${currentYear},primary_location.source.id:S4306400194,concepts.id:C41008148&group_by=publication_year`;
            const res = await fetch(url);
            const data = await res.json();
            const count = data.group_by.find(g => g.key == currentYear)?.count || 0;
            const dayOfYear = Math.floor((new Date() - new Date(currentYear, 0, 0)) / 1000 / 60 / 60 / 24);
            const dailyAvg = Math.max(1, Math.round(count / dayOfYear));
            elArxiv.innerText = `+${dailyAvg}/dia`;
        } catch (e) { elArxiv.innerText = "+150/dia"; }
    }
}

// --- D. ENERGIA (ESTIMATIVA) ---
function startEnergySimulation() {
    const el = document.querySelector('#ticker-energy .value');
    if (!el) return;
    
    const now = new Date();
    const secondsToday = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    // Baseado em 460 TWh/ano global (~14587 kWh/s)
    let currentKWh = secondsToday * 14587; 

    setInterval(() => {
        currentKWh += (1458.7) + (Math.random() * 100); 
        el.innerText = Math.floor(currentKWh).toLocaleString('en-US');
    }, 100);
}

// Utilitários
function formatModelName(id) {
    const parts = id.split('/');
    let name = parts.length > 1 ? parts[1] : parts[0];
    if(name.length > 20) name = name.substring(0, 18) + '..';
    return name;
}
function formatNumber(num) {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
}