import { ACHIEVEMENTS_LIST, COSMETICS_LIST, EQUIPMENT_MAP, MISSIONS_LIST } from '../data/catalog';
import { WORLDS, WORLD_MAP } from '../data/worlds';
import {
  CosmeticCategory,
  EquipmentId,
  RunEndSummary,
  SaveData,
  WorldId,
} from '../types/game';

const STORAGE_KEY = 'five_realms_lost_legacy_save_v1';

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    totalScore: 0,
    goldCoins: 0,
    ancientCredits: 2,
    unlockedWorlds: ['jungle'],
    collectedFragments: [],
    worldBestScores: {
      jungle: 0,
      desert: 0,
      frozen: 0,
      sunken: 0,
      celestial: 0,
    },
    worldBestDistances: {
      jungle: 0,
      desert: 0,
      frozen: 0,
      sunken: 0,
      celestial: 0,
    },
    worldCluesFound: {
      jungle: 0,
      desert: 0,
      frozen: 0,
      sunken: 0,
      celestial: 0,
    },
    ownedEquipment: {},
    equippedEquipment: [],
    ownedCosmetics: ['outfit_classic', 'hat_fedora', 'pack_canvas', 'acc_none'],
    equippedCosmetics: {
      outfit: 'outfit_classic',
      hat: 'hat_fedora',
      backpack: 'pack_canvas',
      accessory: 'acc_none',
    },
    missionProgress: {},
    claimedMissions: [],
    unlockedAchievements: [],
    totalRuns: 0,
    totalDistance: 0,
    totalCoinsEver: 0,
    totalObstaclesDodged: 0,
    totalEscapesCompleted: 0,
    finalChamberUnlocked: false,
    finalChamberCompleted: false,
    settings: {
      musicEnabled: true,
      sfxEnabled: true,
      musicVolume: 0.45,
      sfxVolume: 0.7,
      performanceMode: false,
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = createDefaultSave();
    return {
      ...defaults,
      ...parsed,
      worldBestScores: { ...defaults.worldBestScores, ...(parsed.worldBestScores ?? {}) },
      worldBestDistances: { ...defaults.worldBestDistances, ...(parsed.worldBestDistances ?? {}) },
      worldCluesFound: { ...defaults.worldCluesFound, ...(parsed.worldCluesFound ?? {}) },
      equippedCosmetics: { ...defaults.equippedCosmetics, ...(parsed.equippedCosmetics ?? {}) },
      settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return createDefaultSave();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetSaveData(): SaveData {
  const fresh = createDefaultSave();
  persistSaveData(fresh);
  return fresh;
}

export function getEquipmentCost(id: EquipmentId, currentLevel: number): number {
  const def = EQUIPMENT_MAP[id];
  if (currentLevel <= 0) return def.basePrice;
  return def.upgradeCostBase + (currentLevel - 1) * 90;
}

export function purchaseOrUpgradeEquipment(
  save: SaveData,
  id: EquipmentId
): { ok: boolean; save: SaveData; message: string } {
  const def = EQUIPMENT_MAP[id];
  const currentLevel = save.ownedEquipment[id] ?? 0;
  if (currentLevel >= def.maxLevel) {
    return { ok: false, save, message: `${def.name} is already at max level.` };
  }
  const cost = getEquipmentCost(id, currentLevel);
  if (save.totalScore < cost) {
    return { ok: false, save, message: `Need ${cost - save.totalScore} more Score Points.` };
  }
  const nextLevel = currentLevel + 1;
  const equipped = save.equippedEquipment.includes(id)
    ? save.equippedEquipment
    : save.equippedEquipment.length < 3
      ? [...save.equippedEquipment, id]
      : save.equippedEquipment;

  const updated: SaveData = {
    ...save,
    totalScore: save.totalScore - cost,
    ownedEquipment: { ...save.ownedEquipment, [id]: nextLevel },
    equippedEquipment: equipped,
  };
  persistSaveData(updated);
  return {
    ok: true,
    save: updated,
    message:
      currentLevel === 0
        ? `Purchased ${def.name} and equipped it!`
        : `Upgraded ${def.name} to Level ${nextLevel}!`,
  };
}

export function toggleEquipItem(save: SaveData, id: EquipmentId): { save: SaveData; message: string } {
  if (!save.ownedEquipment[id]) {
    return { save, message: 'Purchase this equipment first.' };
  }
  const isEquipped = save.equippedEquipment.includes(id);
  if (isEquipped) {
    const updated = {
      ...save,
      equippedEquipment: save.equippedEquipment.filter((e) => e !== id),
    };
    persistSaveData(updated);
    return { save: updated, message: `${EQUIPMENT_MAP[id].name} unequipped.` };
  }
  const nextEquipped =
    save.equippedEquipment.length >= 3
      ? [...save.equippedEquipment.slice(1), id]
      : [...save.equippedEquipment, id];
  const updated = {
    ...save,
    equippedEquipment: nextEquipped,
  };
  persistSaveData(updated);
  return { save: updated, message: `${EQUIPMENT_MAP[id].name} equipped (up to 3 active slots).` };
}

export function purchaseOrEquipCosmetic(
  save: SaveData,
  cosmeticId: string
): { ok: boolean; save: SaveData; message: string } {
  const item = COSMETICS_LIST.find((c) => c.id === cosmeticId);
  if (!item) return { ok: false, save, message: 'Cosmetic item not found.' };

  const owned = save.ownedCosmetics.includes(cosmeticId);
  let nextSave = save;

  if (!owned) {
    if (save.goldCoins < item.priceCoins) {
      return {
        ok: false,
        save,
        message: `Need ${item.priceCoins - save.goldCoins} more Gold Coins.`,
      };
    }
    nextSave = {
      ...save,
      goldCoins: save.goldCoins - item.priceCoins,
      ownedCosmetics: [...save.ownedCosmetics, cosmeticId],
    };
  }

  const categoryKey: CosmeticCategory = item.category;
  const updated: SaveData = {
    ...nextSave,
    equippedCosmetics: {
      ...nextSave.equippedCosmetics,
      [categoryKey]: cosmeticId,
    },
  };
  persistSaveData(updated);
  return {
    ok: true,
    save: updated,
    message: owned ? `Equipped ${item.name}.` : `Unlocked & equipped ${item.name}!`,
  };
}

export function claimMissionReward(
  save: SaveData,
  missionId: string
): { ok: boolean; save: SaveData; message: string } {
  const mission = MISSIONS_LIST.find((m) => m.id === missionId);
  if (!mission) return { ok: false, save, message: 'Mission not found.' };
  if (save.claimedMissions.includes(missionId)) {
    return { ok: false, save, message: 'Mission reward already claimed.' };
  }
  const progress = getMissionProgressValue(save, mission.metric);
  if (progress < mission.target) {
    return { ok: false, save, message: 'Mission objective not yet complete.' };
  }

  const updated: SaveData = {
    ...save,
    totalScore: save.totalScore + mission.rewardScore,
    goldCoins: save.goldCoins + mission.rewardCoins,
    ancientCredits: save.ancientCredits + mission.rewardCredits,
    claimedMissions: [...save.claimedMissions, missionId],
  };
  persistSaveData(updated);
  return {
    ok: true,
    save: updated,
    message: `Claimed +${mission.rewardScore} Score, +${mission.rewardCoins} Coins, +${mission.rewardCredits} Credits!`,
  };
}

export function getMissionProgressValue(save: SaveData, metric: string): number {
  switch (metric) {
    case 'coins':
      return save.totalCoinsEver;
    case 'distance':
      return Math.floor(save.totalDistance);
    case 'obstacles_dodged':
      return save.totalObstaclesDodged;
    case 'clues':
      return Object.values(save.worldCluesFound).reduce((a, b) => a + b, 0);
    case 'escapes_completed':
      return save.totalEscapesCompleted;
    case 'fragments':
      return save.collectedFragments.length;
    default:
      return 0;
  }
}

export function recordRunCompletion(
  save: SaveData,
  summary: Omit<
    RunEndSummary,
    'newlyUnlockedFragment' | 'newlyUnlockedWorld' | 'newlyUnlockedAchievements'
  >
): { save: SaveData; fullSummary: RunEndSummary } {
  const world = WORLD_MAP[summary.worldId];
  let collectedFragments = [...save.collectedFragments];
  let unlockedWorlds = [...save.unlockedWorlds];
  let newlyUnlockedFragment = false;
  let newlyUnlockedWorld: WorldId | null = null;
  let creditsEarned = summary.creditsEarned;

  if (summary.victory && !collectedFragments.includes(summary.worldId)) {
    collectedFragments.push(summary.worldId);
    newlyUnlockedFragment = true;
    creditsEarned += 2;

    const nextOrder = world.order + 1;
    const nextWorld = WORLDS.find((w) => w.order === nextOrder);
    if (nextWorld && !unlockedWorlds.includes(nextWorld.id)) {
      unlockedWorlds.push(nextWorld.id);
      newlyUnlockedWorld = nextWorld.id;
    }
  }

  const finalChamberUnlocked = collectedFragments.length >= 5 || save.finalChamberUnlocked;

  let nextSave: SaveData = {
    ...save,
    totalScore: save.totalScore + summary.totalScoreEarned,
    goldCoins: save.goldCoins + summary.coinsCollected,
    ancientCredits: save.ancientCredits + creditsEarned,
    unlockedWorlds,
    collectedFragments,
    worldBestScores: {
      ...save.worldBestScores,
      [summary.worldId]: Math.max(save.worldBestScores[summary.worldId] ?? 0, summary.totalScoreEarned),
    },
    worldBestDistances: {
      ...save.worldBestDistances,
      [summary.worldId]: Math.max(
        save.worldBestDistances[summary.worldId] ?? 0,
        Math.floor(summary.distanceTravelled)
      ),
    },
    worldCluesFound: {
      ...save.worldCluesFound,
      [summary.worldId]: (save.worldCluesFound[summary.worldId] ?? 0) + summary.cluesFound,
    },
    totalRuns: save.totalRuns + 1,
    totalDistance: save.totalDistance + Math.floor(summary.distanceTravelled),
    totalCoinsEver: save.totalCoinsEver + summary.coinsCollected,
    totalObstaclesDodged: save.totalObstaclesDodged + summary.obstaclesDodged,
    totalEscapesCompleted: save.totalEscapesCompleted + (summary.victory ? 1 : 0),
    finalChamberUnlocked,
  };

  // Evaluate Achievements
  const newlyUnlockedAchievements: string[] = [];
  const checkAch = (id: string, condition: boolean) => {
    if (condition && !nextSave.unlockedAchievements.includes(id)) {
      const def = ACHIEVEMENTS_LIST.find((a) => a.id === id);
      if (def) {
        newlyUnlockedAchievements.push(id);
        nextSave = {
          ...nextSave,
          unlockedAchievements: [...nextSave.unlockedAchievements, id],
          ancientCredits: nextSave.ancientCredits + def.rewardCredits,
          totalScore: nextSave.totalScore + def.rewardScore,
        };
      }
    }
  };

  checkAch('first_adventure', nextSave.totalRuns >= 1);
  checkAch('treasure_collector', nextSave.totalCoinsEver >= 250);
  checkAch('jungle_explorer', nextSave.collectedFragments.includes('jungle'));
  checkAch('desert_survivor', nextSave.collectedFragments.includes('desert'));
  checkAch('frozen_adventurer', nextSave.collectedFragments.includes('frozen'));
  checkAch('deep_sea_explorer', nextSave.collectedFragments.includes('sunken'));
  checkAch('celestial_champion', nextSave.collectedFragments.includes('celestial'));
  checkAch('master_explorer', nextSave.finalChamberCompleted);

  persistSaveData(nextSave);

  return {
    save: nextSave,
    fullSummary: {
      ...summary,
      creditsEarned,
      newlyUnlockedFragment,
      newlyUnlockedWorld,
      newlyUnlockedAchievements,
    },
  };
}

export function completeFinalChamber(save: SaveData): SaveData {
  if (save.finalChamberCompleted) return save;
  let updated: SaveData = {
    ...save,
    finalChamberCompleted: true,
    totalScore: save.totalScore + 1000,
    goldCoins: save.goldCoins + 250,
    ancientCredits: save.ancientCredits + 5,
  };
  if (!updated.unlockedAchievements.includes('master_explorer')) {
    const def = ACHIEVEMENTS_LIST.find((a) => a.id === 'master_explorer');
    if (def) {
      updated = {
        ...updated,
        unlockedAchievements: [...updated.unlockedAchievements, 'master_explorer'],
        ancientCredits: updated.ancientCredits + def.rewardCredits,
        totalScore: updated.totalScore + def.rewardScore,
      };
    }
  }
  persistSaveData(updated);
  return updated;
}

export function spendAncientCreditForRecovery(save: SaveData): { ok: boolean; save: SaveData } {
  if (save.ancientCredits < 1) return { ok: false, save };
  const updated = {
    ...save,
    ancientCredits: save.ancientCredits - 1,
  };
  persistSaveData(updated);
  return { ok: true, save: updated };
}
