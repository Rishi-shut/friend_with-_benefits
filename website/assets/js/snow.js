/* ❄️ FrostZone Snowfall Particle System with Live Tuning */

const SNOW_CONFIG = {
  layers: 3,           // foreground / mid / background
  speedRange: [0.3, 1.2],
  sizeRange: [2, 6],   // px
  opacityRange: [0.3, 0.9],
  drift: 0.4,          // horizontal wobble
  parallaxStrength: 0.015,
};

class Snowfall {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    // Live variables updated by Sliders
    this.speedScale = 1.0;
    this.windScale = 0.0; // -2.0 (left) to +2.0 (right)

    this.resize();
    this.init(80); // Default 80 particles

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    
    this.animate();

    // Register instance globally so app.js can access it
    window.snowfallInstance = this;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  handleMouseMove(e) {
    this.targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    this.targetMouseY = (e.clientY / window.innerHeight) - 0.5;
  }

  init(count) {
    this.particles = [];
    this.setParticleCount(count);
  }

  setParticleCount(targetCount) {
    const currentCount = this.particles.length;
    const diff = targetCount - currentCount;

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        const layer = Math.floor(Math.random() * SNOW_CONFIG.layers);
        const speedMult = (layer + 1) / SNOW_CONFIG.layers;
        const baseSpeed = this.randomRange(SNOW_CONFIG.speedRange[0], SNOW_CONFIG.speedRange[1]);
        
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size: this.randomRange(SNOW_CONFIG.sizeRange[0], SNOW_CONFIG.sizeRange[1]) * speedMult,
          speedY: baseSpeed * speedMult,
          speedX: (Math.random() - 0.5) * SNOW_CONFIG.drift,
          opacity: this.randomRange(SNOW_CONFIG.opacityRange[0], SNOW_CONFIG.opacityRange[1]) * speedMult,
          layer: layer,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.01 + Math.random() * 0.02
        });
      }
    } else if (diff < 0) {
      this.particles.splice(0, Math.abs(diff));
    }
  }

  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  animate() {
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      const depthFactor = (p.layer + 1) * 15;
      const offsetX = this.mouseX * depthFactor;
      const offsetY = this.mouseY * depthFactor;

      p.wobble += p.wobbleSpeed;
      // Combine base random speed, wobble, and custom wind force
      const currentDrift = p.speedX + Math.sin(p.wobble) * 0.2 + this.windScale * (p.layer + 1) * 0.4;

      this.ctx.beginPath();
      this.ctx.arc(p.x + offsetX, p.y + offsetY, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      this.ctx.fill();

      // Apply speeds (with custom speedScale modifier)
      p.y += p.speedY * this.speedScale;
      p.x += currentDrift;

      if (p.y > this.canvas.height + 10) {
        p.y = -10;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x > this.canvas.width + 10) {
        p.x = -10;
      } else if (p.x < -10) {
        p.x = this.canvas.width + 10;
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Snowfall('snow-canvas');
});
