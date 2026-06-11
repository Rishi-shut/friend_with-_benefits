/* ❄️ FrostZone Room Network Bus & Bot Controller */

class RoomManager {
  constructor() {
    this.events = {};
    this.players = [];
    this.roomId = null;
    this.playerId = null;
    this.playerName = null;
    this.channel = null;
    this.botTimeout = null;
    this.isBotPresent = false;
    this.botId = 'bot_frosty';
    this.botName = 'FrostyBot ⛄';

    this.init();
  }

  init() {
    // 1. Get/Create room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room');
    
    if (!this.roomId && window.location.pathname.includes('/games/')) {
      // If we are on a game page and have no room ID, generate one
      this.roomId = this.generateRoomCode();
      urlParams.set('room', this.roomId);
      window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    }

    if (!this.roomId) return; // Not in a room context (e.g. landing page)

    // 2. Initialise local player ID
    this.playerId = sessionStorage.getItem('fz_player_id');
    if (!this.playerId) {
      this.playerId = 'p_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('fz_player_id', this.playerId);
    }

    // 3. Initialise player name
    this.playerName = localStorage.getItem('fz_player_name');
    if (!this.playerName) {
      const defaultNames = ['SnowLeopard', 'IceWalker', 'BlizzardForce', 'GlowCrystal', 'PolarBear', 'FrostBite', 'AuroraSeeker'];
      this.playerName = defaultNames[Math.floor(Math.random() * defaultNames.length)] + '_' + Math.floor(Math.random() * 90 + 10);
      localStorage.setItem('fz_player_name', this.playerName);
    }

    // 4. Add self to players list
    this.players.push({
      id: this.playerId,
      name: this.playerName,
      isSelf: true,
      isBot: false
    });

    // 5. Connect BroadcastChannel
    this.channel = new BroadcastChannel('frostzone_room_' + this.roomId);
    this.channel.onmessage = (e) => this.handleMessage(e.data);

    // 6. Announce presence
    this.broadcast({
      type: 'ping',
      senderId: this.playerId,
      senderName: this.playerName
    });

    // 7. Setup beforeunload to leave room cleanly
    window.addEventListener('beforeunload', () => {
      this.broadcast({
        type: 'leave',
        senderId: this.playerId
      });
    });

    // 8. Schedule Bot check
    this.scheduleBotJoin();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getPlayers() {
    return this.players;
  }

  updatePlayerName(newName) {
    if (!newName || newName.trim() === '') return;
    this.playerName = newName.trim();
    localStorage.setItem('fz_player_name', this.playerName);
    
    // Update local list
    const self = this.players.find(p => p.id === this.playerId);
    if (self) self.name = this.playerName;

    // Broadcast rename
    this.broadcast({
      type: 'rename',
      senderId: this.playerId,
      newName: this.playerName
    });

    this.emit('players-update', this.players);
  }

  // Event bus callbacks
  on(event, cb) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
  }

