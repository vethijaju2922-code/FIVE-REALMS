import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpCircle,
  Check,
  Compass,
  Flame,
  Shield,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';
import { EQUIPMENT_LIST } from '../data/catalog';
import { getEquipmentCost } from '../services/saveSystem';
import { EquipmentId, SaveData } from '../types/game';
import { CurrencyBar } from './CurrencyBar';

interface EquipmentShopProps {
  save: SaveData;
  onPurchaseOrUpgrade: (id: EquipmentId) => { ok: boolean; message: string };
  onToggleEquip: (id: EquipmentId) => { message: string };
  onBack: () => void;
}

const EQUIP_ICON: Record<EquipmentId, typeof Shield> = {
  shield: Shield,
  boots: Flame,
  grappling: Zap,
  compass: Compass,
  oxygen: Wind,
  teleport: Sparkles,
};

export function EquipmentShop({
  save,
  onPurchaseOrUpgrade,
  onToggleEquip,
  onBack,
}: EquipmentShopProps) {
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const handleBuy = (id: EquipmentId) => {
    const res = onPurchaseOrUpgrade(id);
    setFeedback({ text: res.message, ok: res.ok });
  };

  const handleEquip = (id: EquipmentId) => {
    const res = onToggleEquip(id);
    setFeedback({ text: res.message, ok: true });
  };

  return (
    <div className="absolute inset-0 z-20 bg-[#0a0d14]/94 flex flex-col p-4 sm:p-8 overflow-y-auto realm-scroll">
      <header className="flex flex-wrap items-center justify-between gap-4 max-w-6xl mx-auto w-full mb-5">
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
              Equipment Shop
            </h2>
            <p className="text-xs text-stone-400">
              Spend accumulated Total Score to unlock, upgrade, and equip up to 3 active relics
            </p>
          </div>
        </div>
        <CurrencyBar save={save} />
      </header>

      {feedback && (
        <div
          className={`max-w-6xl mx-auto w-full mb-4 px-4 py-2.5 rounded-lg border text-sm font-medium ${
            feedback.ok
              ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-400/40 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto w-full pb-8">
        {EQUIPMENT_LIST.map((item) => {
          const level = save.ownedEquipment[item.id] ?? 0;
          const owned = level > 0;
          const isMax = level >= item.maxLevel;
          const equipped = save.equippedEquipment.includes(item.id);
          const cost = getEquipmentCost(item.id, level);
          const canAfford = save.totalScore >= cost;
          const Icon = EQUIP_ICON[item.id];

          return (
            <div
              key={item.id}
              className={`rounded-xl bg-[#121722] border p-5 flex flex-col justify-between gap-4 ${
                equipped ? 'border-sky-400/60' : 'border-white/10'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 shrink-0"
                    style={{ backgroundColor: `${item.accentColor}22`, color: item.accentColor }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-stone-400">
                      {owned ? `Level ${level} / ${item.maxLevel}` : 'Unowned'}
                    </div>
                    {equipped && <div className="text-sky-300 font-semibold">Equipped</div>}
                  </div>
                </div>

                <h3 className="font-display text-lg font-bold text-stone-100">{item.name}</h3>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">{item.description}</p>
                <div className="mt-3 text-xs text-amber-300/95">
                  Effect: {item.effectSummary(Math.max(1, level))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                {!isMax ? (
                  <button
                    type="button"
                    onClick={() => handleBuy(item.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>
                      {owned ? `Upgrade (${cost} pts)` : `Buy (${cost} pts)`}
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 text-center py-2.5 rounded-lg bg-stone-900 text-xs font-semibold text-emerald-300">
                    Max Level
                  </div>
                )}

                {owned && (
                  <button
                    type="button"
                    onClick={() => handleEquip(item.id)}
                    className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      equipped
                        ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 hover:bg-sky-500/30'
                        : 'bg-[#1a2232] border-white/10 text-stone-200 hover:border-white/30'
                    }`}
                  >
                    {equipped && <Check className="w-3.5 h-3.5" />}
                    <span>{equipped ? 'Equipped' : 'Equip'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
