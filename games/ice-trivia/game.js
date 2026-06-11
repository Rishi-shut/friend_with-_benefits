/* ❄️ Ice Trivia Game Module */

import { room } from '/assets/js/room.js';

const TRIVIA_QUESTIONS = [
  {
    q: "What is the scientific study of glaciers, snow, and ice called?",
    choices: ["Climatology", "Glaciology", "Meteorology", "Cryonics"],
    correct: 1
  },
  {
    q: "Which nation has won the most gold medals in Winter Olympics history?",
    choices: ["Norway", "United States", "Canada", "Germany"],
    correct: 0
  },
  {
    q: "At a microscopic level, all snowflake crystals have how many sides?",
    choices: ["4 sides", "8 sides", "6 sides", "5 sides"],
    correct: 2
  },
  {
    q: "In which region of the world is the Lambert Glacier (the world's largest) located?",
    choices: ["Greenland", "Siberia", "Antarctica", "Alaska"],
    correct: 2
  },
  {
    q: "Which winter sport involves sliding heavy granite stones on ice towards a circular target?",
    choices: ["Luge", "Curling", "Skeleton", "Bobsleigh"],
    correct: 1
  }
];

export default class IceTrivia {
  constructor(container, roomId, playerId) {
    this.container = container;
    this.roomId = roomId;
    this.playerId = playerId;

    // Local state
    this.players = {}; // id -> { name, score, choice, color }
    this.currentQuestionIdx = 0;
    this.gameState = 'INTRO'; // INTRO, QUESTION, RESULTS, FINISH
    this.timeLeft = 12;
    this.timerInterval = null;
    this.selectedChoice = null;

    // Bot timers
    this.botAnswerTimeout = null;

    // Load players
    this.players[this.playerId] = {
      name: room.playerName,
      score: 0,
      choice: null,
      color: this.getNameColor(room.playerName)
    };
    
    room.getPlayers().forEach(p => {
      if (p.id !== this.playerId) {
        this.addRemotePlayer(p.id, p.name, p.isBot);
      }
    });

    this.renderIntro();
  }

  getNameColor(name) {
    const hash = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
    return `hsl(${hash}, 70%, 60%)`;
  }

  addRemotePlayer(id, name, isBot = false) {
    if (this.players[id]) return;
    this.players[id] = {
      name: name,
      score: 0,
      choice: null,
      isBot: isBot,
      color: this.getNameColor(name)
    };
  }

  onPlayerLeave(id) {
    if (this.players[id]) {
      delete this.players[id];
    }
    this.updateLiveSelections();
  }

  isHost() {
    const playersArr = room.getPlayers();
    return playersArr.length > 0 && playersArr[0].id === this.playerId;
  }

  start() {
    // If Host, start syncing rounds
    if (this.isHost()) {
      setTimeout(() => {
        this.startQuestion(0);
      }, 3000);
    }
  }

  destroy() {
    clearInterval(this.timerInterval);
    clearTimeout(this.botAnswerTimeout);
  }

  // Action messages from the network room bus
  onAction(senderId, action) {
    switch (action.type) {
      case 'sync-question':
        this.gameState = 'QUESTION';
        this.currentQuestionIdx = action.idx;
        this.timeLeft = action.time;
        this.selectedChoice = null;
        this.resetChoices();
        this.renderQuestion();
        this.startLocalTimer();
        break;

      case 'sync-results':
        this.gameState = 'RESULTS';
        clearInterval(this.timerInterval);
        
        // Apply final answers from message
        Object.keys(action.answers).forEach(pId => {
          if (this.players[pId]) {
            this.players[pId].choice = action.answers[pId];
          }
        });

        // Apply updated scores
        Object.keys(action.scores).forEach(pId => {
          if (this.players[pId]) {
            this.players[pId].score = action.scores[pId];
          }
        });

        this.renderResults(action.correct);
        break;

      case 'sync-finish':
        this.gameState = 'FINISH';
        this.renderFinish();
        break;

      case 'select-answer':
        if (this.players[senderId]) {
          this.players[senderId].choice = action.choiceIdx;
          this.updateLiveSelections();
        }
        break;
    }
  }

  // --- QUESTION ROUND SYNC FLOW (Driven by Host) ---

  startQuestion(idx) {
    this.currentQuestionIdx = idx;
    
    // Reset selections
    Object.values(this.players).forEach(p => p.choice = null);

    // Host notifies others to start question
    room.send({
      type: 'sync-question',
      idx: idx,
      time: 12
    });

    // Handle local action
    this.onAction(this.playerId, {
      type: 'sync-question',
      idx: idx,
      time: 12
    });

    // Bot choosing trigger (host schedules bot answers)
    const bot = this.players['bot_frosty'];
    if (bot) {
      clearTimeout(this.botAnswerTimeout);
      this.botAnswerTimeout = setTimeout(() => {
        const botChoice = Math.floor(Math.random() * 4);
        room.simulateBotAction({
          type: 'select-answer',
          choiceIdx: botChoice
        });
      }, 2000 + Math.random() * 2500);
    }
  }

