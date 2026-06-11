export type TileType =
  | "start"
  | "property"
  | "rail"
  | "utility"
  | "event"
  | "tax"
  | "jail"
  | "go_to_jail"
  | "free_parking";

export interface BoardTile {
  id: number;
  name: string;
  shortName: string;
  type: TileType;
  group?: "brown" | "lightblue" | "pink" | "orange" | "red" | "yellow" | "green" | "darkblue" | "transit" | "utility";
  price?: number;
  baseRent?: number;
  localFlavor?: string;
  cost?: number; // for tax tiles
}

export interface Card {
  id: string;
  title: string;
  description: string;
  deck: "traffic" | "society" | "chance";
  effect: (gameState: any, activePlayerId: string) => {
    msg: string;
    patch: any; // partial game state update or instructions
  };
}

export const BOARD_TILES: BoardTile[] = [
  {
    id: 0,
    name: "Ghaziabad Junction Start",
    shortName: "GZB Jn. Start",
    type: "start",
    localFlavor: "Collect ₹2000 salary when passing",
  },
  {
    id: 1,
    name: "Loni Border",
    shortName: "Loni Border",
    type: "property",
    group: "brown",
    price: 600,
    baseRent: 80,
    localFlavor: "Cheap but chaotic border zone",
  },
  {
    id: 2,
    name: "Chai Pe Charcha",
    shortName: "Chai Charcha",
    type: "event",
    localFlavor: "Draw a Society/RWA card",
  },
  {
    id: 3,
    name: "Sahibabad Industrial Area",
    shortName: "Sahibabad Ind.",
    type: "property",
    group: "brown",
    price: 600,
    baseRent: 80,
    localFlavor: "Factory-land energy and heavy machinery",
  },
  {
    id: 4,
    name: "Nagar Nigam Notice",
    shortName: "Nagar Nigam",
    type: "tax",
    cost: 200,
    localFlavor: "Pending house tax penalty. Pay ₹200.",
  },
  {
    id: 5,
    name: "Shaheed Sthal Metro",
    shortName: "Shaheed Sthal",
    type: "rail",
    group: "transit",
    price: 2000,
    baseRent: 250,
    localFlavor: "End of the Red Line metro transit",
  },
  {
    id: 6,
    name: "Mohan Nagar",
    shortName: "Mohan Nagar",
    type: "property",
    group: "lightblue",
    price: 1000,
    baseRent: 120,
    localFlavor: "Massive flyover construction & traffic crossroad chaos",
  },
  {
    id: 7,
    name: "Traffic Jam Card",
    shortName: "Traffic Jam",
    type: "event",
    localFlavor: "Draw a Traffic event card",
  },
  {
    id: 8,
    name: "Vasundhara",
    shortName: "Vasundhara",
    type: "property",
    group: "lightblue",
    price: 1000,
    baseRent: 120,
    localFlavor: "Peaceful residential society flex",
  },
  {
    id: 9,
    name: "Vaishali",
    shortName: "Vaishali",
    type: "property",
    group: "lightblue",
    price: 1200,
    baseRent: 150,
    localFlavor: "Premium apartments next to the metro station",
  },
  {
    id: 10,
    name: "Thana Checkpoint",
    shortName: "Thana Check",
    type: "jail",
    localFlavor: "Just Visiting / Locked Up in Thana",
  },
  {
    id: 11,
    name: "Indirapuram",
    shortName: "Indirapuram",
    type: "property",
    group: "pink",
    price: 1400,
    baseRent: 180,
    localFlavor: "High-density high-rises and crowded malls",
  },
  {
    id: 12,
    name: "Bijli Board",
    shortName: "Bijli Board",
    type: "utility",
    group: "utility",
    price: 1500,
    localFlavor: "Frequent load-shedding and sudden bills",
  },
  {
    id: 13,
    name: "Shipra Mall",
    shortName: "Shipra Mall",
    type: "property",
    group: "pink",
    price: 1400,
    baseRent: 180,
    localFlavor: "Classic hangout spot with expensive parking",
  },
  {
    id: 14,
    name: "Ahinsa Khand",
    shortName: "Ahinsa Khand",
    type: "property",
    group: "pink",
    price: 1600,
    baseRent: 200,
    localFlavor: "Luxury apartments surrounded by water tankers",
  },
  {
    id: 15,
    name: "Ghaziabad Railway Station",
    shortName: "GZB Station",
    type: "rail",
    group: "transit",
    price: 2000,
    baseRent: 250,
    localFlavor: "Hub for long-route express trains",
  },
  {
    id: 16,
    name: "Raj Nagar Extension",
    shortName: "RNE Extension",
    type: "property",
    group: "orange",
    price: 1800,
    baseRent: 220,
    localFlavor: "Distant societies but affordable builder floors",
  },
  {
    id: 17,
    name: "Shaadi Season Card",
    shortName: "Shaadi Card",
    type: "event",
    localFlavor: "Draw an NCR Chance card",
  },
  {
    id: 18,
    name: "Kavi Nagar",
    shortName: "Kavi Nagar",
    type: "property",
    group: "orange",
    price: 1800,
    baseRent: 220,
    localFlavor: "Posh old-school bungalows and wide roads",
  },
  {
    id: 19,
    name: "Shastri Nagar",
    shortName: "Shastri Nagar",
    type: "property",
    group: "orange",
    price: 2000,
    baseRent: 250,
    localFlavor: "Family colony vibe with active RWA uncles",
  },
  {
    id: 20,
    name: "City Forest Park",
    shortName: "City Forest",
    type: "free_parking",
    localFlavor: "Chill and relax for one turn. No rent here.",
  },
  {
    id: 21,
    name: "Crossings Republik",
    shortName: "Crossings Rep.",
    type: "property",
    group: "red",
    price: 2200,
    baseRent: 280,
    localFlavor: "Massive township with eternal traffic crawls",
  },
  {
    id: 22,
    name: "Hapur Chungi Jam",
    shortName: "Hapur Chungi",
    type: "event",
    localFlavor: "Draw a Traffic event card",
  },
  {
    id: 23,
    name: "Siddharth Vihar",
    shortName: "Siddharth Vihr",
    type: "property",
    group: "red",
    price: 2200,
    baseRent: 280,
    localFlavor: "Upcoming residential zone near the highway",
  },
  {
    id: 24,
    name: "Pratap Vihar",
    shortName: "Pratap Vihar",
    type: "property",
    group: "red",
    price: 2400,
    baseRent: 300,
    localFlavor: "Ganga water pipeline supply territory",
  },
  {
    id: 25,
    name: "Delhi-Meerut RRTS",
    shortName: "RRTS RapidX",
    type: "rail",
    group: "transit",
    price: 2000,
    baseRent: 250,
    localFlavor: "Ultra-fast transit connecting NCR",
  },
  {
    id: 26,
    name: "Kaushambi",
    shortName: "Kaushambi",
    type: "property",
    group: "yellow",
    price: 2600,
    baseRent: 320,
    localFlavor: "Delhi border premium apartments",
  },
  {
    id: 27,
    name: "Chander Nagar",
    shortName: "Chander Nagar",
    type: "property",
    group: "yellow",
    price: 2600,
    baseRent: 320,
    localFlavor: "Quiet posh residential blocks",
  },
  {
    id: 28,
    name: "Water Tanker",
    shortName: "Water Tanker",
    type: "utility",
    group: "utility",
    price: 1500,
    localFlavor: "Crucial supply during society maintenance drama",
  },
  {
    id: 29,
    name: "Surya Nagar",
    shortName: "Surya Nagar",
    type: "property",
    group: "yellow",
    price: 2800,
    baseRent: 350,
    localFlavor: "Premium locality close to East Delhi",
  },
  {
    id: 30,
    name: "Go To Thana",
    shortName: "Go To Thana",
    type: "go_to_jail",
    localFlavor: "Caught violating traffic rules. Go straight to Thana.",
  },
  {
    id: 31,
    name: "Modinagar",
    shortName: "Modinagar",
    type: "property",
    group: "green",
    price: 3000,
    baseRent: 380,
    localFlavor: "Sugar mill town, far away but heavy value",
  },
  {
    id: 32,
    name: "Muradnagar",
    shortName: "Muradnagar",
    type: "property",
    group: "green",
    price: 3000,
    baseRent: 380,
    localFlavor: "Canal side, famous for engineering colleges",
  },
  {
    id: 33,
    name: "RWA Drama Card",
    shortName: "RWA Drama",
    type: "event",
    localFlavor: "Draw a Society/RWA card",
  },
  {
    id: 34,
    name: "Dasna",
    shortName: "Dasna",
    type: "property",
    group: "green",
    price: 3200,
    baseRent: 400,
    localFlavor: "Expressway toll plaza exit zone",
  },
  {
    id: 35,
    name: "Delhi-Meerut Expressway",
    shortName: "Expressway",
    type: "rail",
    group: "transit",
    price: 2000,
    baseRent: 250,
    localFlavor: "14 lanes of speed and cameras",
  },
  {
    id: 36,
    name: "NCR Chance Card",
    shortName: "NCR Chance",
    type: "event",
    localFlavor: "Draw an NCR Chance card",
  },
  {
    id: 37,
    name: "RDC Raj Nagar",
    shortName: "RDC Raj Nagar",
    type: "property",
    group: "darkblue",
    price: 3500,
    baseRent: 450,
    localFlavor: "Commercial core, cafes, and business hubs",
  },
  {
    id: 38,
    name: "Mall Parking Fine",
    shortName: "Parking Fine",
    type: "tax",
    cost: 1000,
    localFlavor: "Charged ₹1000 for parking in a no-parking zone.",
  },
  {
    id: 39,
    name: "Govindpuram",
    shortName: "Govindpuram",
    type: "property",
    group: "darkblue",
    price: 4000,
    baseRent: 500,
    localFlavor: "Highly priced residential plots on Hapur Road",
  },
];

