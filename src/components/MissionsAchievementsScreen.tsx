import { useState } from 'react';
import { ArrowLeft, Award, CheckCircle2, Target } from 'lucide-react';
import { ACHIEVEMENTS_LIST, MISSIONS_LIST } from '../data/catalog';
import { getMissionProgressValue } from '../services/saveSystem';
import { SaveData } from '../types/game';
import { CurrencyBar } from './CurrencyBar';

interface MissionsAchievementsScreenProps {
  save: SaveData;
  onClaimMission: (missionId: string) => { ok: boolean; message: string };
  onBack: () => void;
}

export function MissionsAchievementsScreen({
  save,
  onClaimMission,
  onBack,
}: MissionsAchievementsScreenProps) {
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleClaim = (id: string) => {
    const res = onClaimMission(id);
    setFeedback(res.message);
  };

  return (
    <div className="absolute inset-0 z-20 bg-[#0a0d14]/94 flex flex-col p-4 sm:p-8 overflow-y-auto realm-scroll">
      <header className="flex flex-wrap items-center justify-between gap-4 max-w-5xl mx-auto w-full mb-5">
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
              Missions &amp; Achievements
            </h2>
            <p className="text-xs text-stone-400">
              Complete expedition objectives to earn Score Points, Gold Coins, and Ancient Credits
            </p>
          </div>
        </div>
        <CurrencyBar save={save} />
      </header>

      <div className="max-w-5xl mx-auto w-full flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('missions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
            tab === 'missions'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-[#141926] text-stone-300 border border-white/10'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Missions ({MISSIONS_LIST.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('achievements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
            tab === 'achievements'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-[#141926] text-stone-300 border border-white/10'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>
            Achievements ({save.unlockedAchievements.length}/{ACHIEVEMENTS_LIST.length})
          </span>
        </button>
      </div>

      {feedback && (
        <div className="max-w-5xl mx-auto w-full mb-4 px-4 py-2.5 rounded-lg bg-emerald-950/90 border border-emerald-400/40 text-emerald-200 text-sm">
          {feedback}
        </div>
      )}

      {tab === 'missions' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto w-full pb-8">
          {MISSIONS_LIST.map((m) => {
            const current = Math.min(m.target, getMissionProgressValue(save, m.metric));
            const pct = Math.min(100, Math.round((current / m.target) * 100));
            const claimed = save.claimedMissions.includes(m.id);
            const ready = current >= m.target && !claimed;

            return (
              <div
                key={m.id}
                className="rounded-xl bg-[#121722] border border-white/10 p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-stone-100">{m.title}</h3>
                    <span className="font-mono-num text-xs text-stone-300">
                      {current} / {m.target}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">{m.description}</p>
                  <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden mt-3">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
                  <span className="text-stone-300">
                    +{m.rewardScore} Score · +{m.rewardCoins} Coins · +{m.rewardCredits} Credits
                  </span>
                  {claimed ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Claimed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => handleClaim(m.id)}
                      className={`px-3.5 py-2 rounded-lg font-bold whitespace-nowrap ${
                        ready
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      Claim Reward
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto w-full pb-8">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const unlocked = save.unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${
                  unlocked
                    ? 'bg-[#152028] border-emerald-400/45'
                    : 'bg-[#121722] border-white/10 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Award
                      className={`w-5 h-5 ${unlocked ? 'text-amber-400' : 'text-stone-500'}`}
                    />
                    <h3 className="font-display text-base font-bold text-stone-100">{ach.title}</h3>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">{ach.description}</p>
                  <div className="text-xs text-amber-300/90 mt-2">
                    Reward: +{ach.rewardScore} Score · +{ach.rewardCredits} Ancient Credits
                  </div>
                </div>
                <div className="text-xs font-semibold shrink-0">
                  {unlocked ? (
                    <span className="text-emerald-300">Unlocked</span>
                  ) : (
                    <span className="text-stone-500">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
