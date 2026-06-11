import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore, Player, PropertyState } from "./useGameStore";
import { BOARD_TILES, COLOR_GROUPS, BoardTile } from "./board.config";
import { getTileLayout, getTokenPosition, getBuildingPosition } from "./tilePositions";

// --- CAMERA MANAGER ---
// Smoothly pans and zooms the camera to the active player's token or keeps a full board view
const CameraManager = ({ activePlayerId }: { activePlayerId: string | null }) => {
  const { camera } = useThree();
  const players = useGameStore((s) => s.players);
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    const activePlayer = activePlayerId ? players[activePlayerId] : null;

    if (activePlayer && !activePlayer.isBankrupt) {
      // Zoom to active player token
      const layout = getTileLayout(activePlayer.position);
      const [tx, ty, tz] = layout.position;
      targetLookAt.current.set(tx, ty, tz);

      // Lerp camera target
      currentLookAt.current.lerp(targetLookAt.current, 0.05);
      camera.lookAt(currentLookAt.current);

      // Lerp camera position closer to the token for detailed turn view
      const targetPos = new THREE.Vector3(tx - 3, 5, tz + 4);
      camera.position.lerp(targetPos, 0.03);
    } else {
      // Default isometric board view
      targetLookAt.current.set(0, 0, 0);
      currentLookAt.current.lerp(targetLookAt.current, 0.05);
      camera.lookAt(currentLookAt.current);

      const defaultCamPos = new THREE.Vector3(-8, 12, 12);
      camera.position.lerp(defaultCamPos, 0.03);
    }
  });

  return null;
};

// --- DUST/SMOKE PARTICLES FOR MOVEMENT ---
const ParticleDust = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Points>(null);
  const particleCount = 15;

  const [positions] = useState(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 1] = Math.random() * 0.3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return arr;
  });

  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const posAttr = geo.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      let y = posAttr.getY(i);
      y += 0.01;
      if (y > 0.4) {
        y = 0;
        posAttr.setX(i, (Math.random() - 0.5) * 0.4);
        posAttr.setZ(i, (Math.random() - 0.5) * 0.4);
      }
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#FFF" transparent opacity={0.6} />
    </points>
  );
};

// --- DICE MESH COMPONENT ---
const DiceMesh = ({
  position,
  val,
  isRolling,
}: {
  position: [number, number, number];
  val: number;
  isRolling: boolean;
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));

  // Determine standard Euler angle mapping for dice faces
  useEffect(() => {
    let rx = 0;
    let ry = 0;
    let rz = 0;

    switch (val) {
      case 1:
        rx = 0; rz = 0; break; // Up (+Y)
      case 6:
        rx = Math.PI; rz = 0; break; // Down (-Y)
      case 2:
        rx = -Math.PI / 2; rz = 0; break; // Front (+Z)
      case 5:
        rx = Math.PI / 2; rz = 0; break; // Back (-Z)
      case 3:
        rx = 0; rz = -Math.PI / 2; break; // Right (+X)
      case 4:
        rx = 0; rz = Math.PI / 2; break; // Left (-X)
    }
    targetRotation.current.set(rx, ry, rz);
  }, [val]);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (isRolling) {
      // Spin wildly
      meshRef.current.rotation.x += 0.25;
      meshRef.current.rotation.y += 0.15;
      meshRef.current.rotation.z += 0.2;
      // Hover up and down
      meshRef.current.position.y = 1.0 + Math.sin(state.clock.getElapsedTime() * 15) * 0.3;
    } else {
      // Smoothly snap to target face rotation
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.current.x, 0.1);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.current.y, 0.1);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.current.z, 0.1);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0.3, 0.1);
    }
  });

  return (
    <group ref={meshRef} position={position} castShadow receiveShadow>
      {/* Red Die Cube */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#E53935" roughness={0.1} metalness={0.1} />
      </mesh>

      {/* Dice Pips (White Dots) on faces */}
      {/* Face 1 (Top, +Y) */}
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* Face 6 (Bottom, -Y) */}
      <group>
        <mesh position={[-0.12, -0.26, -0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[-0.12, -0.26, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[-0.12, -0.26, 0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.12, -0.26, -0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.12, -0.26, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.12, -0.26, 0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>

      {/* Face 2 (Front, +Z) */}
      <group>
        <mesh position={[-0.1, 0.1, 0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.1, -0.1, 0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>

      {/* Face 5 (Back, -Z) */}
      <group>
        <mesh position={[-0.12, 0.12, -0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.12, -0.12, -0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[-0.12, -0.12, -0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.12, 0.12, -0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0, 0, -0.26]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>

      {/* Face 3 (Right, +X) */}
      <group>
        <mesh position={[0.26, -0.1, -0.1]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.26, 0, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.26, 0.1, 0.1]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>

      {/* Face 4 (Left, -X) */}
      <group>
        <mesh position={[-0.26, -0.12, -0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[-0.26, 0.12, -0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[-0.26, -0.12, 0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[-0.26, 0.12, 0.12]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>
    </group>
  );
};

// --- BUILDING MESH COMPONENT ---
// Renders buildings corresponding to property upgrade levels (1 = Chai Stall, 2 = Builder Floor, 3 = Society Tower, 4 = Mall Complex)
const BuildingMesh = ({
  tileId,
  upgradeLevel,
  ownerColor,
}: {
  tileId: number;
  upgradeLevel: number;
  ownerColor?: string;
}) => {
  const pos = getBuildingPosition(tileId);

  if (upgradeLevel === 0) return null;

  const matColor = ownerColor || "#ECEFF1";

  return (
    <group position={pos}>
      {upgradeLevel === 1 && (
        // Chai Stall: A tiny shop canopy
        <group>
          <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
            <boxGeometry args={[0.25, 0.1, 0.25]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
          <mesh castShadow position={[0, 0.12, 0]}>
            <coneGeometry args={[0.15, 0.08, 4]} />
            <meshStandardMaterial color="#FFEB3B" /> {/* Yellow roof */}
          </mesh>
        </group>
      )}

      {upgradeLevel === 2 && (
        // Builder Floor: Stacked brick apartments (2 floors)
        <group>
          <mesh castShadow position={[0, 0.1, 0]}>
            <boxGeometry args={[0.22, 0.2, 0.22]} />
            <meshStandardMaterial color={matColor} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0, 0.21, 0]}>
            <boxGeometry args={[0.24, 0.02, 0.24]} />
            <meshStandardMaterial color="#455A64" />
          </mesh>
        </group>
      )}

      {upgradeLevel === 3 && (
        // Society Tower: Tall thin tower block
        <group>
          <mesh castShadow position={[0, 0.25, 0]}>
            <boxGeometry args={[0.2, 0.5, 0.2]} />
            <meshStandardMaterial color={matColor} roughness={0.4} />
          </mesh>
          {/* Blue glass window strips */}
          <mesh position={[0, 0.25, 0.105]}>
            <boxGeometry args={[0.08, 0.4, 0.005]} />
            <meshBasicMaterial color="#00E5FF" />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <coneGeometry args={[0.08, 0.15, 4]} />
            <meshStandardMaterial color="#37474F" />
          </mesh>
        </group>
      )}

      {upgradeLevel === 4 && (
        // Mall Complex: Shiny gold commercial complex
        <group>
          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.35]} />
            <meshStandardMaterial color="#FFD54F" metalness={0.7} roughness={0.2} />
          </mesh>
          {/* Spire */}
          <mesh castShadow position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
            <meshStandardMaterial color="#FFB300" metalness={0.9} />
          </mesh>
          {/* Red banner decoration */}
          <mesh position={[0, 0.25, 0.18]}>
            <boxGeometry args={[0.12, 0.2, 0.01]} />
            <meshBasicMaterial color="#E53935" />
          </mesh>
        </group>
      )}
    </group>
  );
};

// --- PLAYER TOKEN COMPONENT ---
const PlayerTokenMesh = ({
  player,
  index,
  total,
}: {
  player: Player;
  index: number;
  total: number;
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = getTokenPosition(player.position, index, total);
  const prevPosition = useRef<[number, number, number]>([targetPos[0], targetPos[1], targetPos[2]]);
  const [isMoving, setIsMoving] = useState(false);

  // Animate token movement updates smoothly
  useFrame(() => {
    if (!meshRef.current) return;
    const currentPos = meshRef.current.position;

    // Calculate distance to target
    const dx = targetPos[0] - currentPos.x;
    const dz = targetPos[2] - currentPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      setIsMoving(true);
      // Smoothly lerp towards target position
      currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetPos[0], 0.2);
      currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetPos[2], 0.2);

      // Create a hopping/bouncing motion while moving
      currentPos.y = targetPos[1] + Math.abs(Math.sin(Date.now() * 0.015)) * 0.4;
    } else {
      setIsMoving(false);
      currentPos.x = targetPos[0];
      currentPos.z = targetPos[2];
      currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetPos[1], 0.2);
    }
  });

  return (
    <group ref={meshRef} position={prevPosition.current} castShadow>
      {/* Styled Low-poly Token primitives based on type */}
      {player.tokenId === "auto" && (
        // Green/yellow auto-rickshaw
        <group scale={[0.6, 0.6, 0.6]} rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.2, 0.5]} />
            <meshStandardMaterial color="#4CAF50" /> {/* Green body */}
          </mesh>
          <mesh castShadow position={[0, 0.18, 0]}>
            <boxGeometry args={[0.26, 0.16, 0.4]} />
            <meshStandardMaterial color="#FFEB3B" /> {/* Yellow roof */}
          </mesh>
          {/* Black wheels */}
          <mesh position={[0.15, -0.1, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
          <mesh position={[-0.15, -0.1, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
          <mesh position={[0, -0.1, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
        </group>
      )}

      {player.tokenId === "metrocard" && (
        // Floating blue Metro Card
        <mesh scale={[0.5, 0.5, 0.5]} rotation={[Math.PI / 6, Math.PI / 4, 0]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.35]} />
          <meshStandardMaterial color="#0288D1" roughness={0.2} metalness={0.5} />
        </mesh>
      )}

      {player.tokenId === "chaicup" && (
        // Brown clay cup / Kulhad Chai
        <group scale={[0.6, 0.6, 0.6]}>
          <mesh castShadow position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.18, 0.12, 0.25, 12]} />
            <meshStandardMaterial color="#A1887F" roughness={0.9} />
          </mesh>
          {/* Chai Tea inside */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.02, 12]} />
            <meshBasicMaterial color="#D7CCC8" />
          </mesh>
        </group>
      )}

      {player.tokenId === "helmet" && (
        // Yellow safety helmet
        <group scale={[0.55, 0.55, 0.55]}>
          <mesh castShadow position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#FFEB3B" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.01, 16]} />
            <meshStandardMaterial color="#FFD54F" />
          </mesh>
        </group>
      )}

      {player.tokenId === "cone" && (
        // Orange traffic cone
        <group scale={[0.5, 0.5, 0.5]}>
          <mesh castShadow position={[0, 0.01, 0]}>
            <boxGeometry args={[0.3, 0.03, 0.3]} />
            <meshStandardMaterial color="#FF5722" />
          </mesh>
          <mesh castShadow position={[0, 0.18, 0]}>
            <coneGeometry args={[0.12, 0.35, 12]} />
            <meshStandardMaterial color="#FF5722" />
          </mesh>
          {/* White reflective strip */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.08, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {player.tokenId === "dog" && (
        // Cute low-poly puppy
        <group scale={[0.45, 0.45, 0.45]} position={[0, 0.1, 0]}>
          {/* Body */}
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.35, 8]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
          {/* Head */}
          <mesh castShadow position={[0, 0.15, 0.15]}>
            <boxGeometry args={[0.15, 0.15, 0.18]} />
            <meshStandardMaterial color="#7D5F54" />
          </mesh>
          {/* Legs */}
          <mesh position={[0.08, -0.15, 0.1]}><cylinderGeometry args={[0.03, 0.03, 0.15, 6]} /><meshStandardMaterial color="#8D6E63" /></mesh>
          <mesh position={[-0.08, -0.15, 0.1]}><cylinderGeometry args={[0.03, 0.03, 0.15, 6]} /><meshStandardMaterial color="#8D6E63" /></mesh>
          <mesh position={[0.08, -0.15, -0.1]}><cylinderGeometry args={[0.03, 0.03, 0.15, 6]} /><meshStandardMaterial color="#8D6E63" /></mesh>
          <mesh position={[-0.08, -0.15, -0.1]}><cylinderGeometry args={[0.03, 0.03, 0.15, 6]} /><meshStandardMaterial color="#8D6E63" /></mesh>
        </group>
      )}

      {/* Halo indicator if it is this player's active turn */}
      {useGameStore((s) => s.currentTurnPlayerId) === player.id && (
        <group position={[0, 0.6, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.28, 16]} />
            <meshBasicMaterial color={player.color} side={THREE.DoubleSide} />
          </mesh>
          {/* Small point light directly on active player */}
          <pointLight color={player.color} intensity={0.5} distance={1.5} />
        </group>
      )}

      {/* Dust particles while hopping */}
      {isMoving && <ParticleDust position={[0, -0.1, 0]} />}
    </group>
  );
};

// --- SINGLE BOARD TILE MESH ---
const TileMesh = ({
  tile,
  propState,
  ownerColor,
}: {
  tile: BoardTile;
  propState?: PropertyState;
  ownerColor?: string;
}) => {
  const layout = getTileLayout(tile.id);
  const color = tile.group ? COLOR_GROUPS[tile.group] : "#ECEFF1";

  // Different base colors based on tile type for aesthetics
  let tileBaseColor = "#FFF9C4"; // Start/Corners
  if (tile.type === "property") tileBaseColor = "#FAFAFA";
  else if (tile.type === "rail") tileBaseColor = "#ECEFF1";
  else if (tile.type === "utility") tileBaseColor = "#ECEFF1";
  else if (tile.type === "event") tileBaseColor = "#E0F7FA";
  else if (tile.type === "tax") tileBaseColor = "#FFEBEE";

  const isCorner = tile.type === "start" || tile.type === "jail" || tile.type === "go_to_jail" || tile.type === "free_parking";

  return (
    <group position={layout.position} rotation={layout.rotation}>
      {/* Base block geometry for the tile */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={layout.size} />
        <meshStandardMaterial color={tileBaseColor} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Decorative colored strip for properties */}
      {tile.type === "property" && tile.group && (
        <mesh position={[0, 0.13, -0.5]} castShadow>
          <boxGeometry args={[1.3, 0.02, 0.3]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
      )}

      {/* Colored strip for Transit (Metro) tiles */}
      {tile.type === "rail" && (
        <mesh position={[0, 0.13, -0.5]}>
          <boxGeometry args={[1.3, 0.02, 0.2]} />
          <meshStandardMaterial color="#607D8B" roughness={0.5} />
        </mesh>
      )}

      {/* Colored strip for Utilities */}
      {tile.type === "utility" && (
        <mesh position={[0, 0.13, -0.5]}>
          <boxGeometry args={[1.3, 0.02, 0.2]} />
          <meshStandardMaterial color="#009688" roughness={0.5} />
        </mesh>
      )}

      {/* Visual ownership indicator ring on property base if owned */}
      {propState?.ownerId && ownerColor && (
        <mesh position={[0, 0.13, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.15, 8]} />
          <meshBasicMaterial color={ownerColor} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Text label rendered on the top face */}
      <Text
        position={[0, 0.14, isCorner ? 0 : 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={isCorner ? 0.14 : 0.12}
        color="#212121"
        maxWidth={1.1}
        textAlign="center"
        font="https://fonts.gstatic.com/s/outfit/v11/0oWpQpNs3Uq5y8mOcV05q1I.woff" // Outfit modern font
      >
        {tile.shortName}
      </Text>

      {/* Price tag for purchasable tiles */}
      {tile.price && !propState?.ownerId && (
        <Text
          position={[0, 0.14, 0.48]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.08}
          color="#388E3C"
          font="https://fonts.gstatic.com/s/outfit/v11/0oWpQpNs3Uq5y8mOcV05q1I.woff"
        >
          ₹{tile.price}
        </Text>
      )}

      {/* Visual Props on corners/event tiles for premium diorama look */}
      {tile.type === "start" && (
        <mesh position={[0, 0.2, 0]} rotation={[0, Date.now() * 0.001, 0]}>
          <coneGeometry args={[0.15, 0.3, 5]} />
          <meshStandardMaterial color="#FFD54F" metalness={0.5} />
        </mesh>
      )}

      {tile.type === "jail" && (
        // Police bars decoration
        <group position={[0, 0.2, 0]} scale={[0.5, 0.5, 0.5]}>
          <mesh><boxGeometry args={[0.4, 0.3, 0.05]} /><meshStandardMaterial color="#455A64" /></mesh>
          <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.4]} /><meshStandardMaterial color="#37474F" /></mesh>
          <mesh position={[-0.1, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.3]} /><meshStandardMaterial color="#78909C" /></mesh>
          <mesh position={[0.1, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.3]} /><meshStandardMaterial color="#78909C" /></mesh>
        </group>
      )}

      {tile.type === "free_parking" && (
        // Tiny green tree model
        <group position={[0, 0.15, 0]} scale={[0.4, 0.4, 0.4]}>
          <mesh castShadow><cylinderGeometry args={[0.06, 0.08, 0.3]} /><meshStandardMaterial color="#795548" /></mesh>
          <mesh castShadow position={[0, 0.25, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#4CAF50" roughness={0.8} /></mesh>
        </group>
      )}

      {tile.type === "event" && (
        // Question mark icon
        <Text
          position={[0, 0.22, 0]}
          fontSize={0.3}
          color="#00BCD4"
          fontWeight="bold"
        >
          ?
        </Text>
      )}
    </group>
  );
};

// --- CUSTOM STAR GEOMETRY FOR START TILE ---
// Handcrafted star helper since Three star isn't built-in
const Star = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh castShadow>
        <coneGeometry args={[0.15, 0.3, 5]} />
        <meshStandardMaterial color="#FFEB3B" roughness={0.2} metalness={0.6} />
      </mesh>
    </group>
  );
};

// --- THE GAME 3D CANVAS BOARD ---
export const GameCanvas = () => {
  const players = useGameStore((s) => s.players);
  const properties = useGameStore((s) => s.properties);
  const lastDiceRoll = useGameStore((s) => s.lastDiceRoll);
  const isRolling = useGameStore((s) => s.isRolling);
  const currentTurnPlayerId = useGameStore((s) => s.currentTurnPlayerId);
  const powerCutRounds = useGameStore((s) => s.powerCutRounds);

  const activePlayers = Object.values(players).filter((p) => !p.isBankrupt);

  // Power cut visual effect: Dim standard lights, enable flickers
  const lightIntensity = powerCutRounds > 0 ? 0.15 : 0.85;
  const ambientIntensity = powerCutRounds > 0 ? 0.05 : 0.45;

  return (
    <div className="w-full h-full relative" style={{ minHeight: "450px" }}>
      <Canvas
        shadows
        camera={{ position: [-8, 12, 12], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={powerCutRounds > 0 ? ["#0B0E14"] : ["#181c26"]} />

        {/* Ambient global lighting */}
        <ambientLight intensity={ambientIntensity} color={powerCutRounds > 0 ? "#283593" : "#FFFFFF"} />

        {/* Directional Sunlight with shadows */}
        <directionalLight
          castShadow
          position={[-6, 12, 6]}
          intensity={lightIntensity}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* Flickering society light for Power Cut */}
        {powerCutRounds > 0 && (
          <FlickerLight />
        )}

        {/* The 40 Board Tiles */}
        <group>
          {BOARD_TILES.map((tile) => {
            const propState = properties[tile.id];
            const ownerColor = propState?.ownerId ? players[propState.ownerId]?.color : undefined;
            return (
              <TileMesh
                key={tile.id}
                tile={tile}
                propState={propState}
                ownerColor={ownerColor}
              />
            );
          })}
        </group>

        {/* Property Upgrades/Buildings */}
        <group>
          {Object.entries(properties).map(([tileIdStr, prop]) => {
            const tileId = parseInt(tileIdStr);
            const ownerColor = prop.ownerId ? players[prop.ownerId]?.color : undefined;
            return (
              <BuildingMesh
                key={tileId}
                tileId={tileId}
                upgradeLevel={prop.upgradeLevel}
                ownerColor={ownerColor}
              />
            );
          })}
        </group>

        {/* Player Tokens */}
        <group>
          {activePlayers.map((player, idx) => (
            <PlayerTokenMesh
              key={player.id}
              player={player}
              index={idx}
              total={activePlayers.length}
            />
          ))}
        </group>

        {/* Oversized 3D Dice in Center Board */}
        <group position={[0, 0, 0]}>
          <DiceMesh
            position={[-0.5, 0.3, 0]}
            val={lastDiceRoll?.d1 ?? 1}
            isRolling={isRolling}
          />
          <DiceMesh
            position={[0.5, 0.3, 0.2]}
            val={lastDiceRoll?.d2 ?? 1}
            isRolling={isRolling}
          />
          {/* Inner board center decors - green felt texture simulation */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
            <planeGeometry args={[11, 11]} />
            <meshStandardMaterial color="#004D40" roughness={0.9} />
          </mesh>
          <Text
            position={[0, 0.065, -2.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="#FFD54F"
            fontWeight="bold"
            letterSpacing={0.15}
            font="https://fonts.gstatic.com/s/outfit/v11/0oWpQpNs3Uq5y8mOcV05q1I.woff"
          >
            GHAZIABAD TYCOON
          </Text>
          <Text
            position={[0, 0.065, -1.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.18}
            color="#E0F2F1"
            fillOpacity={0.8}
            font="https://fonts.gstatic.com/s/outfit/v11/0oWpQpNs3Uq5y8mOcV05q1I.woff"
          >
            ★ Private Club Edition ★
          </Text>

          {/* Miniature Traffic Jam Decor: Tiny cars stuck in the middle for humor */}
          <group position={[1.5, 0.1, 2]} rotation={[0, -Math.PI / 3, 0]}>
            {/* Auto rickshaw */}
            <mesh position={[-0.2, 0, 0]}>
              <boxGeometry args={[0.12, 0.08, 0.18]} />
              <meshStandardMaterial color="#FFEB3B" />
            </mesh>
            <mesh position={[0.1, 0, 0.1]}>
              <boxGeometry args={[0.15, 0.08, 0.2]} />
              <meshStandardMaterial color="#D32F2F" />
            </mesh>
            <mesh position={[0.2, 0, -0.1]}>
              <boxGeometry args={[0.1, 0.08, 0.15]} />
              <meshStandardMaterial color="#0288D1" />
            </mesh>
            <Text position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.12} color="#FFF">
              TRAFFIC
            </Text>
          </group>
        </group>

        {/* Orbit Camera controls for player exploration */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.1} // Prevent going below board floor
          minDistance={4}
          maxDistance={22}
        />

        {/* Smooth camera management (follows active turn player) */}
        <CameraManager activePlayerId={currentTurnPlayerId} />
      </Canvas>

      {/* Floating Canvas controls overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <div className="bg-slate-900/80 backdrop-blur border border-white/10 text-xs px-2.5 py-1.5 rounded-lg text-slate-300 pointer-events-none select-none flex items-center gap-1.5 shadow-lg shadow-black/25">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Drag to Orbit • Scroll to Zoom
        </div>
      </div>
    </div>
  );
};

// --- FLICKERING LIGHT FOR POWER CUT EFFECT ---
const FlickerLight = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!lightRef.current) return;
    const time = state.clock.getElapsedTime();
    // Complex noise function for random flickering
    const flicker = Math.sin(time * 30) * Math.cos(time * 12) * Math.sin(time * 3);
    lightRef.current.intensity = flicker > 0.4 ? 1.2 : flicker > 0.1 ? 0.7 : 0.1;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 3, 0]}
      color="#FFE082"
      distance={8}
      intensity={0.5}
    />
  );
};