export const COLOR_GROUPS: Record<string, string> = {
  brown: "#795548",
  lightblue: "#03A9F4",
  pink: "#E91E63",
  orange: "#FF9800",
  red: "#F44336",
  yellow: "#FFEB3B",
  green: "#4CAF50",
  darkblue: "#3F51B5",
  transit: "#607D8B",
  utility: "#009688",
};

export const COLOR_GROUP_NAMES: Record<string, string> = {
  brown: "Loni & Sahibabad Border",
  lightblue: "Mohan Nagar & Vaishali",
  pink: "Indirapuram Area",
  orange: "Kavi & Shastri Nagar",
  red: "Vihars & Crossings",
  yellow: "Kaushambi & Border Premium",
  green: "Modi/Muradnagar Highway",
  darkblue: "Premium Business Hubs",
  transit: "NCR Transit Network",
  utility: "Society Utilities",
};

export interface CardDefinition {
  id: string;
  title: string;
  description: string;
  effectText: string;
  action: (state: any, playerId: string) => {
    message: string;
    cashChange?: number;
    movePosition?: number;
    goToThana?: boolean;
    skipTurn?: boolean;
    keepJugaadPass?: boolean;
  };
}

export const TRAFFIC_CARDS: CardDefinition[] = [
  {
    id: "t1",
    title: "Hapur Chungi Jam",
    description: "Stuck behind a water tanker and three e-rickshaws at Hapur Chungi intersection.",
    effectText: "Pay ₹700 bribe/shortcut fee or get stuck (lose cash or skip next turn).",
    action: (state, pid) => {
      const p = state.players[pid];
      if (p.money >= 700) {
        return { message: "Paid ₹700 for a shortcut through narrow lanes.", cashChange: -700 };
      } else {
        return { message: "No cash! Stuck in traffic. Skip next turn.", skipTurn: true };
      }
    },
  },
  {
    id: "t2",
    title: "CISF Road Block",
    description: "CISF checking at Indirapuram. Diverted through dirty side lanes.",
    effectText: "Move back 3 spaces.",
    action: (state, pid) => {
      const currentPos = state.players[pid].position;
      const targetPos = (currentPos - 3 + 40) % 40;
      return { message: "Diverted. Moved back 3 spaces.", movePosition: targetPos };
    },
  },
  {
    id: "t3",
    title: "Expressway Miracle",
    description: "Traffic is absolutely clear on the Delhi-Meerut Expressway!",
    effectText: "Advance straight to Delhi-Meerut Expressway (Tile 35).",
    action: (state, pid) => {
      return { message: "Cruised down the expressway. Advanced to Tile 35.", movePosition: 35 };
    },
  },
  {
    id: "t4",
    title: "Wrong Cut Taken",
    description: "Took a wrong turn on the NH9 flyover. Gotta loop back.",
    effectText: "Move back to the previous transit tile.",
    action: (state, pid) => {
      const currentPos = state.players[pid].position;
      const transitTiles = [5, 15, 25, 35];
      let prevTransit = 35;
      for (let i = transitTiles.length - 1; i >= 0; i--) {
        if (transitTiles[i] < currentPos) {
          prevTransit = transitTiles[i];
          break;
        }
      }
      return { message: "Took a wrong turn. Looped back to nearest transit.", movePosition: prevTransit };
    },
  },
  {
    id: "t5",
    title: "Auto Bhaiya Shortcut",
    description: "Auto driver drives on the wrong side of the road with supreme confidence.",
    effectText: "Pay ₹300, move forward 5 spaces.",
    action: (state, pid) => {
      const currentPos = state.players[pid].position;
      return { message: "Paid ₹300 and flew 5 spaces forward on the wrong side!", cashChange: -300, movePosition: (currentPos + 5) % 40 };
    },
  },
  {
    id: "t6",
    title: "Baraat Roadblock",
    description: "A massive wedding procession blocks the entire double road in Vasundhara.",
    effectText: "Skip movement next round.",
    action: (state, pid) => {
      return { message: "Stuck watching a random uncle dance. Skip next turn.", skipTurn: true };
    },
  },
  {
    id: "t7",
    title: "Police Checking",
    description: "Traffic police stops you for checking black film on windows.",
    effectText: "Pay ₹400 fine unless you have a Jugaad Pass.",
    action: (state, pid) => {
      const p = state.players[pid];
      const hasPass = p.cards && p.cards.some((c: any) => c.id === "s8");
      if (hasPass) {
        return { message: "Showed Jugaad Pass: 'Papa Vidhayak Hain'. Police let you go." };
      }
      return { message: "No connections! Paid ₹400 fine.", cashChange: -400 };
    },
  },
];

