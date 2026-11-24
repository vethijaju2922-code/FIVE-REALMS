import { useState } from 'react';
import { ArrowLeft, Trash2, Volume2, VolumeX } from 'lucide-react';
import { GameSettings } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResetSave: () => void;
  onBack: () => void;
}

export function SettingsModal({
  settings,
  onUpdateSettings,
  onResetSave,
  onBack,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="absolute inset-0 z-30 bg-[#0a0d14]/94 flex flex-col p-4 sm:p-8 overflow-y-auto realm-scroll">
      <div className="max-w-xl mx-auto w-full my-auto rounded-2xl bg-[#121722] border border-white/12 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161c28] hover:bg-[#1f2838] border border-white/10 text-stone-200 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-2xl font-bold text-amber-100">Settings</h2>
          <div className="w-16" />
        </div>

        {/* Audio */}
        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-stone-100">Background Music</div>
              <div className="text-xs text-stone-400">Realm-specific ambient score</div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, musicEnabled: !settings.musicEnabled })
              }
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                settings.musicEnabled
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                  : 'bg-stone-800 text-stone-400 border border-white/10'
              }`}
            >
              {settings.musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{settings.musicEnabled ? 'On' : 'Muted'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-stone-100">Sound Effects</div>
              <div className="text-xs text-stone-400">Footsteps, jumps, coins &amp; relics</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, sfxEnabled: !settings.sfxEnabled })}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                settings.sfxEnabled
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                  : 'bg-stone-800 text-stone-400 border border-white/10'
              }`}
            >
              {settings.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{settings.sfxEnabled ? 'On' : 'Muted'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-stone-100">Mobile Performance Mode</div>
              <div className="text-xs text-stone-400">
                Reduces shadow &amp; pixel density for smoother frame rates on Android
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, performanceMode: !settings.performanceMode })
              }
              className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                settings.performanceMode
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              {settings.performanceMode ? 'Enabled' : 'Standard'}
            </button>
          </div>
        </div>

        {/* Controls Reference */}
        <div className="border-t border-white/10 pt-4 text-xs text-stone-300 space-y-1.5">
          <div className="font-semibold text-stone-100 text-sm mb-1">Controls</div>
          <div>Desktop: A / D or Left / Right to switch lanes · W / Up / Space to jump · S / Down to slide · Esc to pause</div>
          <div>Mobile Touch: Swipe Left / Right / Up / Down · Tap equipment icons to activate abilities</div>
        </div>

        {/* Save Reset */}
        <div className="border-t border-white/10 pt-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Saved Progress</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-rose-950/80 border border-rose-400/40">
              <span className="text-xs text-rose-100">Erase all scores, fragments, and items?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1.5 rounded bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 rounded bg-stone-800 text-stone-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
