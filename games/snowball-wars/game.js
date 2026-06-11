/* ❄️ Snowball Wars Game Module */

import { room } from '/assets/js/room.js';

export default class SnowballWars {
  constructor(container, roomId, playerId) {
    this.container = container;
    this.roomId = roomId;
    this.playerId = playerId;

    // Create Canvas
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    // Set Dimensions
    this.resize(this.container.clientWidth, this.container.clientHeight);

    // Game variables
    this.running = false;
    this.players = {}; // playerId -> playerState
    this.snowballs = [];
    this.particles = [];
    this.obstacles = [];

    // Local inputs
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.lastThrowTime = 0;
    this.throwCooldown = 400; // ms

    // Bot AI state (only host ticks this)
    this.lastBotThrow = 0;
    this.botThrowCooldown = 2000;

    // Local player setup
    this.localPlayer = {
      id: this.playerId,
      name: room.playerName,
      x: this.width / 2 + (Math.random() - 0.5) * 100,
      y: this.height / 2 + (Math.random() - 0.5) * 100,
      radius: 18,
      speed: 3.5,
      angle: 0,
      score: 0,
      isFrozen: false,
      freezeTime: 0,
      color: this.getNameColor(room.playerName)
    };
    this.players[this.playerId] = this.localPlayer;

    // Populate remote players
    room.getPlayers().forEach(p => {
      if (p.id !== this.playerId) {
        this.addRemotePlayer(p.id, p.name, p.isBot);
      }
    });

    this.setupObstacles();
    this.setupInputs();
  }

  getNameColor(name) {
    const hash = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
    return `hsl(${hash}, 75%, 60%)`;
  }

  addRemotePlayer(id, name, isBot = false) {
    if (this.players[id]) return;
    this.players[id] = {
      id: id,
      name: name,
      x: this.width / 2 + (Math.random() - 0.5) * 200,
      y: this.height / 2 + (Math.random() - 0.5) * 200,
      targetX: this.width / 2,
      targetY: this.height / 2,
      radius: 18,
      speed: 3.5,
      angle: 0,
      score: 0,
      isFrozen: false,
      freezeTime: 0,
      isBot: isBot,
      color: this.getNameColor(name)
    };
  }

  onPlayerLeave(id) {
    if (this.players[id]) {
      delete this.players[id];
    }
  }

  setupObstacles() {
    // Standard obstacles in the snow field (trees/snowbanks)
    this.obstacles = [
      { x: this.width * 0.25, y: this.height * 0.25, r: 35, type: 'rock' },
      { x: this.width * 0.75, y: this.height * 0.25, r: 40, type: 'tree' },
      { x: this.width * 0.5, y: this.height * 0.5, r: 50, type: 'snowbank' },
      { x: this.width * 0.25, y: this.height * 0.75, r: 40, type: 'tree' },
      { x: this.width * 0.75, y: this.height * 0.75, r: 35, type: 'rock' }
    ];
  }

