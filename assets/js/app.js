/* ❄️ FrostZone Site-wide App Controller */

class FrostApp {
  constructor() {
    this.nav = document.querySelector('.header-nav');
    this.hostBtn = document.getElementById('hero-host-btn');
    this.modal = document.getElementById('room-modal');
    this.modalClose = document.getElementById('modal-close-btn');
    this.hostForm = document.getElementById('modal-host-form');
    this.gameSelect = document.getElementById('modal-game-select');
    this.usernameInput = document.getElementById('modal-username-input');

    this.init();
  }

  init() {
    // 1. Scroll listener for sticky header
    window.addEventListener('scroll', () => {
      if (this.nav) {
        if (window.scrollY > 40) {
          this.nav.classList.add('scrolled');
        } else {
          this.nav.classList.remove('scrolled');
        }
      }
    });

    // 2. Load username into modal input if stored
    if (this.usernameInput) {
      const savedName = localStorage.getItem('fz_player_name');
      if (savedName) {
        this.usernameInput.value = savedName;
      }
    }

    // 3. Populate game select in modal
    this.populateModalGames();

    // 4. Modal listeners
    if (this.hostBtn && this.modal) {
      this.hostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    if (this.hostForm) {
      this.hostForm.addEventListener('submit', (e) => this.handleHostSubmit(e));
    }

    // 5. Scroll Reveal IntersectionObserver
    this.setupScrollReveal();
  }

  async populateModalGames() {
    if (!this.gameSelect) return;
    try {
      const res = await fetch('/data/games.json');
      const games = await res.json();
      
      const options = games
        .filter(g => g.status !== 'coming-soon')
        .map(g => `<option value="${g.slug}">${g.title}</option>`)
        .join('');
        
      this.gameSelect.innerHTML = options;
    } catch (err) {
      console.error('Failed to populate game dropdown:', err);
    }
  }

  openModal() {
    if (this.modal) {
      this.modal.classList.add('active');
      if (this.usernameInput) this.usernameInput.focus();
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  handleHostSubmit(e) {
    e.preventDefault();
    const username = this.usernameInput.value.trim();
    const gameSlug = this.gameSelect.value;
    
    if (username === '') {
      alert('Please enter a username to start playing!');
      return;
    }

    // Save username
    localStorage.setItem('fz_player_name', username);

    // Generate room code and redirect
    const roomCode = this.generateRoomCode();
    window.location.href = `/games/${gameSlug}/?room=${roomCode}`;
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  setupScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  }
}

// Initialise
window.addEventListener('DOMContentLoaded', () => {
  new FrostApp();
});
