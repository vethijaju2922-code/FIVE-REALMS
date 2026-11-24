import {
  Coins,
  Compass,
  Flame,
  Pause,
  Shield,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';
import { WORLD_MAP } from '../data/worlds';
import { EquipmentId, RunHudState } from '../types/game';

interface GameplayHUDProps {
  hud: RunHudState;
  onPause: () => void;
  onActivateAbility: (id: EquipmentId) => void;
}

const ABILITY_ICON: Record<EquipmentId, typeof Shield> = {
  shield: Shield,
  grappling: Zap,
  boots: Flame,
  oxygen: Wind,
  compass: Compass,
  teleport: Sparkles,
};

export function GameplayHUD({ hud, onPause, onActivateAbility }: GameplayHUDProps) {
  const world = WORLD_MAP[hud.worldId];
  const progressPct = Math.min(100, Math.round((hud.distance / hud.targetDistance) * 100));
  const oxygenPct = Math.max(0, Math.min(100, Math.round((hud.oxygen / hud.maxOxygen) * 100)));

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top HUD Bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pointer-events-auto">
          <div className="px-3.5 py-2 rounded-lg bg-[#0c1018]/88 border border-white/10">
            <div className="text-[11px] text-stone-400">Run Score</div>
            <div className="font-mono-num text-lg sm:text-xl font-bold text-stone-100">
              {hud.runScore.toLocaleString()}
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-[#0c1018]/88 border border-white/10 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[11px] text-stone-400">Coins</div>
              <div className="font-mono-num text-base sm:text-lg font-bold text-amber-300">
                {hud.coins}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-[#0c1018]/88 border border-white/10 min-w-[130px]">
            <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
              <span>{world.name}</span>
              <span className="font-mono-num text-stone-200">
                {hud.distance}m / {hud.targetDistance}m
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{ width: `${progressPct}%`, backgroundColor: world.fragmentColor }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onPause}
          aria-label="Pause Game"
          className="pointer-events-auto p-3 rounded-lg bg-[#0c1018]/90 border border-white/15 text-stone-100 hover:text-amber-300 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Pause className="w-5 h-5" />
        </button>
      </div>

      {/* Dynamic Environmental Bars (Oxygen / Escape / Secret Room / Story Banner) */}
      <div className="flex flex-col items-center gap-2 my-auto pointer-events-none">
        {hud.worldId === 'sunken' && (
          <div className="w-56 px-3 py-1.5 rounded-lg bg-[#061824]/90 border border-cyan-400/30">
            <div className="flex items-center justify-between text-xs text-cyan-200 mb-1">
              <span>Oxygen Supply</span>
              <span className="font-mono-num font-bold">{oxygenPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  oxygenPct < 30 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${oxygenPct}%` }}
              />
            </div>
          </div>
        )}

        {hud.inSecretRoom && (
          <div className="px-4 py-1.5 rounded-lg bg-amber-950/90 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-semibold">
            Secret Treasure Vault · {hud.secretRoomRemaining}s remaining
          </div>
        )}

        {hud.inEscapeSequence && (
          <div className="px-4 py-1.5 rounded-lg bg-rose-950/90 border border-rose-400/50 text-rose-100 text-xs sm:text-sm font-semibold">
            {world.escapeTitle} · {Math.round(hud.escapeProgress * 100)}%
          </div>
        )}

        {hud.bannerText && (
          <div
            className={`max-w-lg text-center px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium shadow-lg ${
              hud.bannerTone === 'warning'
                ? 'bg-rose-950/92 border-rose-400/40 text-rose-100'
                : hud.bannerTone === 'rival'
                  ? 'bg-purple-950/92 border-purple-400/40 text-purple-100'
                  : hud.bannerTone === 'treasure'
                    ? 'bg-amber-950/92 border-amber-400/40 text-amber-100'
                    : 'bg-[#0e131f]/92 border-sky-400/30 text-sky-100'
            }`}
          >
            {hud.bannerText}
          </div>
        )}
      </div>

      {/* Bottom Controls & Equipped Equipment */}
      <div className="flex items-end justify-between gap-4">
        <div className="hidden sm:block text-xs text-stone-300/80 bg-[#0c1018]/80 border border-white/10 px-3 py-1.5 rounded-lg">
          Move: A/D or Arrows · Jump: W / Space · Slide: S / Down · Pause: Esc
        </div>

        <div className="sm:hidden text-[11px] text-stone-300/85 bg-[#0c1018]/80 border border-white/10 px-2.5 py-1 rounded-lg">
          Swipe to Move / Jump / Slide
        </div>

        {/* Equipped Equipment Ability Buttons */}
        <div className="flex items-center gap-2.5 pointer-events-auto ml-auto">
          {hud.abilities.map((ab) => {
            const Icon = ABILITY_ICON[ab.id];
            const isPassive = ab.id === 'teleport';
            const isActive = ab.activeRemaining > 0;
            const onCd = ab.cooldownRemaining > 0;

            return (
              <button
                key={ab.id}
                type="button"
                disabled={isPassive || onCd}
                onClick={() => onActivateAbility(ab.id)}
                className={`relative flex flex-col items-center justify-center min-w-[68px] min-h-[58px] px-2.5 py-2 rounded-xl border text-xs font-semibold transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-amber-500/90 border-amber-200 text-stone-950'
                    : isPassive
                      ? 'bg-[#121620]/90 border-fuchsia-400/30 text-fuchsia-200'
                      : onCd
                        ? 'bg-[#0e121b]/85 border-white/10 text-stone-500 cursor-not-allowed'
                        : 'bg-[#131b2b]/95 border-sky-400/40 text-sky-100 hover:border-sky-300 cursor-pointer'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="truncate max-w-[66px] text-[10px]">{ab.name.split(' ')[0]}</span>
                {isActive && (
                  <span className="font-mono-num text-[10px]">
                    {ab.activeRemaining.toFixed(1)}s
                  </span>
                )}
                {!isActive && onCd && (
                  <span className="font-mono-num text-[10px]">
                    {Math.ceil(ab.cooldownRemaining)}s
                  </span>
                )}
                {isPassive && <span className="text-[10px] text-fuchsia-300">Auto</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