  resize(w, h) {
    this.width = w || 800;
    this.height = h || 500;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.setupObstacles();
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.throwSnowballLocal();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.throwSnowballLocal();
      }
    });
  }

  throwSnowballLocal() {
    if (this.localPlayer.isFrozen) return;
    
    const now = Date.now();
    if (now - this.lastThrowTime < this.throwCooldown) return;
    
    this.lastThrowTime = now;

    // Direct path from player to mouse
    const dx = this.mouse.x - this.localPlayer.x;
    const dy = this.mouse.y - this.localPlayer.y;
    const angle = Math.atan2(dy, dx);

    const speed = 7.5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Spawn ball slightly offset from player
    const bx = this.localPlayer.x + Math.cos(angle) * 22;
    const by = this.localPlayer.y + Math.sin(angle) * 22;

    const ball = {
      x: bx,
      y: by,
      vx: vx,
      vy: vy,
      throwerId: this.playerId,
      radius: 6,
      active: true
    };
    this.snowballs.push(ball);

    // Sync throw
    room.send({
      type: 'throw',
      bx: bx,
      by: by,
      vx: vx,
      vy: vy
    });
  }

  start() {
    this.running = true;
    this.loop();
    
    // Periodically sync player position
    this.syncInterval = setInterval(() => {
      if (this.running) {
        room.send({
          type: 'state',
          x: this.localPlayer.x,
          y: this.localPlayer.y,
          angle: this.localPlayer.angle,
          isFrozen: this.localPlayer.isFrozen
        });
      }
    }, 45);
  }

  destroy() {
    this.running = false;
    clearInterval(this.syncInterval);
  }

  onAction(senderId, action) {
    const player = this.players[senderId];
    if (!player) return;

    if (action.type === 'state') {
      // Interpolation targets
      player.targetX = action.x;
      player.targetY = action.y;
      player.angle = action.angle;
      player.isFrozen = action.isFrozen;
    } else if (action.type === 'throw') {
      this.snowballs.push({
        x: action.bx,
        y: action.by,
        vx: action.vx,
        vy: action.vy,
        throwerId: senderId,
        radius: 6,
        active: true
      });
    } else if (action.type === 'hit') {
      const thrower = this.players[action.throwerId];
      if (thrower) {
        thrower.score += 1;
      }
      player.isFrozen = true;
      player.freezeTime = Date.now();
      this.triggerBlast(player.x, player.y, player.color);
    }
  }

  triggerBlast(x, y, color) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 3 + Math.random() * 4,
        color: color || '#FFF',
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  // Observers: Checks if the bot needs driving
  tickBotAI() {
    const playersArr = room.getPlayers();
    if (playersArr.length === 0) return;
    
    // Only host drives bot movement
    const isHost = playersArr[0].id === this.playerId;
    if (!isHost) return;

    const bot = this.players['bot_frosty'];
    if (!bot || bot.isFrozen) return;

    // Simulating simple movement: follow local player
    const dx = this.localPlayer.x - bot.x;
    const dy = this.localPlayer.y - bot.y;
    const dist = Math.hypot(dx, dy);

    bot.angle = Math.atan2(dy, dx);

    // Keep distance, run around
    if (dist > 180) {
      bot.x += Math.cos(bot.angle) * 1.5;
      bot.y += Math.sin(bot.angle) * 1.5;
    } else if (dist < 100) {
      // Back away
      bot.x -= Math.cos(bot.angle) * 1.0;
      bot.y -= Math.sin(bot.angle) * 1.0;
    }

    // Dodging movement wobble
    bot.x += Math.sin(Date.now() * 0.003) * 0.8;
    bot.y += Math.cos(Date.now() * 0.003) * 0.8;

    // Keep bot inside boundaries
    bot.x = Math.max(25, Math.min(this.width - 25, bot.x));
    bot.y = Math.max(25, Math.min(this.height - 25, bot.y));

    // Obstacle collision check for bot
    this.obstacles.forEach(obs => {
      const obsDx = bot.x - obs.x;
      const obsDy = bot.y - obs.y;
      const obsDist = Math.hypot(obsDx, obsDy);
      if (obsDist < obs.r + bot.radius) {
        // push out
        const pushAngle = Math.atan2(obsDy, obsDx);
        bot.x = obs.x + Math.cos(pushAngle) * (obs.r + bot.radius);
        bot.y = obs.y + Math.sin(pushAngle) * (obs.r + bot.radius);
      }
    });

    // Broadcast bot position
    room.simulateBotAction({
      type: 'state',
      x: bot.x,
      y: bot.y,
      angle: bot.angle,
      isFrozen: bot.isFrozen
    });

    // Shoot snowballs
    const now = Date.now();
    if (now - this.lastBotThrow > this.botThrowCooldown && dist < 350) {
      this.lastBotThrow = now;
      
      const speed = 6.0;
      const vx = Math.cos(bot.angle) * speed;
      const vy = Math.sin(bot.angle) * speed;
      const bx = bot.x + Math.cos(bot.angle) * 22;
      const by = bot.y + Math.sin(bot.angle) * 22;

      // Broadcast throw
      room.simulateBotAction({
        type: 'throw',
        bx: bx,
        by: by,
        vx: vx,
        vy: vy
      });
    }
  }

  update() {
    const now = Date.now();

    // 1. Process local movement
    if (!this.localPlayer.isFrozen) {
      let dx = 0;
      let dy = 0;

      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;

      // Normalize speed vectors
      if (dx !== 0 || dy !== 0) {
        const angle = Math.atan2(dy, dx);
        this.localPlayer.x += Math.cos(angle) * this.localPlayer.speed;
        this.localPlayer.y += Math.sin(angle) * this.localPlayer.speed;
      }

      // Bound checks
      this.localPlayer.x = Math.max(this.localPlayer.radius, Math.min(this.width - this.localPlayer.radius, this.localPlayer.x));
      this.localPlayer.y = Math.max(this.localPlayer.radius, Math.min(this.height - this.localPlayer.radius, this.localPlayer.y));

      // Rotate player to follow mouse
      const aimDx = this.mouse.x - this.localPlayer.x;
      const aimDy = this.mouse.y - this.localPlayer.y;
      this.localPlayer.angle = Math.atan2(aimDy, aimDx);

      // Obstacles collision check
      this.obstacles.forEach(obs => {
        const obsDx = this.localPlayer.x - obs.x;
        const obsDy = this.localPlayer.y - obs.y;
        const obsDist = Math.hypot(obsDx, obsDy);
        if (obsDist < obs.r + this.localPlayer.radius) {
          const pushAngle = Math.atan2(obsDy, obsDx);
          this.localPlayer.x = obs.x + Math.cos(pushAngle) * (obs.r + this.localPlayer.radius);
          this.localPlayer.y = obs.y + Math.sin(pushAngle) * (obs.r + this.localPlayer.radius);
        }
      });
    } else {
      // Unfreeze local player after 2 seconds
      if (now - this.localPlayer.freezeTime > 2000) {
        this.localPlayer.isFrozen = false;
      }
    }

    // 2. Drive bot updates
    this.tickBotAI();

    // 3. Interpolation for remote players
    Object.values(this.players).forEach(p => {
      if (p.id !== this.playerId && !p.isBot) {
        p.x += (p.targetX - p.x) * 0.15;
        p.y += (p.targetY - p.y) * 0.15;
      }
      
      // Update remote player freeze timers
      if (p.isFrozen && p.id !== this.playerId) {
        if (!p.freezeTime) p.freezeTime = now;
        if (now - p.freezeTime > 2000) {
          p.isFrozen = false;
          p.freezeTime = null;
        }
      }
    });

    // 4. Update Snowballs
    for (let b of this.snowballs) {
      b.x += b.vx;
      b.y += b.vy;

      // Snow trails particles
      if (Math.random() < 0.3) {
        this.particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 2 + Math.random() * 2,
          color: '#FFF',
          alpha: 0.6,
          decay: 0.04
        });
      }

      // Check wall bounds
      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        b.active = false;
        continue;
      }

      // Check obstacle hits
      this.obstacles.forEach(obs => {
        const obsDx = b.x - obs.x;
        const obsDy = b.y - obs.y;
        const obsDist = Math.hypot(obsDx, obsDy);
        if (obsDist < obs.r) {
          b.active = false;
          this.triggerBlast(b.x, b.y, '#EBF3FA');
        }
      });

      // Hit detection (authoritative check per player)
      // Check if this snowball hit the LOCAL player
      if (b.active && b.throwerId !== this.playerId && !this.localPlayer.isFrozen) {
        const dx = b.x - this.localPlayer.x;
        const dy = b.y - this.localPlayer.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < this.localPlayer.radius + b.radius) {
          b.active = false;
          this.localPlayer.isFrozen = true;
          this.localPlayer.freezeTime = now;
          this.triggerBlast(this.localPlayer.x, this.localPlayer.y, this.localPlayer.color);

          // Update local scoreboard
          const thrower = this.players[b.throwerId];
          if (thrower) thrower.score += 1;

          // Tell the room that WE were hit
          room.send({
            type: 'hit',
            throwerId: b.throwerId
          });
        }
      }

      // If we are host, check hits on the bot
      const playersArr = room.getPlayers();
      const isHost = playersArr.length > 0 && playersArr[0].id === this.playerId;
      const bot = this.players['bot_frosty'];
      
      if (b.active && isHost && bot && !bot.isFrozen && b.throwerId !== 'bot_frosty') {
        const dx = b.x - bot.x;
        const dy = b.y - bot.y;
        const dist = Math.hypot(dx, dy);

        if (dist < bot.radius + b.radius) {
          b.active = false;
          bot.isFrozen = true;
          bot.freezeTime = now;
          this.triggerBlast(bot.x, bot.y, bot.color);

          // Score update
          const thrower = this.players[b.throwerId];
          if (thrower) thrower.score += 1;

          // Broadcast bot hit
          room.simulateBotAction({
            type: 'hit',
            throwerId: b.throwerId
          });
        }
      }
    }

    // Clear inactive snowballs
    this.snowballs = this.snowballs.filter(b => b.active);

    // 5. Update Particles
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
    }
    this.particles = this.particles.filter(p => p.alpha > 0);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Grid Background
    this.ctx.strokeStyle = '#D1E2F0';
    this.ctx.lineWidth = 1;
    const gridSz = 40;
    for (let x = 0; x < this.width; x += gridSz) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSz) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Draw Obstacles
    this.obstacles.forEach(obs => {
      this.ctx.beginPath();
      this.ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
      
      if (obs.type === 'tree') {
        this.ctx.fillStyle = '#A3C6E5';
        this.ctx.fill();
        this.ctx.strokeStyle = '#82AECF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        // Inner pine design
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x, obs.y - obs.r * 0.6);
        this.ctx.lineTo(obs.x - obs.r * 0.5, obs.y + obs.r * 0.4);
        this.ctx.lineTo(obs.x + obs.r * 0.5, obs.y + obs.r * 0.4);
        this.ctx.closePath();
        this.ctx.fillStyle = '#6596BF';
        this.ctx.fill();
      } else if (obs.type === 'snowbank') {
        this.ctx.fillStyle = '#FFF';
        this.ctx.fill();
        this.ctx.strokeStyle = '#B9D5EC';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      } else {
        // rock
        this.ctx.fillStyle = '#BACDD8';
        this.ctx.fill();
        this.ctx.strokeStyle = '#9EB1BC';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }
    });

    // Draw Particles
    for (let p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw Snowballs
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#A8CFED';
    this.ctx.lineWidth = 1;
    for (let b of this.snowballs) {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Draw Players
    Object.values(this.players).forEach(p => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);

      // Flash frozen state (iced crystal look)
      if (p.isFrozen) {
        this.ctx.fillStyle = 'rgba(126, 214, 255, 0.85)';
        this.ctx.strokeStyle = '#FFF';
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.strokeStyle = '#FFF';
      }

      this.ctx.lineWidth = 3;
      
      // Draw character body circle
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Aiming nozzle/hand pointer
      this.ctx.beginPath();
      this.ctx.arc(p.radius * 0.85, 0, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FFF';
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();

      // Player status name overhead
      this.ctx.fillStyle = varColorText();
      this.ctx.font = 'bold 12px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      
      const frozenLabel = p.isFrozen ? ' [FROZEN]' : '';
      this.ctx.fillText(`${p.name} (${p.score})${frozenLabel}`, p.x, p.y - p.radius - 8);
    });

    function varColorText() {
      return '#1C2B3A';
    }
  }

  loop() {
    if (!this.running) return;

    this.update();
    this.draw();

    requestAnimationFrame(() => this.loop());
  }
}
