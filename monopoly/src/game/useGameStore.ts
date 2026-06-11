import { create } from "zustand";
import {
  BOARD_TILES,
  COLOR_GROUPS,
  TRAFFIC_CARDS,
  SOCIETY_CARDS,
  CHANCE_CARDS,
  BoardTile,
  CardDefinition,
} from "./board.config";
import { playSound } from "./sound";
import confetti from "canvas-confetti";

export interface Player {
  id: string;
  name: string;
  color: string;
  tokenId: string;
  money: number;
  position: number;
  isBankrupt: boolean;
  isInThana: boolean;
  thanaTurns: number;
  ownedPropertyIds: number[];
  cards: { id: string; title: string }[];
  connected: boolean;
  isBot: boolean;
}

export interface PropertyState {
  tileId: number;
  ownerId: string | null;
  upgradeLevel: 0 | 1 | 2 | 3 | 4; // 0 = empty plot, 1 = Chai Stall, 2 = Builder Floor, 3 = Society Tower, 4 = Mall Complex
  isMortgaged: boolean;
}

export interface GameLogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "danger" | "roll" | "chat";
  playerName?: string;
  playerColor?: string;
}

export interface GameSettings {
  maxPlayers: number;
  startingMoney: number;
  salaryOnStart: number;
  durationMinutes: number;
  allowAuctions: boolean;
  allowTrades: boolean;
  funRules: {
    hapurChungiJam: boolean;
    powerCut: boolean;
    rwaDrama: boolean;
    baaratBlock: boolean;
  };
}

export interface DiceRoll {
  d1: number;
  d2: number;
  total: number;
  isDouble: boolean;
}

export interface GameState {
  roomCode: string;
  phase: "landing" | "lobby" | "playing" | "ended";
  hostId: string;
  localPlayerId: string;
  players: Record<string, Player>;
  playerOrder: string[];
  currentTurnPlayerId: string | null;
  turnNumber: number;
  properties: Record<number, PropertyState>;
  lastDiceRoll: DiceRoll | null;
  log: GameLogEntry[];
  settings: GameSettings;
  timeLeft: number; // in seconds
  timerActive: boolean;
  drawnCard: (CardDefinition & { deckType: "traffic" | "society" | "chance" }) | null;
  activeAction: "roll" | "buy_or_pass" | "pay_rent" | "draw_card" | "thana_choice" | "resolved" | "bankrupt_confirm";
  isRolling: boolean;
  winnerId: string | null;
  powerCutRounds: number; // visual effect/rule helper

  // Actions
  resetGame: () => void;
  createRoom: (hostName: string, settings?: Partial<GameSettings>) => void;
  joinRoom: (roomCode: string, name: string, tokenId: string, color: string, isBot?: boolean) => boolean;
  addBotPlayers: (count: number) => void;
  startGame: () => void;
  rollDice: () => void;
  movePlayer: (playerId: string, targetPos: number, animate?: boolean) => Promise<void>;
  buyProperty: () => void;
  skipProperty: () => void;
  upgradeProperty: (tileId: number) => boolean;
  payRent: () => void;
  drawCard: (deckType: "traffic" | "society" | "chance") => void;
  closeCardModal: () => void;
  resolveJailAction: (actionType: "pay" | "pass" | "roll") => void;
  endTurn: () => void;
  sendReaction: (playerId: string, emoji: string) => void;
  sendChat: (playerId: string, text: string) => void;
  checkWinner: () => void;
  tickTimer: () => void;
}

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 6,
  startingMoney: 15000,
  salaryOnStart: 2000,
  durationMinutes: 30,
  allowAuctions: false,
  allowTrades: false,
  funRules: {
    hapurChungiJam: true,
    powerCut: true,
    rwaDrama: true,
    baaratBlock: true,
  },
};

const INITIAL_PROPERTIES = () => {
  const props: Record<number, PropertyState> = {};
  BOARD_TILES.forEach((tile) => {
    if (tile.type === "property" || tile.type === "rail" || tile.type === "utility") {
      props[tile.id] = {
        tileId: tile.id,
        ownerId: null,
        upgradeLevel: 0,
        isMortgaged: false,
      };
    }
  });
  return props;
};

