import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Swords, ArrowLeft, Shield } from 'lucide-react';
import { FACTIONS } from '../lib/constants';

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CharacterCreate({ onCancel, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(70);
  const [faction, setFaction] = useState(FACTIONS[0]);
  const [reputationValue, setReputationValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getReputationLabel = (value: number): string => {
    if (value >= 1100) return 'Ally';
    if (value >= 750) return 'Warmly';
    if (value >= 500) return 'Kindly';
    if (value >= 100) return 'Amiably';
    if (value >= 0) return 'Indifferent';
    if (value >= -100) return 'Apprehensively';
    if (value >= -500) return 'Dubiously';
    if (value >= -750) return 'Threateningly';
    return 'Scowls (Ready to Attack)';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'characters'), {
        userId: auth.currentUser.uid,
        name,
        level: Number(level),
        faction,
        reputation: getReputationLabel(reputationValue),
        reputationValue: Number(reputationValue),
        completedTasks: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-parchment/10 rounded-full transition-colors text-gold">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-serif font-bold text-gold">Create New Character</h2>
      </div>

      <form onSubmit={handleSubmit} className="fancy-card p-8 space-y-8 border-t-2 border-t-blue-500/30">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">
              Adventurer Name
            </label>
            <input
              type="text"
              required
              className="fancy-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thalric Ironheart"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">
              Experience Level
            </label>
            <input
              type="number"
              required
              min={1}
              max={125}
              className="fancy-input w-full"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Faction Allegiance</label>
          <div className="grid grid-cols-2 gap-4">
            {FACTIONS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFaction(f)}
                className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${
                  faction === f 
                    ? 'glass-panel border-blue-500/50 bg-blue-900/20 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'bg-black/20 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <Shield className={`w-6 h-6 ${faction === f ? 'text-blue-400' : 'opacity-30'}`} />
                <span className="font-serif text-lg tracking-tight">{f}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1 flex justify-between">
            <span>Numerical Standing (-2000 to +2000)</span>
            <span className={`text-sm tracking-normal font-sans transition-colors ${
              reputationValue >= 100 ? 'text-emerald-400 stat-glow' : 
              reputationValue < 0 ? 'text-red-400' : 'text-blue-400'
            }`}>
              {getReputationLabel(reputationValue)}
            </span>
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="number"
              min={-2000}
              max={2000}
              className="fancy-input flex-1"
              value={reputationValue}
              onChange={(e) => setReputationValue(Number(e.target.value))}
            />
            <div className="w-1/2 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-300 ${
                  reputationValue >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.abs(reputationValue) / 20}%`,
                  marginLeft: reputationValue >= 0 ? '50%' : `${50 - (Math.abs(reputationValue) / 20)}%` 
                }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between text-[8px] uppercase tracking-tighter text-slate-600 px-1">
            <span>Scowls</span>
            <span>Indifferent</span>
            <span>Ally</span>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded border border-red-400/20 text-center font-sans tracking-wide">
            {error}
          </div>
        )}

        <div className="flex gap-4 pt-4 border-t border-slate-700/50">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors font-sans font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 fancy-button flex items-center justify-center gap-2"
          >
            {loading ? 'Scribing...' : (
              <>
                <Swords className="w-5 h-5" /> Begin Chronicles
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  );
}
