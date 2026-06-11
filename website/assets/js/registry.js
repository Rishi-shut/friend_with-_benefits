/* ❄️ FrostZone Game Registry Loader */

class GameRegistry {
  constructor() {
    this.gamesGrid = document.getElementById('games-grid');
    this.filterContainer = document.getElementById('filter-bar');
    this.games = [];
    this.activeFilter = 'all';

    if (this.gamesGrid) {
      this.init();
    }
  }

  async init() {
    try {
      const response = await fetch('/data/games.json');
      this.games = await response.json();
      this.renderFilterBar();
      this.renderGrid();
      this.setupEventListeners();
    } catch (err) {
      console.error('Error loading game registry:', err);
      if (this.gamesGrid) {
        this.gamesGrid.innerHTML = `<p class="error-msg">Brrr, failed to load games. Refresh the page to thaw. ❄️</p>`;
      }
    }
  }

  renderFilterBar() {
    if (!this.filterContainer) return;
    
    // Extract unique tags and build filter pills
    const allTags = new Set();
    this.games.forEach(game => {
      game.tags.forEach(tag => allTags.add(tag));
    });

    const categories = [
      { id: 'all', label: 'All' },
      { id: '2-players', label: '2 Players' },
      { id: 'party', label: 'Party' },
      { id: 'strategy', label: 'Strategy' },
      { id: 'quick-play', label: 'Quick Play' }
    ];

    this.filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-pill ${cat.id === this.activeFilter ? 'filter-pill--active' : ''}" data-filter="${cat.id}">
        ${cat.label}
      </button>
    `).join('');
  }

  renderGrid() {
    if (!this.gamesGrid) return;

    // Filter games
    const filteredGames = this.games.filter(game => {
      if (this.activeFilter === 'all') return true;
      return game.tags.includes(this.activeFilter);
    });

    if (filteredGames.length === 0) {
      this.gamesGrid.innerHTML = `<p class="no-results">No games match this category. ❄️</p>`;
      return;
    }

    // Render cards with transition delay styling
    this.gamesGrid.innerHTML = filteredGames.map((game, index) => {
      const isLive = game.status === 'live';
      const isBeta = game.status === 'beta';
      const isComingSoon = game.status === 'coming-soon';
      
      let badgeHTML = '';
      if (isLive) badgeHTML = `<span class="game-card__badge game-card__badge--live">Live</span>`;
      else if (isBeta) badgeHTML = `<span class="game-card__badge game-card__badge--beta">Beta</span>`;
      else badgeHTML = `<span class="game-card__badge game-card__badge--coming-soon">Soon</span>`;

      const ctaText = isComingSoon ? 'Locked' : 'Play Now';
      const cardClass = isComingSoon ? 'game-card game-card--coming-soon' : 'game-card card-lift';

      return `
        <article class="${cardClass}" data-slug="${game.slug}" style="animation: frost-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: ${index * 80}ms;">
          <div class="game-card__thumb">
            <img src="${game.thumbnail}" alt="${game.title} thumbnail" loading="lazy">
            ${badgeHTML}
          </div>
          <div class="game-card__body">
            <h3 class="game-card__title">${game.title}</h3>
            <p class="game-card__tagline">${game.tagline}</p>
            <div class="game-card__meta">
              <span class="pill">👥 ${game.minPlayers}–${game.maxPlayers}</span>
              <span class="pill">⚡ ~${game.estimatedMinutes} min</span>
              ${game.tags.slice(0, 1).map(tag => `<span class="pill pill--tag">${this.capitalize(tag)}</span>`).join('')}
            </div>
            <button class="btn btn--primary game-card__cta" ${isComingSoon ? 'disabled' : ''}>
              ${ctaText}
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  setupEventListeners() {
    // 1. Filter pill click events
    if (this.filterContainer) {
      this.filterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;

        // Reset active state
        this.filterContainer.querySelectorAll('.filter-pill').forEach(btn => {
          btn.classList.remove('filter-pill--active');
        });

        pill.classList.add('filter-pill--active');
        this.activeFilter = pill.dataset.filter;
        
        // Re-render
        this.renderGrid();
      });
    }

    // 2. Game card clicks (Redirect to game room)
    if (this.gamesGrid) {
      this.gamesGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.game-card');
        if (!card) return;

        const slug = card.dataset.slug;
        const game = this.games.find(g => g.slug === slug);
        if (!game || game.status === 'coming-soon') return;

        // Generate a random room code and redirect
        const roomCode = this.generateRoomCode();
        window.location.href = `/games/${slug}/?room=${roomCode}`;
      });
    }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  capitalize(str) {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}

// Initialise
window.addEventListener('DOMContentLoaded', () => {
  new GameRegistry();
});
