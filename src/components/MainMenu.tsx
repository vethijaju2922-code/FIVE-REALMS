import {
  Award,
  Backpack,
  Compass,
  Crown,
  Globe2,
  Map as MapIcon,
  Play,
  Settings,
  Shield,
} from 'lucide-react';
import { WORLD_MAP } from '../data/worlds';
import { SaveData, ScreenName, WorldId } from '../types/game';
import { CurrencyBar } from './CurrencyBar';

interface MainMenuProps {
  save: SaveData;
  selectedWorld: WorldId;
  onPlay: () => void;
  onNavigate: (screen: ScreenName) => void;
}

export function MainMenu({ save, selectedWorld, onPlay, onNavigate }: MainMenuProps) {
  const world = WORLD_MAP[selectedWorld];
  const fragmentsCount = save.collectedFragments.length;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-8 pointer-events-none">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-wide text-amber-100 drop-shadow">
            FIVE REALMS: THE LOST LEGACY
          </h1>
          <p className="text-xs sm:text-sm text-amber-300/90 tracking-widest mt-0.5">
            FIVE WORLDS · FIVE FRAGMENTS · ONE LEGEND
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CurrencyBar save={save} />
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            aria-label="Open Settings"
            className="p-2.5 rounded-lg bg-[#121620]/95 border border-white/10 text-stone-200 hover:text-amber-300 hover:border-amber-400/40 transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Center Left Story & Active Realm Anchor (keeps center-right open for 3D Explorer!) */}
      <div className="my-auto max-w-md pointer-events-auto">
        <div className="rounded-xl bg-[#0e121b]/90 border border-white/10 p-5 shadow-2xl">
          <div className="text-xs text-amber-300 font-medium mb-1">
            Active Destination · {world.subtitle}
          </div>
          <h2 className="font-display text-2xl font-bold text-stone-100 mb-2">{world.name}</h2>
          <p className="text-sm text-stone-300 leading-relaxed mb-4">{world.storyIntro}</p>

          <div className="flex items-center justify-between text-xs text-stone-400 border-t border-white/10 pt-3 mb-4">
            <span>Fragments: {fragmentsCount} / 5</span>
            <span aria-hidden="true">·</span>
            <span>Best: {save.worldBestScores[selectedWorld] ?? 0} pts</span>
            <span aria-hidden="true">·</span>
            <span>Clues: {save.worldCluesFound[selectedWorld] ?? 0}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPlay}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Expedition</span>
            </button>

            {save.finalChamberUnlocked && (
              <button
                type="button"
                onClick={() => onNavigate('final_chamber')}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Crown className="w-4 h-4" />
                <span>Final Chamber</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Dock Navigation */}
      <nav className="pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 bg-[#0e121b]/92 border border-white/10 rounded-xl p-2.5 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={() => onNavigate('worlds')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181e2c] hover:bg-[#222b3e] text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Globe2 className="w-4 h-4 text-emerald-400" />
          <span>Realms ({save.unlockedWorlds.length}/5)</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181e2c] hover:bg-[#222b3e] text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Shield className="w-4 h-4 text-sky-400" />
          <span>Equipment Shop</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181e2c] hover:bg-[#222b3e] text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <MapIcon className="w-4 h-4 text-amber-400" />
          <span>Treasure Map</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('customize')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181e2c] hover:bg-[#222b3e] text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Backpack className="w-4 h-4 text-orange-400" />
          <span>Customize</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('missions')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181e2c] hover:bg-[#222b3e] text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Award className="w-4 h-4 text-fuchsia-400" />
          <span>Missions &amp; Badges</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="hidden"
          aria-hidden="true"
        >
          <Compass className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
