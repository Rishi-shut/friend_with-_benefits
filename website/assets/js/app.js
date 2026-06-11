/* ❄️ FrostZone Site-wide App Controller */

class FrostApp {
  constructor() {
    this.loungeMessages = document.getElementById('lounge-messages');
    this.loungeInput = document.getElementById('lounge-input');
    this.loungeForm = document.getElementById('lounge-form');
    this.loungeUserList = document.getElementById('lounge-user-list');

    this.usernameInput = document.getElementById('profile-username');
    this.saveProfileBtn = document.getElementById('save-profile-btn');
    
    // Sliders
    this.densitySlider = document.getElementById('slider-density');
    this.speedSlider = document.getElementById('slider-speed');
    this.windSlider = document.getElementById('slider-wind');

    // Values
    this.valDensity = document.getElementById('val-density');
    this.valSpeed = document.getElementById('val-speed');
    this.valWind = document.getElementById('val-wind');
    this.resetSlidersBtn = document.getElementById('reset-sliders-btn');

    // Profile state
    this.playerId = sessionStorage.getItem('fz_player_id') || 'p_' + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem('fz_player_id', this.playerId);

    this.playerName = localStorage.getItem('fz_player_name') || 'SnowWalker_' + Math.floor(Math.random() * 90 + 10);
    this.playerAvatar = localStorage.getItem('fz_player_avatar') || '🐧';
    this.playerAccent = localStorage.getItem('fz_player_accent') || '#4A9EDB';

    this.users = {}; // id -> { name, avatar, color }

    this.init();
  }

  init() {
    // 1. Initialise form inputs with values
    if (this.usernameInput) this.usernameInput.value = this.playerName;
    
    // 2. Setup Profile & Accent theme listeners
    this.setupThemeAndAvatars();

    // 3. Setup Snowfall controls listeners
    this.setupSnowfallControls();

    // 4. Setup Global Lounge Chat (BroadcastChannel)
    this.setupGlobalLounge();

    // 5. Scroll reveal animations
    this.setupScrollReveal();
  }

