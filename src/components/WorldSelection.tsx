import { ArrowLeft, CheckCircle2, Lock, Play } from 'lucide-react';
import { WORLDS } from '../data/worlds';
import { SaveData, WorldId } from '../types/game';
import { CurrencyBar } from './CurrencyBar';

interface WorldSelectionProps {
  save: SaveData;
  selectedWorld: WorldId;
  onSelectAndPlay: (worldId: WorldId) => void;
  onSelectOnly: (worldId: WorldId) => void;
  onBack: () => void;
}

export function WorldSelection({
  save,
  selectedWorld,
  onSelectAndPlay,
  onSelectOnly,
  onBack,
}: WorldSelectionProps) {
  return (
    <div className="absolute inset-0 z-20 bg-[#0a0d14]/94 flex flex-col p-4 sm:p-8 overflow-y-auto realm-scroll">
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
              World Selection
            </h2>
            <p className="text-xs text-stone-400">
              Recover all five magical fragments to unlock the Final Treasure Chamber
            </p>
          </div>
        </div>
        <CurrencyBar save={save} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full pb-8">
        {WORLDS.map((world) => {
          const unlocked = save.unlockedWorlds.includes(world.id);
          const hasFragment = save.collectedFragments.includes(world.id);
          const bestDist = save.worldBestDistances[world.id] ?? 0;
          const pct = hasFragment
            ? 100
            : Math.min(99, Math.round((bestDist / world.targetDistance) * 100));
          const isSelected = selectedWorld === world.id;

          return (
            <div
              key={world.id}
              onClick={() => unlocked && onSelectOnly(world.id)}
              className={`rounded-xl overflow-hidden border transition-colors flex flex-col bg-[#121722] ${
                isSelected
                  ? 'border-amber-400/70'
                  : unlocked
                    ? 'border-white/10 hover:border-white/25 cursor-pointer'
                    : 'border-white/5 opacity-75'
              }`}
            >
              <div className="relative h-44 w-full bg-stone-900 overflow-hidden">
                <img
                  src={world.referenceImage}
                  alt={world.name}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${!unlocked ? 'grayscale brightness-50' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121722] via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-xs text-amber-300 font-medium">{world.subtitle}</div>
                    <h3 className="font-display text-xl font-bold text-white">{world.name}</h3>
                  </div>
                  {hasFragment ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Fragment</span>
                    </span>
                  ) : !unlocked ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-stone-400">
                      <Lock className="w-4 h-4" />
                      <span>Locked</span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2 text-xs text-stone-300">
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Reward: {world.fragmentName}</span>
                    <span className="font-mono-num text-stone-200">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: world.fragmentColor }}
                    />
                  </div>
                  <p className="text-stone-300 leading-relaxed pt-1">
                    <strong className="text-stone-100">{world.mechanicLabel}:</strong>{' '}
                    {world.mechanicDescription}
                  </p>
                  <p className="text-stone-400">
                    Challenge: {world.escapeTitle} ({world.targetDistance}m)
                  </p>
                </div>

                {unlocked ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAndPlay(world.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{hasFragment ? 'Replay Realm' : 'Enter Realm'}</span>
                  </button>
                ) : (
                  <div className="w-full text-center py-2.5 rounded-lg bg-stone-900 border border-white/5 text-xs text-stone-400">
                    Recover the previous realm’s Fragment to unlock
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