export const SOCIETY_CARDS: CardDefinition[] = [
  {
    id: "s1",
    title: "RWA Maintenance Due",
    description: "RWA calls an emergency meeting about lift generator fuel costs.",
    effectText: "Pay ₹200 for every property you own.",
    action: (state, pid) => {
      const p = state.players[pid];
      const count = p.ownedPropertyIds.length;
      const totalCost = count * 200;
      return { message: `RWA maintenance fee: ₹200 x ${count} properties = ₹${totalCost}`, cashChange: -totalCost };
    },
  },
  {
    id: "s2",
    title: "Lift Bandh",
    description: "The society lift breaks down. You had to carry groceries to the 14th floor.",
    effectText: "Physically exhausted. Lose ₹300 on knee pain ointment.",
    action: (state, pid) => {
      return { message: "Lost ₹300 to knee doctor fees.", cashChange: -300 };
    },
  },
  {
    id: "s3",
    title: "Uncle Complaint",
    description: "RWA uncle complains you parked your scooty in his spot.",
    effectText: "Pay ₹500 if you own any upgraded properties, otherwise collect ₹100.",
    action: (state, pid) => {
      const p = state.players[pid];
      let hasUpgrades = false;
      p.ownedPropertyIds.forEach((tid: number) => {
        const prop = state.properties[tid];
        if (prop && prop.upgradeLevel > 0) hasUpgrades = true;
      });
      if (hasUpgrades) {
        return { message: "Fined ₹500 for RWA dispute.", cashChange: -500 };
      } else {
        return { message: "You don't own upgraded spots! Uncles apologize. Collect ₹100.", cashChange: 100 };
      }
    },
  },
  {
    id: "s4",
    title: "Diwali Decoration Fund",
    description: "RWA enforces a mandatory decoration collection for society gates.",
    effectText: "Pay ₹250 per color group you have properties in.",
    action: (state, pid) => {
      const p = state.players[pid];
      const groups = new Set<string>();
      p.ownedPropertyIds.forEach((tid: number) => {
        const tile = BOARD_TILES.find(t => t.id === tid);
        if (tile && tile.group) groups.add(tile.group);
      });
      const cost = groups.size * 250;
      return { message: `Diwali fee: ₹250 x ${groups.size} groups = ₹${cost}`, cashChange: -cost };
    },
  },
  {
    id: "s5",
    title: "Stray Dog Friendship",
    description: "You feed biscuits to the local society dogs. They guard your car.",
    effectText: "Collect ₹300 safety bonus.",
    action: (state, pid) => {
      return { message: "Society dogs happy. Collect ₹300 reward.", cashChange: 300 };
    },
  },
  {
    id: "s6",
    title: "Society Cricket Win",
    description: "You hit a six off the RWA president's ball and win the colony cup.",
    effectText: "Collect ₹500 cash prize.",
    action: (state, pid) => {
      return { message: "Won the colony cricket tournament! Collect ₹500.", cashChange: 500 };
    },
  },
  {
    id: "s7",
    title: "Parking Fight",
    description: "A classic street-side parking dispute blocks the road. Swear words are exchanged.",
    effectText: "Select a player. Both pay ₹300 settlement fee.",
    action: (state, pid) => {
      // Find another player who is not bankrupt
      const otherPlayers = Object.keys(state.players).filter(id => id !== pid && !state.players[id].isBankrupt);
      if (otherPlayers.length > 0) {
        const targetId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const targetName = state.players[targetId].name;
        // Apply changes directly to other player
        state.players[targetId].money = Math.max(0, state.players[targetId].money - 300);
        return { message: `Parking argument with ${targetName}! Both pay ₹300.`, cashChange: -300 };
      }
      return { message: "No one else to fight. Paid ₹300 towing fee.", cashChange: -300 };
    },
  },
  {
    id: "s8",
    title: "Jugaad Pass",
    description: "You got a sticker that says 'PAPA VIDHAYAK HAIN' (My dad is an MLA).",
    effectText: "Keep this card. Use it to escape Thana or avoid Police Checking fines.",
    action: (state, pid) => {
      return { message: "Acquired Jugaad Pass! Keep it in your inventory.", keepJugaadPass: true };
    },
  },
];

