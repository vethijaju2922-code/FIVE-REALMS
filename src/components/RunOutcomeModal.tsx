import { ArrowRight, Crown, Flag, Home, RotateCcw, Sparkles } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../data/catalog';
import { WORLD_MAP } from '../data/worlds';
import { RunEndSummary, SaveData, WorldId } from '../types/game';

interface RunOutcomeModalProps {
  summary: RunEndSummary;
  save: SaveData;
  onUseCreditRecover: () => void;
  onRestart: (fromCheckpoint: boolean) => void;
  onPlayWorld: (worldId: WorldId) => void;
  onOpenFinalChamber: () => void;
  onMainMenu: () => void;
}

export function RunOutcomeModal({
  summary,
  save,
  onUseCreditRecover,
  onRestart,
  onPlayWorld,
  onOpenFinalChamber,
  onMainMenu,
}: RunOutcomeModalProps) {
  const world = WORLD_MAP[summary.worldId];
  const nextWorld = summary.newlyUnlockedWorld ? WORLD_MAP[summary.newlyUnlockedWorld] : null;
  const canRecover = !summary.victory && summary.canUseAncientCredits && save.ancientCredits > 0;

  return (
    <div className="absolute inset-0 z-30 bg-[#06080d]/88 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#111622] border border-white/12 p-6 shadow-2xl my-auto">
        {summary.victory ? (
          <div className="text-center mb-5">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border border-white/20 mb-3"
              style={{
                backgroundColor: `${world.fragmentColor}25`,
                color: world.fragmentColor,
              }}
            >
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold text-emerald-300 mb-1">
              {world.name} Completed
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-amber-100">
              {world.fragmentName} Recovered!
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
              {world.storyComplete}
            </p>
          </div>
        ) : (
          <div className="text-center mb-5">
            <div className="text-xs font-semibold text-rose-400 mb-1">Expedition Ended</div>
            <h2 className="font-display text-2xl font-bold text-stone-100">{world.name}</h2>
            <p className="text-sm text-rose-200 bg-rose-950/60 border border-rose-500/30 rounded-lg px-3 py-2 mt-3">
              {summary.causeOfFailure}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-center">
          <div className="p-3 rounded-lg bg-[#171d2c] border border-white/5">
            <div className="text-[11px] text-stone-400">Score Earned</div>
            <div className="font-mono-num text-base font-bold text-sky-300">
              +{summary.totalScoreEarned}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#171d2c] border border-white/5">
            <div className="text-[11px] text-stone-400">Distance</div>
            <div className="font-mono-num text-base font-bold text-stone-100">
              {Math.floor(summary.distanceTravelled)}m
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#171d2c] border border-white/5">
            <div className="text-[11px] text-stone-400">Gold Coins</div>
            <div className="font-mono-num text-base font-bold text-amber-300">
              +{summary.coinsCollected}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#171d2c] border border-white/5">
            <div className="text-[11px] text-stone-400">Total Score</div>
            <div className="font-mono-num text-base font-bold text-emerald-300">
              {save.totalScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Unlocks / Clues / Achievements */}
        {(summary.cluesFound > 0 ||
          summary.newlyUnlockedWorld ||
          summary.newlyUnlockedAchievements.length > 0) && (
          <div className="mb-4 p-3 rounded-lg bg-[#151c29] border border-amber-400/25 text-xs space-y-1">
            {summary.cluesFound > 0 && (
              <div className="text-amber-200">
                Hidden Clues Uncovered: {summary.cluesFound}
              </div>
            )}
            {nextWorld && (
              <div className="text-emerald-300 font-semibold">
                New Realm Unlocked: {nextWorld.name}!
              </div>
            )}
            {summary.newlyUnlockedAchievements.map((achId) => {
              const def = ACHIEVEMENTS_LIST.find((a) => a.id === achId);
              return def ? (
                <div key={achId} className="text-fuchsia-300">
                  Achievement Unlocked: {def.title}
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {canRecover && (
            <button
              type="button"
              onClick={onUseCreditRecover}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Revive Now (1 Ancient Credit · {save.ancientCredits} left)</span>
            </button>
          )}

          {summary.victory && nextWorld && (
            <button
              type="button"
              onClick={() => onPlayWorld(nextWorld.id)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer"
            >
              <span>Enter {nextWorld.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {summary.victory && save.finalChamberUnlocked && !nextWorld && (
            <button
              type="button"
              onClick={onOpenFinalChamber}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>Enter the Final Treasure Chamber</span>
            </button>
          )}

          {!summary.victory && summary.checkpointReached && (
            <button
              type="button"
              onClick={() => onRestart(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-sm cursor-pointer"
            >
              <Flag className="w-4 h-4" />
              <span>Retry from Escape Checkpoint</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onRestart(false)}
              className="flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{summary.victory ? 'Replay' : 'Try Again'}</span>
            </button>

            <button
              type="button"
              onClick={onMainMenu}
              className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1a2232] hover:bg-[#232d42] text-stone-200 font-semibold text-sm border border-white/10 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
