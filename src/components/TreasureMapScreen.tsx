import { ArrowLeft, CheckCircle2, Crown, Lock, Play } from 'lucide-react';
import { WORLDS } from '../data/worlds';
import { SaveData, WorldId } from '../types/game';
import { CurrencyBar } from './CurrencyBar';

interface TreasureMapScreenProps {
  save: SaveData;
  onEnterWorld: (worldId: WorldId) => void;
  onEnterFinalChamber: () => void;
  onBack: () => void;
}

export function TreasureMapScreen({
  save,
  onEnterWorld,
  onEnterFinalChamber,
  onBack,
}: TreasureMapScreenProps) {
  const fragmentsCount = save.collectedFragments.length;
  const totalClues = Object.values(save.worldCluesFound).reduce((a, b) => a + b, 0);
  const completionPct = Math.round((fragmentsCount / 5) * 100);

  return (
    <div className="absolute inset-0 z-20 bg-[#0a0d14]/95 flex flex-col p-4 sm:p-8 overflow-y-auto realm-scroll">
      <header className="flex flex-wrap items-center justify-between gap-4 max-w-6xl mx-auto w-full mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161c28] hover:bg-[#1f2838] border border-white/10 text-stone-200 text-sm font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-amber-100">
              Ancient Treasure Map
            </h2>
            <p className="text-xs text-stone-400">
              Map Completion: {completionPct}% · Fragments: {fragmentsCount}/5 · Hidden Clues Found:{' '}
              {totalClues}
            </p>
          </div>
        </div>
        <CurrencyBar save={save} />
      </header>

      <div className="max-w-6xl mx-auto w-full space-y-6 pb-8">
        {/* Expedition Route & Fragment Progress */}
        <div className="rounded-xl bg-[#131824] border border-amber-500/25 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display text-lg font-bold text-amber-200">
                The Lost Legacy Chronicle
              </h3>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl">
                An ancient civilization split its vault key into five magical fragments across five
                realms. Your rival Vespera Vance pursues the same relics—claim each fragment before
                she does.
              </p>
            </div>
            <button
              type="button"
              disabled={!save.finalChamberUnlocked}
              onClick={onEnterFinalChamber}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap cursor-pointer ${
                save.finalChamberUnlocked
                  ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>
                {save.finalChamberUnlocked
                  ? 'Open Final Treasure Chamber'
                  : `Final Chamber (${fragmentsCount}/5 Fragments)`}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {WORLDS.map((w) => {
              const unlocked = save.unlockedWorlds.includes(w.id);
              const collected = save.collectedFragments.includes(w.id);
              const clues = save.worldCluesFound[w.id] ?? 0;

              return (
                <div
                  key={w.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    collected
                      ? 'bg-[#162129] border-emerald-400/50'
                      : unlocked
                        ? 'bg-[#171c29] border-amber-400/40'
                        : 'bg-[#10131c] border-white/5 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono-num text-stone-400">Realm {w.order}</span>
                      {collected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : !unlocked ? (
                        <Lock className="w-4 h-4 text-stone-500" />
                      ) : null}
                    </div>
                    <h4 className="font-display text-base font-bold text-stone-100">{w.name}</h4>
                    <div
                      className="text-xs font-semibold mt-1"
                      style={{ color: collected ? w.fragmentColor : '#94a3b8' }}
                    >
                      {w.fragmentName}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-2">
                      {collected ? w.storyComplete : w.storyIntro}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span>Clues: {clues}</span>
                      <span className="font-mono-num">
                        Best: {save.worldBestDistances[w.id] ?? 0}m
                      </span>
                    </div>
                    {unlocked && (
                      <button
                        type="button"
                        onClick={() => onEnterWorld(w.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