export const CHANCE_CARDS: CardDefinition[] = [
  {
    id: "c1",
    title: "Startup Exit",
    description: "Your tech startup in Noida Sector 62 got acquired by a Gurugram firm.",
    effectText: "Collect ₹2000 cash reward.",
    action: (state, pid) => {
      return { message: "Acquisition successful! Collect ₹2000.", cashChange: 2000 };
    },
  },
  {
    id: "c2",
    title: "Gurgaon Friend Paid You Back",
    description: "A friend from Gurgaon finally returns the cash they borrowed last year.",
    effectText: "Collect ₹1000 cash.",
    action: (state, pid) => {
      return { message: "Cash returned. Collect ₹1000.", cashChange: 1000 };
    },
  },
  {
    id: "c3",
    title: "Noida Sector 62 Interview",
    description: "Got an urgent interview call at a multinational software giant.",
    effectText: "Move directly to Kaushambi (Tile 26) on the way to Noida.",
    action: (state, pid) => {
      return { message: "Heading to Kaushambi border.", movePosition: 26 };
    },
  },
  {
    id: "c4",
    title: "Delhi Plan Cancelled",
    description: "Your friends cancelled the Connaught Place plan at the last minute.",
    effectText: "Go back to Start (Tile 0) to sit at home.",
    action: (state, pid) => {
      return { message: "Plan cancelled. Back to Ghaziabad Junction Start.", movePosition: 0 };
    },
  },
  {
    id: "c5",
    title: "Metro Card Recharge",
    description: "Metro card balance ran out while changing at Yamuna Bank.",
    effectText: "Pay ₹300 recharge fee.",
    action: (state, pid) => {
      return { message: "Recharged card. Paid ₹300.", cashChange: -300 };
    },
  },
  {
    id: "c6",
    title: "Property Rate Boom",
    description: "GDA announces new flyover linking your area. Land prices skyrocket.",
    effectText: "Collect ₹500 for every property you own.",
    action: (state, pid) => {
      const p = state.players[pid];
      const count = p.ownedPropertyIds.length;
      const profit = count * 500;
      return { message: `Land rates boomed! Collect ₹500 x ${count} properties = ₹${profit}`, cashChange: profit };
    },
  },
  {
    id: "c7",
    title: "Builder Delay",
    description: "Builder delays the construction of your flats in Raj Nagar Extension.",
    effectText: "Pay ₹500 in court filings and legal papers.",
    action: (state, pid) => {
      return { message: "Builder floor delay. Paid ₹500 legal fees.", cashChange: -500 };
    },
  },
  {
    id: "c8",
    title: "Family Function",
    description: "It is your cousin's wedding in Kavi Nagar. Shagun distribution time.",
    effectText: "Pay ₹200 to every player.",
    action: (state, pid) => {
      const activePlayers = Object.keys(state.players).filter(id => id !== pid && !state.players[id].isBankrupt);
      let totalPaid = 0;
      activePlayers.forEach((opid) => {
        state.players[opid].money += 200;
        totalPaid += 200;
      });
      return { message: `Paid ₹200 shagun to ${activePlayers.length} active players.`, cashChange: -totalPaid };
    },
  },
];
