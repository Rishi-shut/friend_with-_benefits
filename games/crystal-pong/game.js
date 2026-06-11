/* ❄️ Crystal Pong Game Module */

import { room } from '/assets/js/room.js';

export default class CrystalPong {
  constructor(container, roomId, playerId) {
    this.container = container;
    this.roomId = roomId;
    this.playerId = playerId;

    // Create Canvas
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    // Initial size
    this.resize(this.container.clientWidth, this.container.clientHeight);

    // Game variables
    this.running = false;
    this.paddleWidth = 12;
    this.paddleHeight = 85;

    // Paddle positions
    this.leftPaddleY = this.height / 2;
    this.rightPaddleY = this.height / 2;

    // Ball physics
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 4.0,
      vy: 2.0,
      size: 10,
      angle: 0,
      speed: 4.5
    };

    // Scores
    this.scoreLeft = 0;
    this.scoreRight = 0;

    // Names
    this.leftPlayerName = 'Host';
    this.rightPlayerName = 'Waiting...';

    // Particle pool for hits
    this.particles = [];

    this.setupPlayers();
    this.setupInputs();
  }

  isHost() {
    const playersArr = room.getPlayers();
    return playersArr.length > 0 && playersArr[0].id === this.playerId;
  }

  setupPlayers() {
    const playersArr = room.getPlayers();
    
    // Assign Left Player (Host)
    if (playersArr[0]) {
      this.leftPlayerName = playersArr[0].name;
    }
    
    // Assign Right Player (Joiner or Bot)
    const secondPlayer = playersArr.find(p => p.id !== playersArr[0].id);
    if (secondPlayer) {
      this.rightPlayerName = secondPlayer.name;
    } else {
      this.rightPlayerName = 'FrostyBot ⛄';
    }
  }

  addRemotePlayer(id, name, isBot) {
    this.setupPlayers();
  }

  onPlayerLeave(id) {
    this.setupPlayers();
  }

  resize(w, h) {
    this.width = w || 800;
    this.height = h || 500;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.leftPaddleY = this.height / 2;
    this.rightPaddleY = this.height / 2;
  }

  setupInputs() {
    // Mouse movement inside canvas
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      
      if (this.isHost()) {
        this.leftPaddleY = mouseY;
      } else {
        this.rightPaddleY = mouseY;
      }
    });

    // Keyboard backups (W and S keys)
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  start() {
    this.running = true;
    this.loop();

    // Broadcast synchronization frames
    this.syncInterval = setInterval(() => {
      if (!this.running) return;

      if (this.isHost()) {
        // Host synchronizes full table state
        room.send({
          type: 'pong-sync',
          leftY: this.leftPaddleY,
          rightY: this.rightPaddleY,
          ballX: this.ball.x,
          ballY: this.ball.y,
          scoreLeft: this.scoreLeft,
          scoreRight: this.scoreRight
        });
      } else {
        // Non-host only sends their paddle coordinate to host
        room.send({
          type: 'pong-paddle-sync',
          y: this.rightPaddleY
        });
      }
    }, 30);
  }

  destroy() {
    this.running = false;
    clearInterval(this.syncInterval);
  }

  onAction(senderId, action) {
    if (action.type === 'pong-sync') {
      if (!this.isHost()) {
        // Sync all positions from Host
        this.leftPaddleY = action.leftY;
        this.ball.x = action.ballX;
        this.ball.y = action.ballY;
        this.scoreLeft = action.scoreLeft;
        this.scoreRight = action.scoreRight;
        
        // Soft interpolate right paddle (avoid override of local control)
        if (senderId !== this.playerId) {
          this.rightPaddleY += (action.rightY - this.rightPaddleY) * 0.1;
        }
      }
    } else if (action.type === 'pong-paddle-sync') {
      if (this.isHost()) {
        // Host updates right paddle from guest
        this.rightPaddleY = action.y;
      }
    }
  }

  triggerImpactParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        size: 2 + Math.random() * 3,
        color: color || '#A8CFED',
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  }

  resetBall(direction) {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    this.ball.speed = 4.5;
    
    const angle = (Math.random() - 0.5) * (Math.PI / 4); // angle up to 45 deg
    this.ball.vx = Math.cos(angle) * this.ball.speed * direction;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
  }

  update() {
    const halfH = this.paddleHeight / 2;

    // 1. Process local keyboard movements
    if (this.isHost()) {
      if (this.keys['w'] || this.keys['arrowup']) this.leftPaddleY -= 5;
      if (this.keys['s'] || this.keys['arrowdown']) this.leftPaddleY += 5;
      this.leftPaddleY = Math.max(halfH, Math.min(this.height - halfH, this.leftPaddleY));
    } else {
      if (this.keys['w'] || this.keys['arrowup']) this.rightPaddleY -= 5;
      if (this.keys['s'] || this.keys['arrowdown']) this.rightPaddleY += 5;
      this.rightPaddleY = Math.max(halfH, Math.min(this.height - halfH, this.rightPaddleY));
    }

    // 2. Host performs full ball calculations
    if (this.isHost()) {
      // Bot AI calculation (if alone, host controls bot right paddle)
      const players = room.getPlayers();
      const botActive = !players.some(p => p.id !== this.playerId);
      
      if (botActive) {
        // AI tracks ball with simple speed limits
        const diff = this.ball.y - this.rightPaddleY;
        if (Math.abs(diff) > 10) {
          const moveSpeed = diff > 0 ? 3.0 : -3.0;
          this.rightPaddleY += moveSpeed;
        }
        this.rightPaddleY = Math.max(halfH, Math.min(this.height - halfH, this.rightPaddleY));
      }

      // Move Ball
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;
      this.ball.angle += 0.05; // ball spin

      // Wall bounce top/bottom
      if (this.ball.y - this.ball.size < 0) {
        this.ball.y = this.ball.size;
        this.ball.vy = -this.ball.vy;
        this.triggerImpactParticles(this.ball.x, this.ball.y, '#FFF');
      } else if (this.ball.y + this.ball.size > this.height) {
        this.ball.y = this.height - this.ball.size;
        this.ball.vy = -this.ball.vy;
        this.triggerImpactParticles(this.ball.x, this.ball.y, '#FFF');
      }

      // Paddle collision Left
      if (this.ball.vx < 0 && this.ball.x - this.ball.size <= 25 + this.paddleWidth) {
        if (this.ball.y >= this.leftPaddleY - halfH && this.ball.y <= this.leftPaddleY + halfH) {
          this.ball.x = 25 + this.paddleWidth + this.ball.size;
          
          // Angle modification based on where the ball hit the paddle
          const relativeIntersectY = (this.leftPaddleY - this.ball.y) / halfH;
          const bounceAngle = relativeIntersectY * (Math.PI / 3); // max 60 deg bounce

          this.ball.speed = Math.min(this.ball.speed + 0.5, 12); // Speed increase
          this.ball.vx = Math.cos(bounceAngle) * this.ball.speed;
          this.ball.vy = -Math.sin(bounceAngle) * this.ball.speed;

          this.triggerImpactParticles(this.ball.x, this.ball.y, 'var(--crystal-teal)');
        }
      }

      // Paddle collision Right
      if (this.ball.vx > 0 && this.ball.x + this.ball.size >= this.width - 25 - this.paddleWidth) {
        if (this.ball.y >= this.rightPaddleY - halfH && this.ball.y <= this.rightPaddleY + halfH) {
          this.ball.x = this.width - 25 - this.paddleWidth - this.ball.size;

          const relativeIntersectY = (this.rightPaddleY - this.ball.y) / halfH;
          const bounceAngle = relativeIntersectY * (Math.PI / 3);

          this.ball.speed = Math.min(this.ball.speed + 0.5, 12);
          this.ball.vx = -Math.cos(bounceAngle) * this.ball.speed;
          this.ball.vy = -Math.sin(bounceAngle) * this.ball.speed;

          this.triggerImpactParticles(this.ball.x, this.ball.y, 'var(--aurora-violet)');
        }
      }

      // Out of bounds checks
      if (this.ball.x < 0) {
        this.scoreRight++;
        this.resetBall(1); // Serve to left
      } else if (this.ball.x > this.width) {
        this.scoreLeft++;
        this.resetBall(-1); // Serve to right
      }
    }

    // 3. Update Particles
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
    }
    this.particles = this.particles.filter(p => p.alpha > 0);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Arena Center Dashed Line
    this.ctx.strokeStyle = 'rgba(168, 207, 237, 0.15)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([15, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 0);
    this.ctx.lineTo(this.width / 2, this.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Reset

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

    // Draw Scoreboard
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = 'bold 48px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.scoreLeft, this.width * 0.35, 70);
    this.ctx.fillText(this.scoreRight, this.width * 0.65, 70);

    // Player Names overhead
    this.ctx.font = '14px Inter, sans-serif';
    this.ctx.fillStyle = '#A8CFED';
    this.ctx.fillText(this.leftPlayerName, this.width * 0.35, 100);
    this.ctx.fillText(this.rightPlayerName, this.width * 0.65, 100);

    // Draw Left Paddle (Frosted neon crystal style)
    this.ctx.fillStyle = 'rgba(56, 201, 192, 0.8)';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(
      25, 
      this.leftPaddleY - this.paddleHeight / 2, 
      this.paddleWidth, 
      this.paddleHeight, 
      varRadius()
    );
    this.ctx.fill();
    this.ctx.stroke();

    // Draw Right Paddle
    this.ctx.fillStyle = 'rgba(155, 127, 232, 0.8)';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(
      this.width - 25 - this.paddleWidth, 
      this.rightPaddleY - this.paddleHeight / 2, 
      this.paddleWidth, 
      this.paddleHeight, 
      varRadius()
    );
    this.ctx.fill();
    this.ctx.stroke();

    // Draw Rotating Ice Crystal Ball
    this.ctx.save();
    this.ctx.translate(this.ball.x, this.ball.y);
    this.ctx.rotate(this.ball.angle);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = 'rgba(168, 207, 237, 0.9)';
    this.ctx.lineWidth = 2;

    // Draw diamond shape
    const s = this.ball.size;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -s * 1.3); // Top
    this.ctx.lineTo(s, 0);       // Right
    this.ctx.lineTo(0, s * 1.3);  // Bottom
    this.ctx.lineTo(-s, 0);      // Left
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Crystal facets lines
    this.ctx.beginPath();
    this.ctx.moveTo(0, -s * 1.3);
    this.ctx.lineTo(0, s * 1.3);
    this.ctx.moveTo(-s, 0);
    this.ctx.lineTo(s, 0);
    this.ctx.strokeStyle = 'rgba(74, 158, 219, 0.4)';
    this.ctx.stroke();

    this.ctx.restore();

    function varRadius() {
      return 6;
    }
  }

  loop() {
    if (!this.running) return;

    this.update();
    this.draw();

    requestAnimationFrame(() => this.loop());
  }
}