  off(event, cb) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(h => h !== cb);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }

  // Core Room Communication
  send(actionData) {
    // Send an action to other players
    this.broadcast({
      type: 'action',
      senderId: this.playerId,
      data: actionData
    });
  }

  sendChat(text) {
    if (!text || text.trim() === '') return;
    this.broadcast({
      type: 'chat',
      senderId: this.playerId,
      senderName: this.playerName,
      text: text
    });
    // Emit locally
    this.emit('chat', {
      senderId: this.playerId,
      senderName: this.playerName,
      text: text,
      isSelf: true
    });

    // Bot reply trigger if alone
    if (this.isBotPresent) {
      this.triggerBotChatReply(text);
    }
  }

  sendReaction(emoji) {
    this.broadcast({
      type: 'reaction',
      senderId: this.playerId,
      emoji: emoji
    });
    // Emit locally
    this.emit('reaction', {
      senderId: this.playerId,
      emoji: emoji
    });

    // Bot mirroring
    if (this.isBotPresent && Math.random() < 0.6) {
      setTimeout(() => {
        this.emit('reaction', {
          senderId: this.botId,
          emoji: emoji
        });
        this.broadcast({
          type: 'reaction',
          senderId: this.botId,
          emoji: emoji
        });
      }, 500 + Math.random() * 800);
    }
  }

  broadcast(msg) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.error('Error posting message to channel:', err);
      }
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'ping':
        // Someone joined. Respond with join acknowledgement to inform them who we are.
        this.addPlayer(msg.senderId, msg.senderName);
        this.broadcast({
          type: 'join-ack',
          senderId: this.playerId,
          senderName: this.playerName
        });
        // Clear bot join timer since a real player is present
        this.clearBotTimer();
        this.removeBot();
        break;

      case 'join-ack':
        this.addPlayer(msg.senderId, msg.senderName);
        this.clearBotTimer();
        this.removeBot();
        break;

      case 'leave':
        this.removePlayer(msg.senderId);
        break;

      case 'rename':
        const player = this.players.find(p => p.id === msg.senderId);
        if (player) {
          player.name = msg.newName;
          this.emit('players-update', this.players);
          this.emit('system-chat', `${msg.senderName} renamed to ${msg.newName}`);
        }
        break;

      case 'action':
        this.emit('action', {
          playerId: msg.senderId,
          data: msg.data
        });
        break;

      case 'chat':
        this.emit('chat', {
          senderId: msg.senderId,
          senderName: msg.senderName,
          text: msg.text,
          isSelf: false
        });
        break;

      case 'reaction':
        this.emit('reaction', {
          senderId: msg.senderId,
          emoji: msg.emoji
        });
        break;
    }
  }

  addPlayer(id, name) {
    if (!this.players.some(p => p.id === id)) {
      this.players.push({
        id: id,
        name: name,
        isSelf: false,
        isBot: false
      });
      this.emit('players-update', this.players);
      this.emit('join', { playerId: id, name: name });
      this.emit('system-chat', `${name} joined the room.`);
    }
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      const name = this.players[idx].name;
      this.players.splice(idx, 1);
      this.emit('players-update', this.players);
      this.emit('leave', { playerId: id });
      this.emit('system-chat', `${name} left the room.`);
      
      // If we are left alone again, reschedule the bot
      if (this.players.filter(p => !p.isBot).length === 1) {
        this.scheduleBotJoin();
      }
    }
  }

  // --- BOT SIMULATION LOGIC ---

  scheduleBotJoin() {
    this.clearBotTimer();
    this.botTimeout = setTimeout(() => {
      // If still solo (only 1 player, which is self)
      const realPlayersCount = this.players.filter(p => !p.isBot).length;
      if (realPlayersCount === 1 && !this.isBotPresent) {
        this.addBot();
      }
    }, 2500);
  }

  clearBotTimer() {
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }
  }

  addBot() {
    this.isBotPresent = true;
    const bot = {
      id: this.botId,
      name: this.botName,
      isSelf: false,
      isBot: true
    };
    this.players.push(bot);
    this.emit('players-update', this.players);
    this.emit('join', { playerId: this.botId, name: this.botName, isBot: true });
    this.emit('system-chat', `${this.botName} joined the room.`);

    // Bot greeting
    setTimeout(() => {
      const greetings = [
        "Hey! Ready for a quick game? ❄️",
        "Brrr, let's play! ☃️",
        "Hello! I am ready to freeze the leaderboard!",
        "Nice room! Let's get started. 🕹️"
      ];
      const text = greetings[Math.floor(Math.random() * greetings.length)];
      this.emit('chat', {
        senderId: this.botId,
        senderName: this.botName,
        text: text,
        isSelf: false
      });
    }, 1200);
  }

  removeBot() {
    if (!this.isBotPresent) return;
    this.isBotPresent = false;
    const idx = this.players.findIndex(p => p.id === this.botId);
    if (idx !== -1) {
      this.players.splice(idx, 1);
      this.emit('players-update', this.players);
      this.emit('leave', { playerId: this.botId });
      this.emit('system-chat', `${this.botName} left to make room for a real player.`);
    }
  }

  triggerBotChatReply(userMessage) {
    const replies = [
      "Good one! 😂",
      "Ice to meet you!",
      "Haha let's go!! ❄️",
      "I'm feeling lucky this round!",
      "Are you trying to freeze me out?",
      "Cool story bro! 🏔️",
      "Let's focus, the leaderboard is waiting!"
    ];

    setTimeout(() => {
      const text = replies[Math.floor(Math.random() * replies.length)];
      this.emit('chat', {
        senderId: this.botId,
        senderName: this.botName,
        text: text,
        isSelf: false
      });
    }, 1500 + Math.random() * 1000);
  }

  // Trigger simulated bot game actions (controlled inside individual game engines)
  simulateBotAction(actionData) {
    if (!this.isBotPresent) return;
    // Emit locally so game engine picks it up
    this.emit('action', {
      playerId: this.botId,
      data: actionData
    });
  }
}

export const room = new RoomManager();
export default room;