const BOT_NAMES = [
  "Rohit (GZB Hustler)",
  "Priyanka (Indirapuram Queen)",
  "Amit (Metro Rider)",
  "RWA Uncle Verma",
  "Noida Escapee",
  "Hapur Chungi Legend",
];

const BOT_COLORS = ["#FF5722", "#E91E63", "#00BCD4", "#8BC34A", "#9C27B0", "#FFC107"];
const BOT_TOKENS = ["scooter", "metrocard", "chaicup", "helmet", "cone", "dog"];

const getFormattedTime = () => {
  const now = new Date();
  return now.toTimeString().split(" ")[0].substring(0, 5);
};

export const useGameStore = create<GameState>((set, get) => {
  // Helper to add logs
  const addLogEntry = (message: string, type: GameLogEntry["type"], pid?: string) => {
    const players = get().players;
    const player = pid ? players[pid] : undefined;
    const newEntry: GameLogEntry = {
      id: Math.random().toString(),
      message,
      timestamp: getFormattedTime(),
      type,
      playerName: player?.name,
      playerColor: player?.color,
    };
    set((state) => ({ log: [newEntry, ...state.log].slice(0, 80) }));
  };

  // Bot logic executor
  const runBotTurn = async () => {
    const state = get();
    const activeId = state.currentTurnPlayerId;
    if (!activeId) return;

    const bot = state.players[activeId];
    if (!bot || !bot.isBot || bot.isBankrupt) return;

    // Small delay to feel natural
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Handle thana checkpoint choice
    if (get().activeAction === "thana_choice") {
      if (bot.cards.some((c) => c.id === "s8")) {
        // Use Jugaad pass
        get().resolveJailAction("pass");
        addLogEntry(`${bot.name} used their Jugaad Pass to walk out of Thana.`, "success", activeId);
      } else if (bot.money >= 1000) {
        get().resolveJailAction("pay");
      } else {
        get().resolveJailAction("roll");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Roll Dice
    if (get().activeAction === "roll") {
      get().rollDice();
      // Wait for dice rolling animation
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    // Resolve land choices
    let action = get().activeAction;
    if (action === "buy_or_pass") {
      const currentPos = bot.position;
      const tile = BOARD_TILES[currentPos];
      // Simple bot buying heuristic: buy if money left > price * 1.5
      if (tile.price && bot.money > tile.price * 1.5) {
        get().buyProperty();
      } else {
        get().skipProperty();
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } else if (action === "pay_rent") {
      get().payRent();
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } else if (action === "draw_card") {
      const currentPos = bot.position;
      const tile = BOARD_TILES[currentPos];
      let deck: "traffic" | "society" | "chance" = "chance";
      if (tile.name.includes("Traffic") || tile.name.includes("Chungi")) deck = "traffic";
      else if (tile.name.includes("RWA") || tile.name.includes("Chai")) deck = "society";
      get().drawCard(deck);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      get().closeCardModal();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Bot tries to upgrade a random property if they have excess money
    if (bot.ownedPropertyIds.length > 0 && bot.money > 5000) {
      const randPropId = bot.ownedPropertyIds[Math.floor(Math.random() * bot.ownedPropertyIds.length)];
      get().upgradeProperty(randPropId);
    }

    // Random reaction
    if (Math.random() < 0.4) {
      const emojis = ["🚀", "😂", "🔥", "🤑", "😭", "😤"];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      get().sendReaction(activeId, emoji);
    }

    // End Turn
    if (get().activeAction === "resolved" || get().activeAction === "bankrupt_confirm") {
      get().endTurn();
    }
  };

  return {
    roomCode: "",
    phase: "landing",
    hostId: "",
    localPlayerId: "",
    players: {},
    playerOrder: [],
    currentTurnPlayerId: null,
    turnNumber: 1,
    properties: INITIAL_PROPERTIES(),
    lastDiceRoll: null,
    log: [],
    settings: { ...DEFAULT_SETTINGS },
    timeLeft: 0,
    timerActive: false,
    drawnCard: null,
    activeAction: "roll",
    isRolling: false,
    winnerId: null,
    powerCutRounds: 0,

    resetGame: () => {
      set({
        roomCode: "",
        phase: "landing",
        hostId: "",
        localPlayerId: "",
        players: {},
        playerOrder: [],
        currentTurnPlayerId: null,
        turnNumber: 1,
        properties: INITIAL_PROPERTIES(),
        lastDiceRoll: null,
        log: [],
        timeLeft: 0,
        timerActive: false,
        drawnCard: null,
        activeAction: "roll",
        isRolling: false,
        winnerId: null,
        powerCutRounds: 0,
      });
    },

    createRoom: (hostName, settingsOverrides) => {
      playSound("click");
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const roomCode = Array.from({ length: 5 }, () =>
        alphabet[Math.floor(Math.random() * alphabet.length)]
      ).join("");

      const hostId = "p_host_" + Math.random().toString(36).substring(2, 8);
      const settings = { ...DEFAULT_SETTINGS, ...settingsOverrides };

      const hostPlayer: Player = {
        id: hostId,
        name: hostName,
        color: "#3F51B5",
        tokenId: "auto",
        money: settings.startingMoney,
        position: 0,
        isBankrupt: false,
        isInThana: false,
        thanaTurns: 0,
        ownedPropertyIds: [],
        cards: [],
        connected: true,
        isBot: false,
      };

      set({
        roomCode,
        phase: "lobby",
        hostId,
        localPlayerId: hostId,
        players: { [hostId]: hostPlayer },
        playerOrder: [hostId],
        settings,
        timeLeft: settings.durationMinutes * 60,
      });

      addLogEntry(`Room ${roomCode} created by ${hostName}. Welcome to Ghaziabad!`, "info");
    },

    joinRoom: (roomCode, name, tokenId, color, isBot = false) => {
      playSound("click");
      const state = get();
      if (Object.keys(state.players).length >= state.settings.maxPlayers) {
        return false;
      }

      const newId = isBot ? "bot_" + Math.random().toString(36).substring(2, 8) : "p_" + Math.random().toString(36).substring(2, 8);
      const newPlayer: Player = {
        id: newId,
        name,
        color,
        tokenId,
        money: state.settings.startingMoney,
        position: 0,
        isBankrupt: false,
        isInThana: false,
        thanaTurns: 0,
        ownedPropertyIds: [],
        cards: [],
        connected: true,
        isBot,
      };

      set((s) => ({
        players: { ...s.players, [newId]: newPlayer },
        playerOrder: [...s.playerOrder, newId],
      }));

      addLogEntry(`${name} joined the room.`, "info", newId);
      return true;
    },

    addBotPlayers: (count) => {
      playSound("click");
      const state = get();
      const currentCount = Object.keys(state.players).length;
      const spaceLeft = state.settings.maxPlayers - currentCount;
      const actualToAdd = Math.min(count, spaceLeft);

      for (let i = 0; i < actualToAdd; i++) {
        const botName = BOT_NAMES[i % BOT_NAMES.length];
        const botColor = BOT_COLORS[(currentCount + i) % BOT_COLORS.length];
        const botToken = BOT_TOKENS[(currentCount + i) % BOT_TOKENS.length];
        get().joinRoom(state.roomCode, botName, botToken, botColor, true);
      }
    },

    startGame: () => {
      playSound("win");
      const state = get();
      if (state.playerOrder.length < 1) return; // At least host plays (or bots)

      set({
        phase: "playing",
        currentTurnPlayerId: state.playerOrder[0],
        timerActive: true,
        activeAction: "roll",
      });

      addLogEntry("Game started! Roll dice to begin the property hustle.", "success");
      addLogEntry(`It is ${state.players[state.playerOrder[0]].name}'s turn.`, "info", state.playerOrder[0]);

      // If host is bot, run turn (unlikely, but safe)
      if (state.players[state.playerOrder[0]].isBot) {
        runBotTurn();
      }
    },

    rollDice: () => {
      const state = get();
      if (state.isRolling || state.activeAction !== "roll") return;

      playSound("dice");
      set({ isRolling: true });

      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      const total = d1 + d2;
      const isDouble = d1 === d2;
      const roll: DiceRoll = { d1, d2, total, isDouble };

      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];

      addLogEntry(`${player.name} rolled ${d1} & ${d2} (Total: ${total})`, "roll", pid);

      // Animation delay
      setTimeout(async () => {
        set({ lastDiceRoll: roll, isRolling: false });
        const currentPos = player.position;

        // Check if player is in Thana
        if (player.isInThana) {
          if (isDouble) {
            // Escapes!
            set((s) => ({
              players: {
                ...s.players,
                [pid]: { ...s.players[pid], isInThana: false, thanaTurns: 0 },
              },
            }));
            addLogEntry(`${player.name} rolled doubles and escaped Thana!`, "success", pid);
            // Move player
            const targetPos = (currentPos + total) % 40;
            await get().movePlayer(pid, targetPos);
          } else {
            // Remains stuck
            const newTurns = player.thanaTurns + 1;
            set((s) => ({
              players: {
                ...s.players,
                [pid]: { ...s.players[pid], thanaTurns: newTurns },
              },
            }));
            addLogEntry(`${player.name} failed to roll doubles in Thana. (Attempt ${newTurns}/3)`, "warning", pid);
            if (newTurns >= 3) {
              // Forced payout
              addLogEntry(`${player.name} completed 3 turns in Thana. Fined ₹500.`, "danger", pid);
              const deduct = Math.max(0, player.money - 500);
              set((s) => ({
                players: {
                  ...s.players,
                  [pid]: { ...s.players[pid], money: deduct, isInThana: false, thanaTurns: 0 },
                },
                activeAction: "resolved",
              }));
            } else {
              set({ activeAction: "resolved" });
            }
          }
        } else {
          // Normal movement
          const targetPos = (currentPos + total) % 40;
          await get().movePlayer(pid, targetPos);
        }
      }, 2000);
    },

    movePlayer: async (playerId, targetPos, animate = true) => {
      const startPos = get().players[playerId].position;
      const totalSteps = (targetPos - startPos + 40) % 40;

      if (animate && totalSteps > 0) {
        let current = startPos;
        for (let i = 0; i < totalSteps; i++) {
          current = (current + 1) % 40;
          playSound("move");

          // Salary check on passing Start (tile 0)
          if (current === 0) {
            playSound("buy");
            const salary = get().settings.salaryOnStart;
            set((s) => ({
              players: {
                ...s.players,
                [playerId]: { ...s.players[playerId], money: s.players[playerId].money + salary },
              },
            }));
            addLogEntry(`${get().players[playerId].name} passed Start. Collected ₹${salary}!`, "success", playerId);
          }

          // Visual intermediate position update
          set((s) => ({
            players: {
              ...s.players,
              [playerId]: { ...s.players[playerId], position: current },
            },
          }));

          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } else {
        // Direct jump
        set((s) => ({
          players: {
            ...s.players,
            [playerId]: { ...s.players[playerId], position: targetPos },
          },
        }));
      }

      // Landing tile resolution
      const state = get();
      const finalTile = BOARD_TILES[targetPos];
      const player = state.players[playerId];

      if (finalTile.type === "property" || finalTile.type === "rail" || finalTile.type === "utility") {
        const prop = state.properties[targetPos];
        if (!prop.ownerId) {
          // Unowned
          set({ activeAction: "buy_or_pass" });
        } else if (prop.ownerId === playerId) {
          // Self owned, chill
          set({ activeAction: "resolved" });
        } else {
          // Pay rent
          set({ activeAction: "pay_rent" });
        }
      } else if (finalTile.type === "event") {
        set({ activeAction: "draw_card" });
      } else if (finalTile.type === "tax") {
        playSound("rent");
        const taxCost = finalTile.cost ?? 0;
        const newMoney = player.money - taxCost;
        set((s) => ({
          players: {
            ...s.players,
            [playerId]: { ...s.players[playerId], money: newMoney },
          },
          activeAction: newMoney < 0 ? "bankrupt_confirm" : "resolved",
        }));
        addLogEntry(`${player.name} landed on ${finalTile.name}. Paid tax of ₹${taxCost}.`, "danger", playerId);
      } else if (finalTile.type === "go_to_jail") {
        playSound("thana");
        set((s) => ({
          players: {
            ...s.players,
            [playerId]: { ...s.players[playerId], position: 10, isInThana: true, thanaTurns: 0 },
          },
          activeAction: "resolved",
        }));
        addLogEntry(`${player.name} was caught by GZB Police! Sent to Thana Checkpoint.`, "danger", playerId);
      } else {
        // Start or Free parking or Visit Thana
        set({ activeAction: "resolved" });
      }

      // Auto resolve if bot turn continues
      const updatedState = get();
      if (updatedState.players[playerId].isBot) {
        runBotTurn();
      }
    },

    buyProperty: () => {
      playSound("buy");
      const state = get();
      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];
      const tileId = player.position;
      const tile = BOARD_TILES[tileId];

      if (!tile.price) return;

      const newMoney = player.money - tile.price;
      const updatedProperties = { ...state.properties };
      updatedProperties[tileId] = {
        ...updatedProperties[tileId],
        ownerId: pid,
      };

      set((s) => ({
        players: {
          ...s.players,
          [pid]: {
            ...s.players[pid],
            money: newMoney,
            ownedPropertyIds: [...s.players[pid].ownedPropertyIds, tileId],
          },
        },
        properties: updatedProperties,
        activeAction: "resolved",
      }));

      addLogEntry(`${player.name} bought ${tile.name} for ₹${tile.price}.`, "success", pid);

      // Bot turn follow up
      if (get().players[pid].isBot) {
        runBotTurn();
      }
    },

    skipProperty: () => {
      playSound("click");
      const pid = get().currentTurnPlayerId!;
      const tileId = get().players[pid].position;
      const tile = BOARD_TILES[tileId];

      set({ activeAction: "resolved" });
      addLogEntry(`${get().players[pid].name} passed on buying ${tile.name}.`, "info", pid);

      // Bot turn follow up
      if (get().players[pid].isBot) {
        runBotTurn();
      }
    },

    upgradeProperty: (tileId) => {
      const state = get();
      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];
      const prop = state.properties[tileId];
      const tile = BOARD_TILES[tileId];

      if (!prop || prop.ownerId !== pid || prop.upgradeLevel >= 4 || !tile.price) {
        return false;
      }

      // Upgrade cost is half of original property price
      const cost = Math.floor(tile.price / 2);
      if (player.money < cost) {
        return false;
      }

      playSound("buy");
      const updatedProperties = { ...state.properties };
      const nextLvl = (prop.upgradeLevel + 1) as 1 | 2 | 3 | 4;
      updatedProperties[tileId] = {
        ...updatedProperties[tileId],
        upgradeLevel: nextLvl,
      };

      set((s) => ({
        players: {
          ...s.players,
          [pid]: {
            ...s.players[pid],
            money: s.players[pid].money - cost,
          },
        },
        properties: updatedProperties,
      }));

      const upgrades = ["Plot", "Chai Stall", "Builder Floor", "Society Tower", "Mall Complex"];
      addLogEntry(`${player.name} upgraded ${tile.name} to a ${upgrades[nextLvl]} (Spent ₹${cost}).`, "success", pid);
      return true;
    },

    payRent: () => {
      playSound("rent");
      const state = get();
      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];
      const tileId = player.position;
      const tile = BOARD_TILES[tileId];
      const prop = state.properties[tileId];
      const ownerId = prop.ownerId!;
      const owner = state.players[ownerId];

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
        const rollTotal = state.lastDiceRoll?.total ?? 7;
        rentAmount = rollTotal * (ownedUtils === 2 ? 250 : 100);
      } else if (tile.type === "property" && tile.baseRent) {
        let base = tile.baseRent;
        // Check group monopoly (double rent if they own all in group)
        const groupColor = tile.group!;
        const groupTiles = BOARD_TILES.filter((t) => t.group === groupColor).map((t) => t.id);
        const ownsAll = groupTiles.every((tid) => owner.ownedPropertyIds.includes(tid));

        if (ownsAll && prop.upgradeLevel === 0) {
          base = base * 2;
        }

        // Multiplier based on upgrades
        const multiplier = [1, 2.5, 5.5, 8, 12][prop.upgradeLevel];
        rentAmount = Math.floor(base * multiplier);
      }

      // Apply Power Cut rule (utility double rents)
      if (state.powerCutRounds > 0 && tile.type === "utility") {
        rentAmount *= 2;
      }

      // Adjust transfer
      const playerCash = player.money;
      const actualPaid = Math.min(playerCash, rentAmount);

      set((s) => ({
        players: {
          ...s.players,
          [pid]: { ...s.players[pid], money: playerCash - actualPaid },
          [ownerId]: { ...s.players[ownerId], money: s.players[ownerId].money + actualPaid },
        },
        activeAction: playerCash - rentAmount < 0 ? "bankrupt_confirm" : "resolved",
      }));

      addLogEntry(`${player.name} paid ₹${actualPaid} rent to ${owner.name} at ${tile.name}.`, "danger", pid);

      // Bot turn follow up
      if (get().players[pid].isBot) {
        runBotTurn();
      }
    },

    drawCard: (deckType) => {
      playSound("card");
      const state = get();
      const pid = state.currentTurnPlayerId!;

      let deck: CardDefinition[] = [];
      if (deckType === "traffic") deck = TRAFFIC_CARDS;
      else if (deckType === "society") deck = SOCIETY_CARDS;
      else deck = CHANCE_CARDS;

      const randomCard = deck[Math.floor(Math.random() * deck.length)];

      set({
        drawnCard: { ...randomCard, deckType },
      });

      addLogEntry(`${state.players[pid].name} drawn card: "${randomCard.title}"`, "info", pid);
    },

    closeCardModal: () => {
      const state = get();
      const card = state.drawnCard;
      if (!card) return;

      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];

      // Execute card action
      const result = card.action(state, pid);
      addLogEntry(result.message, result.cashChange && result.cashChange > 0 ? "success" : "info", pid);

      let finalPos = player.position;
      let inThana = player.isInThana;
      let inventoryCards = [...player.cards];
      let newMoney = player.money;

      if (result.cashChange) {
        newMoney += result.cashChange;
      }
      if (result.movePosition !== undefined) {
        finalPos = result.movePosition;
      }
      if (result.goToThana) {
        finalPos = 10;
        inThana = true;
      }
      if (result.keepJugaadPass) {
        inventoryCards.push({ id: card.id, title: card.title });
      }

      set((s) => ({
        players: {
          ...s.players,
          [pid]: {
            ...s.players[pid],
            money: Math.max(0, newMoney),
            position: finalPos,
            isInThana: inThana,
            cards: inventoryCards,
          },
        },
        drawnCard: null,
        activeAction: newMoney < 0 ? "bankrupt_confirm" : "resolved",
      }));

      // If card made us move, trigger action there
      if (result.movePosition !== undefined) {
        get().movePlayer(pid, result.movePosition, false); // Instant warp to resolve target
      } else {
        if (get().players[pid].isBot) {
          runBotTurn();
        }
      }
    },

    resolveJailAction: (actionType) => {
      playSound("click");
      const state = get();
      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];

      if (actionType === "pay") {
        playSound("buy");
        const newMoney = Math.max(0, player.money - 500);
        set((s) => ({
          players: {
            ...s.players,
            [pid]: { ...s.players[pid], money: newMoney, isInThana: false, thanaTurns: 0 },
          },
          activeAction: "roll",
        }));
        addLogEntry(`${player.name} paid ₹500 bail fee and is free.`, "success", pid);
      } else if (actionType === "pass") {
        // Jugaad Pass
        const newCards = player.cards.filter((c) => c.id !== "s8");
        set((s) => ({
          players: {
            ...s.players,
            [pid]: { ...s.players[pid], cards: newCards, isInThana: false, thanaTurns: 0 },
          },
          activeAction: "roll",
        }));
        addLogEntry(`${player.name} used Jugaad Pass: "Papa Vidhayak Hain" to leave Thana!`, "success", pid);
      } else {
        // Roll for double
        set({ activeAction: "roll" });
        get().rollDice();
      }
    },

    endTurn: () => {
      playSound("click");
      const state = get();
      const pid = state.currentTurnPlayerId!;
      const player = state.players[pid];

      // Handle final bankrupt confirmation if cash is negative
      if (player.money < 0) {
        // Player is Bankrupt!
        addLogEntry(`${player.name} went bankrupt and was financially destroyed by Ghaziabad real estate!`, "danger", pid);
        playSound("thana");

        const updatedPlayers = { ...state.players };
        updatedPlayers[pid] = { ...player, isBankrupt: true, money: 0 };

        // Return properties to bank
        const updatedProperties = { ...state.properties };
        player.ownedPropertyIds.forEach((tid) => {
          updatedProperties[tid] = {
            tileId: tid,
            ownerId: null,
            upgradeLevel: 0,
            isMortgaged: false,
          };
        });

        set({
          players: updatedPlayers,
          properties: updatedProperties,
        });
      }

      // Check if game is over
      get().checkWinner();

      // Find next player
      const nextState = get();
      if (nextState.phase === "ended") return;

      const order = nextState.playerOrder;
      const idx = order.indexOf(pid);
      let nextIdx = (idx + 1) % order.length;

      // Skip bankrupt players
      while (nextState.players[order[nextIdx]].isBankrupt && nextIdx !== idx) {
        nextIdx = (nextIdx + 1) % order.length;
      }

      const nextPlayerId = order[nextIdx];
      const nextPlayer = nextState.players[nextPlayerId];

      // Decrement power cut duration
      let pCut = nextState.powerCutRounds;
      if (nextIdx === 0 && pCut > 0) {
        pCut -= 1;
        if (pCut === 0) {
          addLogEntry("Electricity restored! Board lights are back to normal.", "info");
        }
      }

      set({
        currentTurnPlayerId: nextPlayerId,
        turnNumber: nextState.turnNumber + 1,
        activeAction: nextPlayer.isInThana ? "thana_choice" : "roll",
        lastDiceRoll: null,
        powerCutRounds: pCut,
      });

      addLogEntry(`It is ${nextPlayer.name}'s turn.`, "info", nextPlayerId);

      // Triggers bot action if bot
      if (nextPlayer.isBot) {
        runBotTurn();
      }
    },

    sendReaction: (playerId, emoji) => {
      const p = get().players[playerId];
      if (!p) return;
      addLogEntry(`${p.name} reacted: ${emoji}`, "chat", playerId);
      // Confetti splash for fun reactions
      if (emoji === "🔥" || emoji === "🤑") {
        confetti({
          particleCount: 30,
          spread: 40,
          origin: { y: 0.6 },
        });
      }
    },

    sendChat: (playerId, text) => {
      const p = get().players[playerId];
      if (!p) return;
      addLogEntry(`${p.name}: "${text}"`, "chat", playerId);
    },

    checkWinner: () => {
      const state = get();
      const activePlayers = Object.values(state.players).filter((p) => !p.isBankrupt);

      // Last player standing wins
      if (activePlayers.length === 1 && Object.keys(state.players).length > 1) {
        const winner = activePlayers[0];
        set({ phase: "ended", winnerId: winner.id, timerActive: false });
        addLogEntry(`🎉 Game Over! ${winner.name} is the ultimate Ghaziabad Tycoon!`, "success", winner.id);
        confetti({ particleCount: 150, spread: 80 });
      }

      // Check duration timer
      if (state.timeLeft <= 0 && state.phase === "playing") {
        // Find highest Net Worth
        // Net Worth = cash + properties purchase value + upgrade value (half original property price per upgrade)
        let maxNetWorth = -99999;
        let winnerId = "";

        Object.values(state.players).forEach((p) => {
          if (p.isBankrupt) return;

          let netWorth = p.money;
          p.ownedPropertyIds.forEach((tid) => {
            const tile = BOARD_TILES[tid];
            const prop = state.properties[tid];
            if (tile.price) {
              netWorth += tile.price; // Property cost
              netWorth += prop.upgradeLevel * Math.floor(tile.price / 2); // Upgrade cost
            }
          });

          if (netWorth > maxNetWorth) {
            maxNetWorth = netWorth;
            winnerId = p.id;
          }
        });

        const winner = state.players[winnerId];
        set({ phase: "ended", winnerId, timerActive: false });
        addLogEntry(`⏰ Time limit reached! ${winner.name} won by highest Net Worth of ₹${maxNetWorth}!`, "success", winnerId);
        confetti({ particleCount: 150, spread: 80 });
      }
    },

    tickTimer: () => {
      const state = get();
      if (!state.timerActive || state.phase !== "playing") return;

      const newTime = Math.max(0, state.timeLeft - 1);
      set({ timeLeft: newTime });

      if (newTime <= 0) {
        get().checkWinner();
      }
    },
  };
});
