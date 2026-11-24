export type WorldId = 'jungle' | 'desert' | 'frozen' | 'sunken' | 'celestial';

export type EquipmentId =
  | 'shield'
  | 'grappling'
  | 'boots'
  | 'oxygen'
  | 'compass'
  | 'teleport';

export type CosmeticCategory = 'outfit' | 'hat' | 'backpack' | 'accessory';

export type UniqueMechanic =
  | 'rope_swing'
  | 'sandstorm'
  | 'ice_slide'
  | 'underwater_oxygen'
  | 'gravity_flip';

export type ScreenName =
  | 'menu'
  | 'playing'
  | 'worlds'
  | 'shop'
  | 'map'
  | 'customize'
  | 'missions'
  | 'final_chamber'
  | 'settings';

export interface WorldConfig {
  id: WorldId;
  order: number;
  name: string;
  subtitle: string;
  fragmentName: string;
  fragmentColor: string;
  accentHex: string;
  referenceImage: string;
  targetDistance: number;
  escapeStartDistance: number;
  baseSpeed: number;
  maxSpeed: number;
  uniqueMechanic: UniqueMechanic;
  mechanicLabel: string;
  mechanicDescription: string;
  escapeTitle: string;
  escapeDescription: string;
  storyIntro: string;
  storyComplete: string;
  rivalTaunt: string;
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  hemiSkyColor: string;
  hemiGroundColor: string;
  trackColor: string;
  trackTrimColor: string;
}

export interface EquipmentItem {
  id: EquipmentId;
  name: string;
  description: string;
  basePrice: number;
  upgradeCostBase: number;
  maxLevel: number;
  cooldownSec: number;
  durationSec: number;
  accentColor: string;
  effectSummary: (level: number) => string;
}

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  priceCoins: number;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export type MissionMetric =
  | 'coins'
  | 'distance'
  | 'obstacles_dodged'
  | 'clues'
  | 'escapes_completed'
  | 'fragments';

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  rewardScore: number;
  rewardCoins: number;
  rewardCredits: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCredits: number;
  rewardScore: number;
}

export interface EquippedCosmetics {
  outfit: string;
  hat: string;
  backpack: string;
  accessory: string;
}

export interface GameSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  performanceMode: boolean;
}

export interface SaveData {
  version: number;
  totalScore: number;
  goldCoins: number;
  ancientCredits: number;
  unlockedWorlds: WorldId[];
  collectedFragments: WorldId[];
  worldBestScores: Record<WorldId, number>;
  worldBestDistances: Record<WorldId, number>;
  worldCluesFound: Record<WorldId, number>;
  ownedEquipment: Partial<Record<EquipmentId, number>>;
  equippedEquipment: EquipmentId[];
  ownedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
  missionProgress: Record<string, number>;
  claimedMissions: string[];
  unlockedAchievements: string[];
  totalRuns: number;
  totalDistance: number;
  totalCoinsEver: number;
  totalObstaclesDodged: number;
  totalEscapesCompleted: number;
  finalChamberUnlocked: boolean;
  finalChamberCompleted: boolean;
  settings: GameSettings;
}

export interface ActiveAbilityHud {
  id: EquipmentId;
  name: string;
  activeRemaining: number;
  cooldownRemaining: number;
  durationTotal: number;
  ready: boolean;
}

export interface RunHudState {
  worldId: WorldId;
  runScore: number;
  coins: number;
  gems: number;
  distance: number;
  targetDistance: number;
  speed: number;
  oxygen: number;
  maxOxygen: number;
  gravityInverted: boolean;
  inEscapeSequence: boolean;
  escapeProgress: number;
  inSecretRoom: boolean;
  secretRoomRemaining: number;
  shieldActive: boolean;
  bootsActive: boolean;
  compassActive: boolean;
  onIce: boolean;
  inSandstorm: boolean;
  onRope: boolean;
  checkpointReached: boolean;
  cluesThisRun: number;
  obstaclesDodged: number;
  bannerText: string | null;
  bannerTone: 'info' | 'warning' | 'rival' | 'treasure';
  abilities: ActiveAbilityHud[];
}

export interface RunEndSummary {
  worldId: WorldId;
  victory: boolean;
  causeOfFailure: string;
  runScore: number;
  bonusScore: number;
  totalScoreEarned: number;
  coinsCollected: number;
  gemsCollected: number;
  cluesFound: number;
  creditsEarned: number;
  distanceTravelled: number;
  obstaclesDodged: number;
  checkpointReached: boolean;
  canUseTeleportCrystal: boolean;
  canUseAncientCredits: boolean;
  newlyUnlockedFragment: boolean;
  newlyUnlockedWorld: WorldId | null;
  newlyUnlockedAchievements: string[];
}