  setupThemeAndAvatars() {
    // Highlight saved avatar
    const avatars = document.querySelectorAll('.avatar-option');
    avatars.forEach(el => {
      if (el.dataset.avatar === this.playerAvatar) {
        el.classList.add('active');
      }
      el.addEventListener('click', () => {
        avatars.forEach(a => a.classList.remove('active'));
        el.classList.add('active');
        this.playerAvatar = el.dataset.avatar;
        this.saveProfile();
      });
    });

    // Color Swatches
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(el => {
      const color = el.dataset.color;
      el.style.backgroundColor = color;
      
      if (color === this.playerAccent) {
        el.classList.add('active');
      }

      el.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        this.playerAccent = color;
        this.applyThemeAccent(color);
        this.saveProfile();
      });
    });

    // Apply saved theme accent on load
    this.applyThemeAccent(this.playerAccent);

    // Nickname save trigger
    if (this.saveProfileBtn) {
      this.saveProfileBtn.addEventListener('click', () => {
        const val = this.usernameInput.value.trim();
        if (val === '') {
          alert('Username cannot be empty!');
          return;
        }
        this.playerName = val;
        this.saveProfile();
        
        // Broadcast renaming event
        this.broadcastLounge({
          type: 'rename',
          senderId: this.playerId,
          newName: this.playerName
        });

        // Local feedback
        const origText = this.saveProfileBtn.textContent;
        this.saveProfileBtn.textContent = 'Saved! ✅';
        setTimeout(() => this.saveProfileBtn.textContent = origText, 1200);
      });
    }
  }

  applyThemeAccent(color) {
    // Map of accents to hover/pressed shades
    const shadeMap = {
      '#4A9EDB': '#1A5C96', // Arctic Blue -> Deep Ice
      '#38C9C0': '#1A968E', // Crystal Teal -> Dark Teal
      '#9B7FE8': '#6E52BA', // Aurora Violet -> Dark Violet
      '#1A5C96': '#0E375C', // Deep Ice -> Midnight Ice
      '#A8CFED': '#6193BB', // Glacier Blue -> Medium Blue
    };
    
    const hoverColor = shadeMap[color] || '#1A5C96';
    document.documentElement.style.setProperty('--arctic-blue', color);
    document.documentElement.style.setProperty('--deep-ice', hoverColor);
  }

  saveProfile() {
    localStorage.setItem('fz_player_name', this.playerName);
    localStorage.setItem('fz_player_avatar', this.playerAvatar);
    localStorage.setItem('fz_player_accent', this.playerAccent);

    // Sync self state in users list
    this.users[this.playerId] = {
      name: this.playerName,
      avatar: this.playerAvatar,
      color: this.playerAccent
    };
    this.renderUserList();
  }

  setupSnowfallControls() {
    if (!this.densitySlider) return;

    // Density Slider
    this.densitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.valDensity.textContent = val;
      if (window.snowfallInstance) {
        window.snowfallInstance.setParticleCount(val);
      }
    });

    // Speed Slider
    this.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.valSpeed.textContent = val.toFixed(1) + 'x';
      if (window.snowfallInstance) {
        window.snowfallInstance.speedScale = val;
      }
    });

    // Wind Slider
    this.windSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      let direction = 'None';
      if (val > 0.1) direction = 'Right';
      if (val < -0.1) direction = 'Left';
      this.valWind.textContent = `${direction} (${Math.abs(val).toFixed(1)})`;
      if (window.snowfallInstance) {
        window.snowfallInstance.windScale = val;
      }
    });

    // Reset controls
    if (this.resetSlidersBtn) {
      this.resetSlidersBtn.addEventListener('click', () => {
        this.densitySlider.value = 80;
        this.speedSlider.value = 1.0;
        this.windSlider.value = 0.0;

        this.valDensity.textContent = 80;
        this.valSpeed.textContent = '1.0x';
        this.valWind.textContent = 'None';

        if (window.snowfallInstance) {
          window.snowfallInstance.setParticleCount(80);
          window.snowfallInstance.speedScale = 1.0;
          window.snowfallInstance.windScale = 0.0;
        }
      });
    }
  }

  setupGlobalLounge() {
    if (!this.loungeMessages) return;

    // Connect BroadcastChannel
    this.loungeChannel = new BroadcastChannel('fz_global_lounge');
    this.loungeChannel.onmessage = (e) => this.handleLoungeMessage(e.data);

    // Initial self insertion
    this.users[this.playerId] = {
      name: this.playerName,
      avatar: this.playerAvatar,
      color: this.playerAccent
    };
    this.renderUserList();

    // Broadcast connection greeting
    setTimeout(() => {
      this.broadcastLounge({
        type: 'enter',
        senderId: this.playerId,
        name: this.playerName,
        avatar: this.playerAvatar,
        color: this.playerAccent
      });
    }, 200);

    // Clean leave
    window.addEventListener('beforeunload', () => {
      this.broadcastLounge({
        type: 'leave',
        senderId: this.playerId
      });
    });

    // Chat submit
    if (this.loungeForm) {
      this.loungeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.loungeInput.value.trim();
        if (text === '') return;

        this.broadcastLounge({
          type: 'chat',
          senderId: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar,
          color: this.playerAccent,
          text: text
        });

        // Render self locally
        this.appendLoungeMessage({
          senderId: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar,
          color: this.playerAccent,
          text: text,
          isSelf: true
        });

        this.loungeInput.value = '';
      });
    }
  }

  broadcastLounge(msg) {
    if (this.loungeChannel) {
      try {
        this.loungeChannel.postMessage(msg);
      } catch (err) {
        console.error(err);
      }
    }
  }

  handleLoungeMessage(msg) {
    switch (msg.type) {
      case 'enter':
        // New user joined. Add them and ping them back so they learn about us!
        this.users[msg.senderId] = {
          name: msg.name,
          avatar: msg.avatar,
          color: msg.color
        };
        this.renderUserList();
        this.appendLoungeMessage({ type: 'system', text: `${msg.avatar} ${msg.name} entered the lounge.` });

        // Ack back
        this.broadcastLounge({
          type: 'enter-ack',
          senderId: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar,
          color: this.playerAccent
        });
        break;

      case 'enter-ack':
        // Reply containing user profile
        this.users[msg.senderId] = {
          name: msg.name,
          avatar: msg.avatar,
          color: msg.color
        };
        this.renderUserList();
        break;

      case 'leave':
        if (this.users[msg.senderId]) {
          const user = this.users[msg.senderId];
          this.appendLoungeMessage({ type: 'system', text: `${user.avatar} ${user.name} left the lounge.` });
          delete this.users[msg.senderId];
          this.renderUserList();
        }
        break;

      case 'rename':
        if (this.users[msg.senderId]) {
          const oldName = this.users[msg.senderId].name;
          this.users[msg.senderId].name = msg.newName;
          this.renderUserList();
          this.appendLoungeMessage({ type: 'system', text: `${this.users[msg.senderId].avatar} ${oldName} renamed to ${msg.newName}.` });
        }
        break;

      case 'chat':
        // Make sure user is in our registry
        this.users[msg.senderId] = {
          name: msg.name,
          avatar: msg.avatar,
          color: msg.color
        };
        this.renderUserList();

        this.appendLoungeMessage({
          senderId: msg.senderId,
          name: msg.name,
          avatar: msg.avatar,
          color: msg.color,
          text: msg.text,
          isSelf: false
        });
        break;
    }
  }

  appendLoungeMessage(msg) {
    if (!this.loungeMessages) return;

    const div = document.createElement('div');
    if (msg.type === 'system') {
      div.className = 'lounge-msg lounge-msg--system';
      div.innerHTML = `<div class="lounge-msg-bubble">${msg.text}</div>`;
    } else {
      const isSelf = msg.isSelf;
      div.className = `lounge-msg ${isSelf ? 'lounge-msg--self' : ''}`;
      div.innerHTML = `
        <div class="lounge-msg-meta">
          <span>${msg.avatar} ${msg.name}</span>
        </div>
        <div class="lounge-msg-bubble">${msg.text}</div>
      `;
    }

    this.loungeMessages.appendChild(div);
    this.loungeMessages.scrollTop = this.loungeMessages.scrollHeight;
  }

  renderUserList() {
    if (!this.loungeUserList) return;

    const html = Object.keys(this.users).map(pId => {
      const u = this.users[pId];
      const isSelfTag = pId === this.playerId ? ' (You)' : '';
      return `
        <div class="lounge-user-item" title="${u.name}${isSelfTag}">
          <span class="lounge-user-dot" style="background-color: ${u.color};"></span>
          <span>${u.avatar} ${u.name}${isSelfTag}</span>
        </div>
      `;
    }).join('');

    this.loungeUserList.innerHTML = html;
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

window.addEventListener('DOMContentLoaded', () => {
  new FrostApp();
});