  showResults() {
    clearInterval(this.timerInterval);
    const correctIdx = TRIVIA_QUESTIONS[this.currentQuestionIdx].correct;

    // Calculate updated scores for this round (host authority)
    Object.keys(this.players).forEach(pId => {
      const p = this.players[pId];
      if (p.choice === correctIdx) {
        p.score += 20; // 20 points per correct answer
      }
    });

    // Assemble payload
    const finalAnswers = {};
    const finalScores = {};
    Object.keys(this.players).forEach(pId => {
      finalAnswers[pId] = this.players[pId].choice;
      finalScores[pId] = this.players[pId].score;
    });

    room.send({
      type: 'sync-results',
      correct: correctIdx,
      answers: finalAnswers,
      scores: finalScores
    });

    // Handle local action
    this.onAction(this.playerId, {
      type: 'sync-results',
      correct: correctIdx,
      answers: finalAnswers,
      scores: finalScores
    });

    // Schedule next step
    setTimeout(() => {
      if (this.isHost()) {
        const nextIdx = this.currentQuestionIdx + 1;
        if (nextIdx < TRIVIA_QUESTIONS.length) {
          this.startQuestion(nextIdx);
        } else {
          this.finishGame();
        }
      }
    }, 5000);
  }

  finishGame() {
    room.send({
      type: 'sync-finish'
    });
    this.onAction(this.playerId, {
      type: 'sync-finish'
    });
  }

  startLocalTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      
      const timerEl = document.getElementById('trivia-timer');
      if (timerEl) {
        timerEl.textContent = this.timeLeft;
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        if (this.isHost()) {
          this.showResults();
        }
      }
    }, 1000);
  }

  resetChoices() {
    Object.values(this.players).forEach(p => p.choice = null);
  }

  // --- RENDERING ROUTINES ---

  renderIntro() {
    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h2 style="font-size: 2.25rem; margin-bottom: 16px;">Get Ready for Trivia! 🧠</h2>
        <p style="color: var(--mist-text); margin-bottom: 32px; font-size: 1.1rem;">
          5 icy questions. 20 points per correct answer. Fastest mind wins.
        </p>
        <div style="font-size: 4rem; animation: crystal-pulse 2s ease-in-out infinite;">❄️</div>
        <p style="margin-top: 32px; font-size: 0.95rem; color: var(--mist-text);">
          ${this.isHost() ? 'Lobby starts automatically in 3 seconds...' : 'Waiting for host to start...'}
        </p>
      </div>
    `;
  }

  renderQuestion() {
    const qData = TRIVIA_QUESTIONS[this.currentQuestionIdx];
    this.container.innerHTML = `
      <!-- Timer & Progress Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <span class="pill" style="background: var(--aurora-violet); color: #fff;">
          Question ${this.currentQuestionIdx + 1} of ${TRIVIA_QUESTIONS.length}
        </span>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--deep-ice);">
          ⏱️ <span id="trivia-timer">${this.timeLeft}</span>s
        </div>
      </div>

      <!-- Question Text -->
      <h3 style="font-size: 1.65rem; margin-bottom: 32px; line-height: 1.3; font-weight: 700;">
        ${qData.q}
      </h3>

      <!-- Choices Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; margin-bottom: 32px;" id="choices-grid">
        ${qData.choices.map((choice, idx) => `
          <button class="btn btn--ghost trivia-choice-btn" data-idx="${idx}" style="padding: 24px; font-size: 1.05rem; justify-content: flex-start; text-align: left; position: relative; border-radius: var(--radius-md); height: 80px; width: 100%;">
            <span style="font-weight: 700; color: var(--arctic-blue); margin-right: 12px;">${String.fromCharCode(65 + idx)}.</span>
            ${choice}
            
            <!-- Voter list stack overlay inside button -->
            <div class="voters-stack" id="voters-choice-${idx}" style="position: absolute; right: 16px; bottom: 8px; display: flex; gap: 4px;">
            </div>
          </button>
        `).join('')}
      </div>
    `;

    // Bind choice buttons
    const choiceButtons = this.container.querySelectorAll('.trivia-choice-btn');
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.selectedChoice !== null || this.gameState !== 'QUESTION') return;
        
        const idx = parseInt(btn.dataset.idx);
        this.selectedChoice = idx;
        this.players[this.playerId].choice = idx;

        // Apply visual active feedback
        btn.style.borderColor = 'var(--arctic-blue)';
        btn.style.background = 'var(--ice-surface)';
        btn.style.boxShadow = '0 0 0 3px rgba(74, 158, 219, 0.2)';

        // Disable all other buttons hover state locally
        choiceButtons.forEach(b => {
          if (parseInt(b.dataset.idx) !== idx) b.style.opacity = '0.7';
        });

        // Broadcast selection
        room.send({
          type: 'select-answer',
          choiceIdx: idx
        });

        this.updateLiveSelections();
      });
    });

    this.updateLiveSelections();
  }

  updateLiveSelections() {
    if (this.gameState !== 'QUESTION') return;

    // Clear all stacks
    for (let i = 0; i < 4; i++) {
      const container = document.getElementById(`voters-choice-${i}`);
      if (container) container.innerHTML = '';
    }

    // Populate voter stacks
    Object.keys(this.players).forEach(pId => {
      const p = this.players[pId];
      if (p.choice !== null && p.choice !== undefined) {
        const stack = document.getElementById(`voters-choice-${p.choice}`);
        if (stack) {
          const dot = document.createElement('div');
          dot.style.width = '24px';
          dot.style.height = '24px';
          dot.style.borderRadius = '50%';
          dot.style.background = p.color;
          dot.style.border = '2px solid #fff';
          dot.style.display = 'flex';
          dot.style.alignItems = 'center';
          dot.style.justifyContent = 'center';
          dot.style.fontSize = '10px';
          dot.style.fontWeight = 'bold';
          dot.style.color = '#fff';
          dot.title = p.name;
          dot.textContent = p.name.charAt(0).toUpperCase();
          stack.appendChild(dot);
        }
      }
    });
  }

  renderResults(correctIdx) {
    const qData = TRIVIA_QUESTIONS[this.currentQuestionIdx];
    
    this.container.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <span class="pill" style="background: var(--crystal-teal); color: #fff;">
          Round Results
        </span>
      </div>

      <h3 style="font-size: 1.45rem; text-align: center; margin-bottom: 32px; line-height: 1.3;">
        ${qData.q}
      </h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; margin-bottom: 32px;">
        ${qData.choices.map((choice, idx) => {
          let extraStyle = '';
          let icon = '';
          
          if (idx === correctIdx) {
            extraStyle = 'background: rgba(56, 201, 192, 0.15); border-color: var(--crystal-teal); color: var(--frost-text); box-shadow: 0 4px 16px rgba(56,201,192,0.15);';
            icon = '✅';
          } else if (idx === this.selectedChoice) {
            extraStyle = 'background: rgba(235, 94, 85, 0.15); border-color: #EB5E55; color: var(--frost-text);';
            icon = '❌';
          } else {
            extraStyle = 'opacity: 0.6;';
          }

          return `
            <div class="card-frost" style="padding: 20px; display: flex; align-items: center; border-radius: var(--radius-md); font-size: 1.05rem; height: 80px; text-align: left; ${extraStyle}">
              <span style="font-weight: bold; margin-right: 12px;">${icon || String.fromCharCode(65 + idx)}.</span>
              ${choice}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Current Round Scoreboard -->
      <div class="card-frost" style="padding: 20px; background: rgba(255,255,255,0.4); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: 12px; font-size: 1.1rem; text-align: center;">Leaderboard</h4>
        <div style="display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;">
          ${Object.values(this.players).sort((a, b) => b.score - a.score).map(p => `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${p.color};"></span>
              <span style="font-weight: 600; font-size: 14px;">${p.name}:</span>
              <span style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--deep-ice);">${p.score} pts</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderFinish() {
    const winnersList = Object.values(this.players).sort((a, b) => b.score - a.score);
    const goldWinner = winnersList[0];

    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 4rem; margin-bottom: 16px; animation: crystal-pulse 2.5s ease-in-out infinite;">👑</div>
        <h2 style="font-size: 2.25rem; margin-bottom: 8px;">Game Completed!</h2>
        <p style="color: var(--mist-text); margin-bottom: 36px; font-size: 1.1rem;">
          Congratulations to <strong style="color: var(--aurora-violet); font-size: 1.2rem;">${goldWinner.name}</strong> for freezing the leaderboard!
        </p>

        <!-- Final Standings -->
        <div class="card-frost" style="max-width: 420px; margin: 0 auto 36px auto; padding: 24px; background: rgba(255,255,255,0.5);">
          <h3 style="font-size: 1.25rem; margin-bottom: 16px; text-align: left; border-bottom: 1.5px dashed var(--glacier-blue); padding-bottom: 10px;">
            Final Standings
          </h3>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${winnersList.map((p, idx) => {
              let medal = '';
              if (idx === 0) medal = '🥇';
              else if (idx === 1) medal = '🥈';
              else if (idx === 2) medal = '🥉';
              else medal = '❄️';

              return `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.35rem;">${medal}</span>
                    <span style="font-weight: 600; font-size: 15px;">${p.name}</span>
                  </div>
                  <span style="font-family: var(--font-mono); font-weight: 700; color: var(--crystal-teal); font-size: 15px;">
                    ${p.score} pts
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <button class="btn btn--primary" onclick="window.location.reload();" style="font-size: 15px; padding: 12px 28px;">
          Play Again &rarr;
        </button>
      </div>
    `;
  }
}
