import { useState } from 'react';
import { ArrowLeft, Crown, Sparkles } from 'lucide-react';
import { WORLDS } from '../data/worlds';
import { SaveData } from '../types/game';

interface FinalChamberScreenProps {
  save: SaveData;
  onActivateChamber: () => void;
  onBack: () => void;
}

export function FinalChamberScreen({
  save,
  onActivateChamber,
  onBack,
}: FinalChamberScreenProps) {
  const [activated, setActivated] = useState(save.finalChamberCompleted);

  const handleActivate = () => {
    setActivated(true);
    onActivateChamber();
  };

  return (
    <div className="absolute inset-0 z-20 bg-[#080714]/96 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto realm-scroll">
      <div className="max-w-3xl w-full rounded-2xl bg-[#121024] border border-amber-400/35 p-6 sm:p-8 text-center shadow-2xl">
        <div className="flex justify-start mb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1c1936] hover:bg-[#262247] border border-white/10 text-stone-200 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>

        <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-amber-100">
          The Final Treasure Chamber
        </h2>
        <p className="text-sm text-stone-300 mt-2 max-w-xl mx-auto">
          All five magical map fragments converge inside the Celestial Vault. Place the shards into
          the ancient astrolabe to unlock the Lost Legacy.
        </p>

        {/* Five Fragments Ring */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 my-7">
          {WORLDS.map((w) => {
            const owned = save.collectedFragments.includes(w.id);
            return (
              <div
                key={w.id}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${
                  owned
                    ? 'bg-[#1c1a38] border-amber-400/50'
                    : 'bg-[#100e20] border-white/10 opacity-50'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-white/25"
                  style={{ backgroundColor: `${w.fragmentColor}33`, color: w.fragmentColor }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-stone-100 leading-tight">
                  {w.fragmentName.replace('The ', '')}
                </span>
              </div>
            );
          })}
        </div>

        {!activated ? (
          <button
            type="button"
            onClick={handleActivate}
            className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base cursor-pointer shadow-xl"
          >
            Unite the Five Fragments &amp; Open the Vault
          </button>
        ) : (
          <div className="p-5 rounded-xl bg-[#191636] border border-emerald-400/40 text-left space-y-3">
            <div className="text-sm font-bold text-emerald-300">
              The Lost Legacy Awakens — Adventure Complete!
            </div>
            <p className="text-sm text-stone-200 leading-relaxed">
              Golden light floods the chamber as the ancient civilization’s grand star-map projects
              across the dome—charting uncharted worlds beyond the horizon. Vespera Vance lowers her
              compass in respect: &ldquo;You earned the Legacy fairly, explorer. Until our next
              expedition.&rdquo;
            </p>
            <div className="text-xs text-amber-300 font-semibold">
              Rewards Earned: +1,000 Score Points · +250 Gold Coins · +5 Ancient Credits · Master
              Explorer Achievement
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
