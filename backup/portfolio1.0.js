/* Baseado inteiramente no portfolio.js para garantir a lógica mais completa */

const GLOBAL_BACKUP = 'assets/img/backup/placeholder.jpg';

async function setAllThumbnails() {
    const cards = document.querySelectorAll('.project-card-base');
    for (const card of cards) {
        const img = card.querySelector('.card-image');
        const videoId = card.dataset.video;
        const isVimeo = card.dataset.platform === 'vimeo';

        if (img && videoId) {
            // Verifica se é placeholder
            if(videoId.startsWith('VIDEO_ID') || videoId.startsWith('REEL_ID')) {
                img.src = 'https://via.placeholder.com/640x360/333/fff?text=Video+Preview';
                continue;
            }

            if (isVimeo) {
                try {
                    const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
                    const data = await response.json();
                    img.src = data.thumbnail_url_with_play_button.replace('640', '1280') || data.thumbnail_url;
                } catch(e) { img.src = GLOBAL_BACKUP; }
            } else {
                const hdUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                const sdUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                const tempImg = new Image();
                tempImg.onload = () => { img.src = (tempImg.width <= 120) ? sdUrl : hdUrl; };
                tempImg.onerror = () => img.src = sdUrl;
                tempImg.src = hdUrl;
            }
        }
    }
}

function openModal(name, ratio, videoId, platform = 'youtube') {
    const modal = document.getElementById('video-modal');
    // Nota: O HTML foi atualizado para conter id="iframe-content"
    const container = document.getElementById('iframe-content');
    
    // Ignora placeholders nos cliques
    if(videoId.startsWith('VIDEO_ID') || videoId.startsWith('REEL_ID')) {
        alert("Vídeo de demonstração. Substitua os IDs no HTML.");
        return;
    }

    if (ratio === '9:16') modal.classList.add('vertical'); else modal.classList.remove('vertical');

    let url = '';
    if (platform === 'vimeo') {
        url = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    } else {
        url = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
    }

    if(container) {
        container.innerHTML = `<iframe src="${url}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('iframe-content');
    
    modal.style.display = 'none';
    if(container) container.innerHTML = '';
    document.body.style.overflow = 'auto';
}

// Drag to Scroll
const slider = document.getElementById('v-scroller');
if (slider) {
    let isDown = false, startX, scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true; slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => { isDown = false; slider.classList.remove('active'); });
    slider.addEventListener('mouseup', () => { isDown = false; slider.classList.remove('active'); });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2.5; 
        slider.scrollLeft = scrollLeft - walk;
    });
}

// Efeito de Header no Scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    const header = document.getElementById('header');
    if(header) {
        if (currentScroll > lastScroll && currentScroll > 100) header.style.transform = 'translateY(-100%)';
        else header.style.transform = 'translateY(0)';
    }
    lastScroll = currentScroll;
});

// Listener Global para fechar modal com click fora
document.addEventListener('DOMContentLoaded', () => {
    setAllThumbnails();
    
    const modal = document.getElementById('video-modal');
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});

document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });