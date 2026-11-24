import { Coins, Compass, Sparkles } from 'lucide-react';
import { SaveData } from '../types/game';

interface CurrencyBarProps {
  save: SaveData;
}

export function CurrencyBar({ save }: CurrencyBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121620]/95 border border-white/10">
        <Compass className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="text-stone-400 text-xs">Score</span>
        <span className="font-mono-num font-bold text-stone-100">{save.totalScore.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121620]/95 border border-white/10">
        <Coins className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-stone-400 text-xs">Coins</span>
        <span className="font-mono-num font-bold text-amber-300">{save.goldCoins.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121620]/95 border border-white/10">
        <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
        <span className="text-stone-400 text-xs">Credits</span>
        <span className="font-mono-num font-bold text-fuchsia-300">{save.ancientCredits}</span>
      </div>
    </div>
  );
}
