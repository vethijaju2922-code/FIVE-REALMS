import { Home, Play, RotateCcw } from 'lucide-react';
import { WORLD_MAP } from '../data/worlds';
import { WorldId } from '../types/game';

interface PauseModalProps {
  worldId: WorldId;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function PauseModal({ worldId, onResume, onRestart, onMainMenu }: PauseModalProps) {
  const world = WORLD_MAP[worldId];

  return (
    <div className="absolute inset-0 z-30 bg-[#06080d]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#111622] border border-white/12 p-6 text-center shadow-2xl">
        <div className="text-xs text-amber-300 font-medium mb-1">{world.name}</div>
        <h2 className="font-display text-2xl font-bold text-stone-100 mb-5">Expedition Paused</h2>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1c2333] hover:bg-[#263046] text-stone-100 font-semibold text-sm border border-white/10 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Realm</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#141925] hover:bg-[#1c2233] text-stone-300 font-semibold text-sm border border-white/10 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
