/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CustomizationScreen } from './components/CustomizationScreen';
import { EquipmentShop } from './components/EquipmentShop';
import { FinalChamberScreen } from './components/FinalChamberScreen';
import { GameplayHUD } from './components/GameplayHUD';
import { MainMenu } from './components/MainMenu';
import { MissionsAchievementsScreen } from './components/MissionsAchievementsScreen';
import { PauseModal } from './components/PauseModal';
import { RunOutcomeModal } from './components/RunOutcomeModal';
import { SettingsModal } from './components/SettingsModal';
import { TreasureMapScreen } from './components/TreasureMapScreen';
import { WorldSelection } from './components/WorldSelection';
import { WORLDS } from './data/worlds';
import { soundEngine } from './game/audio/SoundEngine';
import { GameEngine } from './game/GameEngine';
import {
  claimMissionReward,
  completeFinalChamber,
  loadSaveData,
  persistSaveData,
  purchaseOrEquipCosmetic,
  purchaseOrUpgradeEquipment,
  recordRunCompletion,
  resetSaveData,
  spendAncientCreditForRecovery,
  toggleEquipItem,
} from './services/saveSystem';
import {
  EquipmentId,
  GameSettings,
  RunEndSummary,
  RunHudState,
  SaveData,
  ScreenName,
  WorldId,
} from './types/game';

