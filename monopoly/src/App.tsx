import React, { useEffect, useState, useRef } from "react";
import {
  Coins,
  Dice5,
  MessageSquare,
  Plus,
  Skull,
  Clock,
  Play,
  Volume2,
  VolumeX,
  Award,
  Sparkles,
  MapPin,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";
import { useGameStore } from "./game/useGameStore";
import { BOARD_TILES, COLOR_GROUPS, COLOR_GROUP_NAMES } from "./game/board.config";
import { GameCanvas } from "./game/Board";
import { playSound } from "./game/sound";

export default function App() {
  const {
    roomCode,
    phase,
    hostId,
    localPlayerId,
    players,
    playerOrder,
    currentTurnPlayerId,
    turnNumber,
    properties,
    log,
    settings,
    timeLeft,
    timerActive,
    drawnCard,
    activeAction,
    isRolling,
    winnerId,
    powerCutRounds,
    createRoom,
    joinRoom,
    addBotPlayers,
    startGame,
    rollDice,
    buyProperty,
    skipProperty,
    upgradeProperty,
    payRent,
    drawCard,
    closeCardModal,
    resolveJailAction,
    endTurn,
    sendReaction,
    sendChat,
    tickTimer,
    resetGame,
  } = useGameStore();

  // Local UI states
  const [playerName, setPlayerName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [selectedToken, setSelectedToken] = useState("auto");
  const [selectedColor, setSelectedColor] = useState("#3F51B5");
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  // Settings form states
  const [startingCash, setStartingCash] = useState(15000);
  const [duration, setDuration] = useState(30);
  const [ruleChungi, setRuleChungi] = useState(true);
  const [rulePowerCut, setRulePowerCut] = useState(true);
  const [ruleRwa, setRuleRwa] = useState(true);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Sound muter toggle
  const toggleSound = () => {
    // We mock playSound but it will fail silently if muted
    setSoundMuted(!soundMuted);
    (window as any).isSoundMuted = !soundMuted;
  };

  // Game timer clock tick effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && phase === "playing") {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, phase]);

  // Keep log panel scrolled down
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const copyInvite = () => {
    const text = `Join my Ghaziabad Tycoon room: ${window.location.origin}\nRoom code: ${roomCode}\nBring cash. Avoid Hapur Chungi!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    playSound("click");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    createRoom(playerName.trim(), {
      startingMoney: startingCash,
      durationMinutes: duration,
      funRules: {
        hapurChungiJam: ruleChungi,
        powerCut: rulePowerCut,
        rwaDrama: ruleRwa,
        baaratBlock: true,
      },
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !joinCodeInput.trim()) return;

    // Join room setup
    const success = joinRoom(
      joinCodeInput.toUpperCase().trim(),
      playerName.trim(),
      selectedToken,
      selectedColor
    );

    if (success) {
      // Room entered locally
      useGameStore.setState({ roomCode: joinCodeInput.toUpperCase().trim() });
    } else {
      alert("Failed to join. Room might be full.");
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(localPlayerId, chatInput.trim());
    setChatInput("");
    playSound("click");
  };

  // Format timer
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const activePlayer = players[localPlayerId];
  const turnPlayer = currentTurnPlayerId ? players[currentTurnPlayerId] : null;

  return (
    <div
      className="w-full h-full flex flex-col diorama-border"
      style={{
        height: "100vh",
        maxHeight: "100vh",
        background: "radial-gradient(circle, #1e293b 0%, #0f172a 100%)",
        userSelect: "none",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <header
        className="glass-panel px-6 py-3 flex items-center justify-between z-10"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white font-outfit leading-none">
              GHAZIABAD TYCOON
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
              Private Real Estate Diorama
            </span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          {phase === "playing" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-sm font-semibold text-slate-200">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 transition-premium text-slate-400 hover:text-white"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {roomCode && (
            <div className="text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-white/10 font-mono text-slate-300">
              ROOM: <strong className="text-cyan-400">{roomCode}</strong>
            </div>
          )}
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 w-full flex overflow-hidden relative">
        {/* --- 1. LANDING PHASE --- */}
        {phase === "landing" && (
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-8 gap-8 overflow-y-auto">
            {/* Left promo/pitch */}
            <div className="max-w-md text-left animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 100% Browser Diorama
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4 font-outfit leading-tight">
                Buy Vaishali.<br />
                Get stuck at<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  Hapur Chungi.
                </span>
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6">
                Ghaziabad Tycoon is a 3D board game for friends. Roll dice, buy local sectors, collect rent, trigger chaotic RWA/Traffic cards, and bankrupt your squad on the same screen!
              </p>
            </div>

            {/* Right forms container */}
            <div className="w-full max-w-md flex flex-col gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4 font-outfit text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-400" /> Create Private Session
                </h3>
                <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Your Name (Host)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vicky Bhai"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={18}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white font-medium"
                    />
                  </div>

                  {/* Settings toggler toggle */}
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-slate-400" /> Starting Cash
                      </span>
                      <span className="font-bold text-white">₹{startingCash.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={25000}
                      step={1000}
                      value={startingCash}
                      onChange={(e) => setStartingCash(Number(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1 rounded"
                    />

                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration (Min)
                      </span>
                      <span className="font-bold text-white">{duration} Minutes</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1 rounded"
                    />
                  </div>

                  {/* Toggle Rules */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Toggle Local Rules
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-900/80 border border-white/5 p-2 rounded-lg cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          checked={ruleChungi}
                          onChange={(e) => setRuleChungi(e.target.checked)}
                          className="accent-indigo-500"
                        />
                        <span className="text-slate-300 font-medium">Hapur Chungi Jam</span>
                      </label>
                      <label className="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-900/80 border border-white/5 p-2 rounded-lg cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          checked={rulePowerCut}
                          onChange={(e) => setRulePowerCut(e.target.checked)}
                          className="accent-indigo-500"
                        />
                        <span className="text-slate-300 font-medium">Power Cuts</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-accent text-white font-bold py-2.5 rounded-xl button-interactive text-sm mt-2 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                  >
                    Setup Board <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Join room card */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-3 font-outfit text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" /> Enter Existing Room
                </h3>
                <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Room Code
                      </label>
                      <input
                        type="text"
                        placeholder="GZB7K"
                        maxLength={5}
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-center font-mono font-bold focus:outline-none focus:border-cyan-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="Vicky"
                        maxLength={18}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-white"
                      />
                    </div>
                  </div>

                  {/* Token selection */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                      Select Token Toy
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "auto", name: "🛺 Auto" },
                        { id: "metrocard", name: "💳 Metro" },
                        { id: "chaicup", name: "☕ Chai" },
                        { id: "helmet", name: "🪖 Helmet" },
                        { id: "cone", name: "🗼 Cone" },
                        { id: "dog", name: "🐶 Doggy" },
                      ].map((tk) => (
                        <button
                          key={tk.id}
                          type="button"
                          onClick={() => {
                            setSelectedToken(tk.id);
                            playSound("click");
                          }}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-premium border ${
                            selectedToken === tk.id
                              ? "bg-cyan-500/20 border-cyan-400 text-white"
                              : "bg-slate-900/30 border-white/5 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {tk.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Pin Color
                    </label>
                    <div className="flex gap-2 justify-between">
                      {["#3F51B5", "#FF5722", "#E91E63", "#4CAF50", "#FFEB3B", "#9C27B0"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedColor(c);
                            playSound("click");
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-premium ${
                            selectedColor === c ? "border-white scale-110" : "border-transparent opacity-70"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold py-2 rounded-xl button-interactive text-xs mt-2"
                  >
                    Join Room
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. LOBBY PHASE --- */}
        {phase === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto animate-slide-up">
            <div className="glass-panel p-8 rounded-2xl w-full flex flex-col gap-6">
              <div className="text-center">
                <span className="text-[10px] font-extrabold tracking-widest text-indigo-400 uppercase">
                  Session Room Ready
                </span>
                <h2 className="text-3xl font-black text-white font-outfit mt-1">
                  Invite Your Friends
                </h2>
                <p className="text-slate-400 text-xs mt-1.5">
                  Send the invite details to your friends to join with room code.
                </p>
              </div>

              {/* Copy invite block */}
              <div className="flex gap-2 p-3 bg-slate-900/60 rounded-xl border border-white/5 items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-xs text-slate-300 truncate">
                    Code: <strong className="text-cyan-400">{roomCode}</strong>
                  </span>
                </div>
                <button
                  onClick={copyInvite}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-premium"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Players listing */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Joined Players ({playerOrder.length}/6)
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                  {playerOrder.map((pid) => {
                    const p = players[pid];
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="text-sm font-semibold text-slate-200">
                            {p.name} {p.id === localPlayerId ? "(You)" : ""}
                          </span>
                        </div>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md font-mono font-bold capitalize">
                          {p.tokenId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bot toggler helper */}
              <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Simulate Friends</span>
                  <span className="text-[10px] text-slate-400 block">
                    No friends online? Add bots to fill up the board!
                  </span>
                </div>
                <button
                  onClick={() => addBotPlayers(1)}
                  disabled={playerOrder.length >= 6}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white border border-white/5 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Bot
                </button>
              </div>

              {/* Start game button (host only) */}
              {localPlayerId === hostId ? (
                <button
                  onClick={startGame}
                  disabled={playerOrder.length < 1}
                  className="w-full bg-gradient-accent text-white font-bold py-3 rounded-xl button-interactive text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Property War!
                </button>
              ) : (
                <div className="text-center text-xs text-slate-400 animate-pulse-slow">
                  Waiting for host to start the game...
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 3. END GAME PHASE --- */}
        {phase === "ended" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto animate-slide-up">
            <div className="glass-panel p-8 rounded-2xl w-full flex flex-col gap-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center animate-float">
                <Award className="w-8 h-8 text-yellow-500" />
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-widest text-yellow-500 uppercase">
                  Diorama Championship Ended
                </span>
                <h2 className="text-3xl font-extrabold text-white font-outfit mt-1">
                  {winnerId ? players[winnerId]?.name : "No One"} Wins!
                </h2>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  The real estate market has spoken. This player dominated Ghaziabad with absolute capitalist dominance!
                </p>
              </div>

              {/* Net worth Leaderboard display */}
              <div className="flex flex-col gap-2 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Final Leaderboard Standings
                </span>
                <div className="flex flex-col gap-1.5">
                  {playerOrder
                    .map((pid) => {
                      const p = players[pid];
                      // Calculate net worth
                      let netWorth = p.money;
                      if (!p.isBankrupt) {
                        p.ownedPropertyIds.forEach((tid) => {
                          const tile = BOARD_TILES[tid];
                          const prop = properties[tid];
                          if (tile.price) {
                            netWorth += tile.price;
                            netWorth += prop.upgradeLevel * Math.floor(tile.price / 2);
                          }
                        });
                      } else {
                        netWorth = 0;
                      }
                      return { player: p, netWorth };
                    })
                    .sort((a, b) => b.netWorth - a.netWorth)
                    .map((item, idx) => (
                      <div
                        key={item.player.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          item.player.id === winnerId
                            ? "bg-yellow-500/10 border-yellow-500/30"
                            : "bg-slate-900/30 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.player.color }}
                          />
                          <span className="text-sm font-semibold text-slate-200">
                            {item.player.name}
                          </span>
                          {item.player.isBankrupt && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Bankrupt
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-300 font-mono">
                          ₹{item.netWorth.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <button
                onClick={resetGame}
                className="w-full bg-gradient-accent text-white font-bold py-3 rounded-xl button-interactive text-sm mt-2 flex items-center justify-center gap-2"
              >
                Return to Menu
              </button>
            </div>
          </div>
        )}

        {/* --- 4. PLAYING PLAYBOARD PHASE --- */}
        {phase === "playing" && (
          <div className="flex-1 w-full h-full flex overflow-hidden relative">
            {/* LEFT SIDEBAR: Players Status */}
            <aside
              className="w-72 glass-panel h-full flex flex-col border-r overflow-y-auto p-4 gap-4 z-10"
              style={{ borderRight: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Player Roster
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5 font-mono">
                  Round {Math.floor(turnNumber / playerOrder.length) + 1}
                </span>
              </div>

              {/* Players Card List */}
              <div className="flex flex-col gap-3">
                {playerOrder.map((pid) => {
                  const p = players[pid];
                  const isCurrent = currentTurnPlayerId === pid;
                  return (
                    <div
                      key={pid}
                      className={`p-3.5 rounded-xl border transition-premium relative overflow-hidden ${
                        p.isBankrupt
                          ? "bg-red-950/20 border-red-900/30 opacity-60"
                          : isCurrent
                          ? "bg-slate-900/80 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                          : "bg-slate-950/40 border-white/5"
                      }`}
                    >
                      {/* Active turn top indicator bar */}
                      {isCurrent && !p.isBankrupt && (
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: p.color }}
                        />
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="text-sm font-bold text-slate-200 font-outfit truncate max-w-[120px]">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                          {p.tokenId}
                        </span>
                      </div>

                      {/* Cash count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-sm font-bold text-white font-mono">
                            ₹{p.money.toLocaleString()}
                          </span>
                        </div>

                        {/* Thana/Jail badging */}
                        {p.isInThana && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            In Thana
                          </span>
                        )}
                        {p.isBankrupt && (
                          <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                            <Skull className="w-2.5 h-2.5" /> Bankrupt
                          </span>
                        )}
                      </div>

                      {/* Owned properties count */}
                      {!p.isBankrupt && p.ownedPropertyIds.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap gap-1">
                          {p.ownedPropertyIds.map((tid) => {
                            const tile = BOARD_TILES[tid];
                            const prop = properties[tid];
                            const color = tile.group ? COLOR_GROUPS[tile.group] : "#9E9E9E";
                            return (
                              <div
                                key={tid}
                                title={`${tile.name} (Lvl ${prop.upgradeLevel})`}
                                className="w-2 h-4 rounded-sm border border-black/20"
                                style={{ backgroundColor: color }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Local properties upgrade controller (Buy Flat/Floor panel) */}
              {activePlayer && !activePlayer.isBankrupt && activePlayer.ownedPropertyIds.length > 0 && (
                <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                    Upgrade Properties
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {activePlayer.ownedPropertyIds.map((tid) => {
                      const tile = BOARD_TILES[tid];
                      const prop = properties[tid];
                      if (tile.type !== "property" || !tile.price) return null;
                      const cost = Math.floor(tile.price / 2);
                      const upgrades = ["Plot", "Chai Stall", "Builder Floor", "Society Tower", "Mall Complex"];
                      return (
                        <div
                          key={tid}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30 border border-white/5 text-xs"
                        >
                          <div className="text-left">
                            <span className="font-semibold text-slate-200 block truncate max-w-[120px]">
                              {tile.shortName}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {upgrades[prop.upgradeLevel]}
                            </span>
                          </div>
                          {prop.upgradeLevel < 4 ? (
                            <button
                              onClick={() => upgradeProperty(tid)}
                              disabled={activePlayer.money < cost}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-2 py-1 rounded text-[10px] flex items-center gap-0.5 transition-premium"
                            >
                              + ₹{cost}
                            </button>
                          ) : (
                            <span className="text-[10px] text-yellow-500 font-bold">MAX</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>

            {/* MIDDLE AREA: The 3D Canvas Board & Overlays */}
            <section className="flex-1 h-full relative flex flex-col overflow-hidden">
              {/* Power cut blackout overlay */}
              {powerCutRounds > 0 && (
                <div className="absolute inset-0 bg-indigo-950/5 pointer-events-none z-10 diorama-border border-2 border-amber-500/25 animate-pulse-slow">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                    <ShieldAlert className="w-3.5 h-3.5" /> Society Power Cut: Rents Doubled ({powerCutRounds} rounds left)
                  </div>
                </div>
              )}

              {/* The 3D Board Canvas */}
              <div className="flex-1 w-full h-full">
                <GameCanvas />
              </div>

              {/* ACTION CONTROL DOCK (Floating at bottom center) */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-10 pointer-events-none">
                <div className="glass-panel p-4 rounded-2xl flex items-center justify-between gap-4 pointer-events-auto shadow-2xl shadow-black/50">
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Turn Action
                    </span>
                    <span className="text-sm font-bold text-slate-200 block font-outfit mt-0.5">
                      {turnPlayer ? (
                        <>
                          {turnPlayer.id === localPlayerId ? "Your Turn" : `${turnPlayer.name}'s Turn`}
                          <span className="text-slate-400 text-xs font-medium ml-1">
                            (
                            {activeAction === "roll" && "Needs Dice Roll"}
                            {activeAction === "buy_or_pass" && "Deciding Purchase"}
                            {activeAction === "pay_rent" && "Rent Owed"}
                            {activeAction === "draw_card" && "Must Draw Card"}
                            {activeAction === "thana_choice" && "Locked in Thana"}
                            {activeAction === "resolved" && "Ready to End Turn"}
                            {activeAction === "bankrupt_confirm" && "Financial Settlement Required"}
                            )
                          </span>
                        </>
                      ) : (
                        "Loading..."
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Action buttons based on state */}
                    {currentTurnPlayerId === localPlayerId && !activePlayer.isBankrupt && (
                      <>
                        {activeAction === "roll" && (
                          <button
                            onClick={rollDice}
                            disabled={isRolling}
                            className="bg-gradient-accent text-white font-bold px-6 py-2.5 rounded-xl button-interactive text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                          >
                            <Dice5 className="w-4 h-4 fill-white" />
                            {isRolling ? "Rolling..." : "Roll Dice"}
                          </button>
                        )}

                        {activeAction === "resolved" && (
                          <button
                            onClick={endTurn}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold px-6 py-2.5 rounded-xl button-interactive text-sm"
                          >
                            End Turn
                          </button>
                        )}

                        {activeAction === "bankrupt_confirm" && (
                          <button
                            onClick={endTurn}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl button-interactive text-sm flex items-center gap-1.5"
                          >
                            <Skull className="w-4 h-4" /> Declare Bankruptcy
                          </button>
                        )}
                      </>
                    )}

                    {/* Bot active indicators */}
                    {turnPlayer?.isBot && (
                      <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 text-xs text-indigo-400 font-bold animate-pulse-slow">
                        🤖 Thinking...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT SIDEBAR: LEDGER LOG & CHAT PANEL */}
            <aside
              className="w-80 glass-panel h-full flex flex-col border-l overflow-hidden z-10"
              style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              {/* Reactions Bar */}
              <div className="p-3 border-b border-white/5 bg-slate-950/20 flex gap-2 justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Send Reaction
                </span>
                <div className="flex gap-1">
                  {["😂", "🔥", "🤑", "😭", "😤", "👋"].map((em) => (
                    <button
                      key={em}
                      onClick={() => sendReaction(localPlayerId, em)}
                      disabled={activePlayer?.isBankrupt}
                      className="hover:scale-125 transition-premium text-sm p-1"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Log Console */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Transaction Ledger
                </span>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 text-left">
                  {log.map((entry) => {
                    let colorClass = "text-slate-300";
                    if (entry.type === "success") colorClass = "text-emerald-400";
                    else if (entry.type === "danger") colorClass = "text-red-400";
                    else if (entry.type === "warning") colorClass = "text-amber-400";
                    else if (entry.type === "roll") colorClass = "text-cyan-400 font-semibold";
                    else if (entry.type === "chat") colorClass = "text-indigo-300";

                    return (
                      <div
                        key={entry.id}
                        className="text-xs leading-relaxed p-1.5 rounded bg-slate-900/10 border border-white/2 flex items-start gap-2"
                      >
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 mt-0.5">
                          {entry.timestamp}
                        </span>
                        <div>
                          {entry.playerName && (
                            <strong
                              style={{ color: entry.playerColor }}
                              className="mr-1.5"
                            >
                              {entry.playerName}
                            </strong>
                          )}
                          <span className={colorClass}>{entry.message}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Chat Input panel */}
              <div className="p-3 bg-slate-950/30 border-t border-white/5">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message to lobby..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={activePlayer?.isBankrupt}
                    maxLength={60}
                    className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                  />
                  <button
                    type="submit"
                    disabled={activePlayer?.isBankrupt}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl transition-premium flex items-center justify-center"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* --- EVENT MODAL OVERLAYS --- */}
      {/* 1. Property Details Purchase Modal */}
      {phase === "playing" && activeAction === "buy_or_pass" && turnPlayer && (
        (() => {
          const tile = BOARD_TILES[turnPlayer.position];
          const color = tile.group ? COLOR_GROUPS[tile.group] : "#ECEFF1";
          const isLocal = turnPlayer.id === localPlayerId;
          return (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="glass-panel p-6 rounded-2xl w-full max-w-sm animate-card-deal text-center">
                <div
                  className="w-full h-3 rounded-lg mb-3"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Land Deed Available
                </span>
                <h3 className="text-2xl font-black text-white font-outfit">
                  {tile.name}
                </h3>
                <p className="text-slate-400 text-xs italic mt-1 leading-relaxed px-4">
                  "{tile.localFlavor}"
                </p>

                {/* Property Details ledger */}
                <div className="my-5 p-3.5 bg-slate-900/50 rounded-xl border border-white/5 text-left flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Purchase Price</span>
                    <strong className="text-white font-mono text-sm">₹{tile.price}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-white/5">
                    <span>Base Rent</span>
                    <strong className="text-white font-mono">₹{tile.baseRent}</strong>
                  </div>
                  {tile.group && (
                    <div className="text-[10px] text-slate-500 leading-tight pt-2">
                      * Rent doubles if owner holds the full <strong>{COLOR_GROUP_NAMES[tile.group]}</strong> group. Rents scale heavily with local upgrades.
                    </div>
                  )}
                </div>

                {/* Buy skip triggers (Only available if local player turn) */}
                {isLocal ? (
                  <div className="flex gap-3">
                    <button
                      onClick={skipProperty}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl border border-white/5 transition-premium text-xs"
                    >
                      Skip Deal
                    </button>
                    <button
                      onClick={buyProperty}
                      disabled={turnPlayer.money < (tile.price ?? 0)}
                      className="flex-1 bg-gradient-accent text-white font-bold py-2.5 rounded-xl button-interactive text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      Buy Property
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 animate-pulse-slow">
                    Waiting for {turnPlayer.name} to decide...
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* 2. Rent Due warning overlay */}
      {phase === "playing" && activeAction === "pay_rent" && turnPlayer && (
        (() => {
          const tile = BOARD_TILES[turnPlayer.position];
          const prop = properties[turnPlayer.position];
          const owner = players[prop.ownerId!];
          const isLocal = turnPlayer.id === localPlayerId;

          // Calculate rent
          let rentAmount = 0;
          if (tile.type === "rail") {
            const ownedRails = owner.ownedPropertyIds.filter(
              (tid) => BOARD_TILES[tid].type === "rail"
            ).length;
            rentAmount = [0, 250, 500, 1000, 2000][Math.min(ownedRails, 4)];
          } else if (tile.type === "utility") {
            const ownedUtils = owner.ownedPropertyIds.filter(
              (tid) => BOARD_TILES[tid].type === "utility"
            ).length;
            const rollTotal = useGameStore.getState().lastDiceRoll?.total ?? 7;
            rentAmount = rollTotal * (ownedUtils === 2 ? 250 : 100);
          } else if (tile.type === "property" && tile.baseRent) {
            let base = tile.baseRent;
            const groupColor = tile.group!;
            const groupTiles = BOARD_TILES.filter((t) => t.group === groupColor).map((t) => t.id);
            const ownsAll = groupTiles.every((tid) => owner.ownedPropertyIds.includes(tid));

            if (ownsAll && prop.upgradeLevel === 0) {
              base = base * 2;
            }
            const multiplier = [1, 2.5, 5.5, 8, 12][prop.upgradeLevel];
            rentAmount = Math.floor(base * multiplier);
          }

          if (powerCutRounds > 0 && tile.type === "utility") {
            rentAmount *= 2;
          }

          return (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="glass-panel p-6 rounded-2xl w-full max-w-sm border-red-500/20 text-center animate-card-deal">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
                  <Coins className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-1">
                  Property Toll Required
                </span>
                <h3 className="text-2xl font-black text-white font-outfit">
                  Landed on Rent Spot!
                </h3>
                <p className="text-slate-400 text-xs mt-1 px-4 leading-relaxed">
                  Landed on <strong className="text-slate-200">{tile.name}</strong>, owned by <strong style={{ color: owner.color }}>{owner.name}</strong>.
                </p>

                <div className="my-5 p-4 bg-red-950/20 rounded-xl border border-red-500/10">
                  <span className="text-xs text-red-300 font-semibold uppercase tracking-wider block">
                    Rent Bill
                  </span>
                  <strong className="text-3xl font-black text-white font-mono mt-1 block">
                    ₹{rentAmount.toLocaleString()}
                  </strong>
                </div>

                {isLocal ? (
                  <button
                    onClick={payRent}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl button-interactive text-xs shadow-lg shadow-red-600/20"
                  >
                    Transfer Rent
                  </button>
                ) : (
                  <div className="text-xs text-slate-400 animate-pulse-slow">
                    Waiting for {turnPlayer.name} to pay rent...
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* 3. Event Card Draw Modal */}
      {phase === "playing" && activeAction === "draw_card" && turnPlayer && (
        (() => {
          const tile = BOARD_TILES[turnPlayer.position];
          const isLocal = turnPlayer.id === localPlayerId;

          // Determine deck type
          let deck: "traffic" | "society" | "chance" = "chance";
          let deckTitle = "NCR Chance Card";
          let colorGradient = "from-cyan-500 to-blue-500";
          if (tile.name.includes("Traffic") || tile.name.includes("Chungi")) {
            deck = "traffic";
            deckTitle = "Traffic Event Card";
            colorGradient = "from-orange-500 to-red-500";
          } else if (tile.name.includes("RWA") || tile.name.includes("Chai")) {
            deck = "society";
            deckTitle = "Society/RWA Card";
            colorGradient = "from-emerald-500 to-teal-500";
          }

          return (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              {drawnCard ? (
                // Drawn card detail display
                <div className="glass-panel p-6 rounded-2xl w-full max-w-xs animate-card-deal border-white/10 text-center relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${colorGradient}`} />
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-1.5 mt-2">
                    Card Reveal
                  </span>
                  <h4 className="text-xl font-black text-white font-outfit">
                    {drawnCard.title}
                  </h4>

                  <div className="my-5 p-4 bg-slate-900/60 rounded-xl border border-white/5 text-xs text-left min-h-24 flex flex-col justify-center gap-2">
                    <p className="text-slate-300 font-medium leading-relaxed">
                      {drawnCard.description}
                    </p>
                    <div className="text-[10px] text-cyan-400 border-t border-white/5 pt-2 font-bold uppercase tracking-wider">
                      Effect: {drawnCard.effectText}
                    </div>
                  </div>

                  {isLocal ? (
                    <button
                      onClick={closeCardModal}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl button-interactive text-xs shadow-lg shadow-indigo-600/20"
                    >
                      Acknowledge Card
                    </button>
                  ) : (
                    <div className="text-xs text-slate-400 animate-pulse-slow">
                      Waiting for {turnPlayer.name} to confirm card...
                    </div>
                  )}
                </div>
              ) : (
                // Draw action trigger
                <div className="glass-panel p-6 rounded-2xl w-full max-w-xs text-center border-white/10 animate-card-deal">
                  <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-tr ${colorGradient} flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 animate-float`}>
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-outfit">
                    Draw {deckTitle}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1.5 mb-5 px-3">
                    Landed on <strong className="text-slate-200">{tile.name}</strong>. Draw a card from the deck to trigger a local event!
                  </p>

                  {isLocal ? (
                    <button
                      onClick={() => drawCard(deck)}
                      className="w-full bg-gradient-accent text-white font-bold py-2.5 rounded-xl button-interactive text-xs shadow-lg shadow-indigo-600/20"
                    >
                      Draw Event Card
                    </button>
                  ) : (
                    <div className="text-xs text-slate-400 animate-pulse-slow">
                      Waiting for {turnPlayer.name} to draw...
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* 4. Thana Checkpoint Stuck Options Modal */}
      {phase === "playing" && activeAction === "thana_choice" && turnPlayer && (
        (() => {
          const isLocal = turnPlayer.id === localPlayerId;
          const hasJugaad = turnPlayer.cards.some((c) => c.id === "s8");
          return (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="glass-panel p-6 rounded-2xl w-full max-w-sm border-amber-500/20 text-center animate-card-deal">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-2xl">
                  👮
                </div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Checkpoint Detained
                </span>
                <h3 className="text-2xl font-black text-white font-outfit">
                  Stuck at Thana Checkpoint
                </h3>
                <p className="text-slate-400 text-xs mt-1 px-4 leading-relaxed mb-5">
                  Choose your escape path to continue moving around the Ghaziabad map.
                </p>

                {isLocal ? (
                  <div className="flex flex-col gap-3">
                    {/* Pay option */}
                    <button
                      onClick={() => resolveJailAction("pay")}
                      disabled={turnPlayer.money < 500}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl border border-white/5 flex justify-between px-4 items-center text-xs"
                    >
                      <span>Pay Bail / Chalan fine</span>
                      <strong className="text-emerald-400">₹500</strong>
                    </button>

                    {/* Jugaad option */}
                    <button
                      onClick={() => resolveJailAction("pass")}
                      disabled={!hasJugaad}
                      className="w-full bg-indigo-600/30 border border-indigo-500/30 hover:bg-indigo-600/50 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl flex justify-between px-4 items-center text-xs"
                    >
                      <span>Use Jugaad Pass</span>
                      <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded uppercase font-bold">
                        Papa Vidhayak
                      </span>
                    </button>

                    {/* Roll option */}
                    <button
                      onClick={() => resolveJailAction("roll")}
                      className="w-full bg-gradient-accent text-white font-bold py-2.5 rounded-xl button-interactive text-xs shadow-lg shadow-indigo-600/20 flex justify-between px-4 items-center"
                    >
                      <span>Attempt Doubles on Dice</span>
                      <span className="text-[10px] text-white/80 font-medium">
                        Try Luck (Double or Stay)
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 animate-pulse-slow">
                    Waiting for {turnPlayer.name} to choose escape option...
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
