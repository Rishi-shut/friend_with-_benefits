
export interface TileLayout {
  position: [number, number, number];
  rotation: [number, number, number]; // [X, Y, Z] in radians
  size: [number, number, number];     // [width, height, depth]
}

export const getTileLayout = (id: number): TileLayout => {
  const step = 1.5; // spacing between tiles
  const offset = 7.5; // distance from center to corners

  let x = 0;
  let z = 0;
  let rotY = 0;
  let size: [number, number, number] = [1.3, 0.25, 1.3];

  if (id === 0) {
    // Start (Bottom-Left Corner)
    x = -offset;
    z = offset;
    rotY = Math.PI / 4; // Face diagonally
    size = [1.4, 0.3, 1.4];
  } else if (id > 0 && id < 10) {
    // Left Edge (going up towards Thana)
    x = -offset;
    z = offset - id * step;
    rotY = Math.PI / 2; // Face right
  } else if (id === 10) {
    // Thana Checkpoint (Top-Left Corner)
    x = -offset;
    z = -offset;
    rotY = -Math.PI / 4;
    size = [1.4, 0.3, 1.4];
  } else if (id > 10 && id < 20) {
    // Top Edge (going right towards City Forest)
    x = -offset + (id - 10) * step;
    z = -offset;
    rotY = Math.PI; // Face down
  } else if (id === 20) {
    // City Forest Park (Top-Right Corner)
    x = offset;
    z = -offset;
    rotY = -Math.PI / 4 - Math.PI / 2;
    size = [1.4, 0.3, 1.4];
  } else if (id > 20 && id < 30) {
    // Right Edge (going down towards Go To Thana)
    x = offset;
    z = -offset + (id - 20) * step;
    rotY = -Math.PI / 2; // Face left
  } else if (id === 30) {
    // Go To Thana (Bottom-Right Corner)
    x = offset;
    z = offset;
    rotY = Math.PI / 4 + Math.PI / 2;
    size = [1.4, 0.3, 1.4];
  } else {
    // Bottom Edge (going left back to Start)
    x = offset - (id - 30) * step;
    z = offset;
    rotY = 0; // Face up
  }

  return {
    position: [x, 0, z],
    rotation: [0, rotY, 0],
    size,
  };
};

/**
 * Calculates a slightly offset position for a player token on a tile
 * to prevent overlapping when multiple player tokens land on the same tile.
 */
export const getTokenPosition = (
  tileId: number,
  playerIndex: number,
  totalPlayers: number
): [number, number, number] => {
  const layout = getTileLayout(tileId);
  const [tx, ty, tz] = layout.position;

  if (totalPlayers <= 1) {
    return [tx, ty + 0.2, tz];
  }

  // Place players in a small circle/grid around the tile center
  const angle = (playerIndex / totalPlayers) * Math.PI * 2;
  const radius = 0.35; // offset distance from center
  const ox = Math.cos(angle) * radius;
  const oz = Math.sin(angle) * radius;

  return [tx + ox, ty + 0.2, tz + oz];
};

/**
 * Calculates building position on a tile.
 * Properties get buildings (Chai stalls, towers etc.) on their outer edge.
 */
export const getBuildingPosition = (tileId: number): [number, number, number] => {
  const layout = getTileLayout(tileId);
  const [tx, ty, tz] = layout.position;
  const offset = 0.45; // move buildings to the edge of the tile

  if (tileId > 0 && tileId < 10) {
    // Left edge properties: put buildings on the left (-X)
    return [tx - offset, ty + 0.15, tz];
  } else if (tileId > 10 && tileId < 20) {
    // Top edge properties: put buildings on top (-Z)
    return [tx, ty + 0.15, tz - offset];
  } else if (tileId > 20 && tileId < 30) {
    // Right edge properties: put buildings on right (+X)
    return [tx + offset, ty + 0.15, tz];
  } else if (tileId > 30 && tileId < 40) {
    // Bottom edge properties: put buildings on bottom (+Z)
    return [tx, ty + 0.15, tz + offset];
  }

  return [tx, ty + 0.15, tz]; // Default center
};
