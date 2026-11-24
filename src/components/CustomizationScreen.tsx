import { useState } from 'react';
import { ArrowLeft, Check, Coins } from 'lucide-react';
import { COSMETICS_LIST } from '../data/catalog';
import { CosmeticCategory, SaveData } from '../types/game';
import { CurrencyBar } from './CurrencyBar';

interface CustomizationScreenProps {
  save: SaveData;
  onPurchaseOrEquip: (cosmeticId: string) => { ok: boolean; message: string };
  onBack: () => void;
}

const CATEGORIES: { id: CosmeticCategory; label: string }[] = [
  { id: 'outfit', label: 'Outfits' },
  { id: 'hat', label: 'Hats & Helms' },
  { id: 'backpack', label: 'Backpacks' },
  { id: 'accessory', label: 'Accessories' },
];

export function CustomizationScreen({
  save,
  onPurchaseOrEquip,
  onBack,
}: CustomizationScreenProps) {
  const [tab, setTab] = useState<CosmeticCategory>('outfit');
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const items = COSMETICS_LIST.filter((c) => c.category === tab);

  const handleAction = (id: string) => {
    const res = onPurchaseOrEquip(id);
    setFeedback({ text: res.message, ok: res.ok });
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 bg-[#0c1018]/92 border border-white/10 rounded-xl px-4 py-3">
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
            <h2 className="font-display text-xl sm:text-2xl font-bold text-amber-100">
              Explorer Customization
            </h2>
            <p className="text-xs text-stone-400">
              Preview your explorer live in 3D · Unlock cosmetics with Gold Coins
            </p>
          </div>
        </div>
        <CurrencyBar save={save} />
      </header>

      {/* Side Drawer so the center 3D Explorer stays visible! */}
      <div className="pointer-events-auto my-auto ml-auto w-full max-w-md bg-[#0e121b]/94 border border-white/12 rounded-xl p-4 flex flex-col max-h-[76vh]">
        <div className="flex items-center gap-1 p-1 bg-[#161c28] rounded-lg mb-3 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTab(c.id)}
              className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                tab === c.id
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg border text-xs font-medium ${
              feedback.ok
                ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-200'
                : 'bg-rose-950/90 border-rose-400/40 text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="space-y-2.5 overflow-y-auto realm-scroll pr-1">
          {items.map((item) => {
            const owned = save.ownedCosmetics.includes(item.id);
            const equipped = save.equippedCosmetics[item.category] === item.id;
            const canAfford = save.goldCoins >= item.priceCoins;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border bg-[#141926] flex items-center justify-between gap-3 ${
                  equipped ? 'border-amber-400/70' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg border border-white/20 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${item.primaryColor} 55%, ${item.accentColor} 100%)`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-100 truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-stone-400 line-clamp-2">{item.description}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction(item.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    equipped
                      ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                      : owned
                        ? 'bg-[#1f283a] hover:bg-[#2a364e] text-stone-100 border border-white/10'
                        : canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {equipped ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Equipped</span>
                    </>
                  ) : owned ? (
                    <span>Equip</span>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5" />
                      <span>{item.priceCoins}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