const INITIAL_HUD: RunHudState = {
  worldId: 'jungle',
  runScore: 0,
  coins: 0,
  gems: 0,
  distance: 0,
  targetDistance: WORLDS[0].targetDistance,
  speed: 15,
  oxygen: 100,
  maxOxygen: 100,
  gravityInverted: false,
  inEscapeSequence: false,
  escapeProgress: 0,
  inSecretRoom: false,
  secretRoomRemaining: 0,
  shieldActive: false,
  bootsActive: false,
  compassActive: false,
  onIce: false,
  inSandstorm: false,
  onRope: false,
  checkpointReached: false,
  cluesThisRun: 0,
  obstaclesDodged: 0,
  bannerText: null,
  bannerTone: 'info',
  abilities: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;

  const [screen, setScreen] = useState<ScreenName>('menu');
  const screenRef = useRef<ScreenName>(screen);
  screenRef.current = screen;

  const [selectedWorld, setSelectedWorld] = useState<WorldId>('jungle');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const [hud, setHud] = useState<RunHudState>(INITIAL_HUD);
  const [runOutcome, setRunOutcome] = useState<RunEndSummary | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Touch swipe tracking
  const touchStartRef = useRef<{ x: number; y: number; handled: boolean } | null>(null);

  // Initialize Three.js GameEngine once in isolated container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    soundEngine.updateSettings(saveRef.current.settings);

    const engine = new GameEngine(container, saveRef.current, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onRunEnded: (rawSummary) => {
        const { save: updatedSave, fullSummary } = recordRunCompletion(
          saveRef.current,
          rawSummary
        );
        setSave(updatedSave);
        setRunOutcome(fullSummary);
      },
      onContextLost: (lost) => setContextLost(lost),
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
      soundEngine.stopMusic();
    };
  }, []);

  // Keep engine synced with latest save (cosmetics, equipment, performance setting)
  useEffect(() => {
    engineRef.current?.updateSaveSnapshot(save);
    soundEngine.updateSettings(save.settings);
  }, [save]);

  const startRealmRun = useCallback((worldId: WorldId, fromCheckpoint = false) => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    setSelectedWorld(worldId);
    setPaused(false);
    setRunOutcome(null);
    setScreen('playing');
    engineRef.current?.startRun(worldId, fromCheckpoint);
  }, []);

  const returnToMenu = useCallback(() => {
    soundEngine.playUiClick();
    setPaused(false);
    setRunOutcome(null);
    setScreen('menu');
    engineRef.current?.showPreview(selectedWorld);
  }, [selectedWorld]);

  const handlePauseToggle = useCallback(() => {
    if (screenRef.current !== 'playing' || runOutcome) return;
    soundEngine.playUiClick();
    if (pausedRef.current) {
      setPaused(false);
      engineRef.current?.resumeRun();
    } else {
      setPaused(true);
      engineRef.current?.pauseRun();
    }
  }, [runOutcome]);

  // Desktop keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.unlock();
      if (screenRef.current !== 'playing') return;

      if (e.code === 'Escape') {
        e.preventDefault();
        handlePauseToggle();
        return;
      }

      if (pausedRef.current || runOutcome) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          engineRef.current?.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          engineRef.current?.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          engineRef.current?.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          engineRef.current?.slide();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3': {
          const idx = Number(e.code.replace('Digit', '')) - 1;
          const equipId = saveRef.current.equippedEquipment[idx];
          if (equipId) {
            engineRef.current?.activateEquipment(equipId);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePauseToggle, runOutcome]);

  // Mobile Touch Swipe Controls (prevents accidental scrolling during gameplay)
  const handleTouchStart = (e: React.TouchEvent) => {
    soundEngine.unlock();
    if (screen !== 'playing' || paused || runOutcome) return;
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, handled: false };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (screen !== 'playing' || paused || runOutcome) return;
    const start = touchStartRef.current;
    if (!start || start.handled || e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const threshold = 26;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      start.handled = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) engineRef.current?.moveLeft();
        else engineRef.current?.moveRight();
      } else {
        if (dy < 0) engineRef.current?.jump();
        else engineRef.current?.slide();
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Economy & Navigation Handlers
  const handleNavigate = (next: ScreenName) => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    setScreen(next);
  };

  const handleSelectWorldOnly = (worldId: WorldId) => {
    soundEngine.playUiClick();
    setSelectedWorld(worldId);
    engineRef.current?.showPreview(worldId);
  };

  const handlePurchaseEquipment = (id: EquipmentId) => {
    soundEngine.playUiClick();
    const res = purchaseOrUpgradeEquipment(save, id);
    if (res.ok) setSave(res.save);
    return { ok: res.ok, message: res.message };
  };

  const handleToggleEquip = (id: EquipmentId) => {
    soundEngine.playUiClick();
    const res = toggleEquipItem(save, id);
    setSave(res.save);
    return { message: res.message };
  };

  const handlePurchaseOrEquipCosmetic = (cosmeticId: string) => {
    soundEngine.playUiClick();
    const res = purchaseOrEquipCosmetic(save, cosmeticId);
    if (res.ok) setSave(res.save);
    return { ok: res.ok, message: res.message };
  };

  const handleClaimMission = (missionId: string) => {
    soundEngine.playUiClick();
    const res = claimMissionReward(save, missionId);
    if (res.ok) setSave(res.save);
    return { ok: res.ok, message: res.message };
  };

  const handleUseCreditRecover = () => {
    soundEngine.playEquipment();
    const res = spendAncientCreditForRecovery(save);
    if (res.ok) {
      setSave(res.save);
      setRunOutcome(null);
      engineRef.current?.recoverFromFailure();
    }
  };

  const handleUpdateSettings = (next: GameSettings) => {
    soundEngine.playUiClick();
    const updated: SaveData = { ...save, settings: next };
    persistSaveData(updated);
    setSave(updated);
  };

  const handleResetSave = () => {
    soundEngine.playUiClick();
    const fresh = resetSaveData();
    setSave(fresh);
    setSelectedWorld('jungle');
    engineRef.current?.showPreview('jungle');
  };

  const handleActivateFinalChamber = () => {
    soundEngine.playVictory();
    const updated = completeFinalChamber(save);
    setSave(updated);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#0a0c10] game-touch-area"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dedicated Isolated 3D WebGL Viewport Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 z-50 bg-[#0a0c10]/95 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-3">
            <h2 className="font-display text-2xl font-bold text-amber-200">
              Restoring 3D Graphics Context
            </h2>
            <p className="text-sm text-stone-300">
              Your browser temporarily paused WebGL rendering. Waiting for restoration...
            </p>
          </div>
        </div>
      )}

      {screen === 'menu' && (
        <MainMenu
          save={save}
          selectedWorld={selectedWorld}
          onPlay={() => startRealmRun(selectedWorld)}
          onNavigate={handleNavigate}
        />
      )}

      {screen === 'worlds' && (
        <WorldSelection
          save={save}
          selectedWorld={selectedWorld}
          onSelectAndPlay={(wId) => startRealmRun(wId)}
          onSelectOnly={handleSelectWorldOnly}
          onBack={returnToMenu}
        />
      )}

      {screen === 'shop' && (
        <EquipmentShop
          save={save}
          onPurchaseOrUpgrade={handlePurchaseEquipment}
          onToggleEquip={handleToggleEquip}
          onBack={returnToMenu}
        />
      )}

      {screen === 'customize' && (
        <CustomizationScreen
          save={save}
          onPurchaseOrEquip={handlePurchaseOrEquipCosmetic}
          onBack={returnToMenu}
        />
      )}

      {screen === 'map' && (
        <TreasureMapScreen
          save={save}
          onEnterWorld={(wId) => startRealmRun(wId)}
          onEnterFinalChamber={() => handleNavigate('final_chamber')}
          onBack={returnToMenu}
        />
      )}

      {screen === 'missions' && (
        <MissionsAchievementsScreen
          save={save}
          onClaimMission={handleClaimMission}
          onBack={returnToMenu}
        />
      )}

      {screen === 'final_chamber' && (
        <FinalChamberScreen
          save={save}
          onActivateChamber={handleActivateFinalChamber}
          onBack={returnToMenu}
        />
      )}

      {screen === 'settings' && (
        <SettingsModal
          settings={save.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSave={handleResetSave}
          onBack={returnToMenu}
        />
      )}

      {screen === 'playing' && (
        <GameplayHUD
          hud={hud}
          onPause={handlePauseToggle}
          onActivateAbility={(id) => engineRef.current?.activateEquipment(id)}
        />
      )}

      {screen === 'playing' && paused && !runOutcome && (
        <PauseModal
          worldId={selectedWorld}
          onResume={handlePauseToggle}
          onRestart={() => startRealmRun(selectedWorld, false)}
          onMainMenu={returnToMenu}
        />
      )}

      {screen === 'playing' && runOutcome && (
        <RunOutcomeModal
          summary={runOutcome}
          save={save}
          onUseCreditRecover={handleUseCreditRecover}
          onRestart={(fromCheckpoint) => startRealmRun(runOutcome.worldId, fromCheckpoint)}
          onPlayWorld={(wId) => startRealmRun(wId, false)}
          onOpenFinalChamber={() => {
            setRunOutcome(null);
            setScreen('final_chamber');
            engineRef.current?.showPreview('celestial');
          }}
          onMainMenu={returnToMenu}
        />
      )}
    </div>
  );
}
