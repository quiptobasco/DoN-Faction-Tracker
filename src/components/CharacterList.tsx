import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PlusCircle, Shield, User } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  faction: string;
  reputation: string;
  reputationValue?: number;
}

interface Props {
  onAddCharacter: () => void;
  onSelectCharacter: (id: string) => void;
  onSelectionChange?: (ids: string[]) => void;
  selectedIds?: string[];
}

export default function CharacterList({ onAddCharacter, onSelectCharacter, onSelectionChange, selectedIds = [] }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'characters'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const charData: Character[] = [];
      snapshot.forEach((doc) => {
        charData.push({ id: doc.id, ...doc.data() } as Character);
      });
      setCharacters(charData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(idx => idx !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-serif font-bold text-gold">Your Adventurers</h2>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{selectedIds.length} Selected</span>
              <button 
                onClick={() => onSelectionChange?.([])}
                className="text-[10px] text-slate-500 hover:text-white uppercase font-bold"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={onAddCharacter}
          className="fancy-button flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" /> Add Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="fancy-card p-12 text-center border-dashed border-slate-600 bg-transparent">
          <User className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 italic font-serif">No characters tracked yet. Begin your chronicles by adding a character.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => {
            const isSelected = selectedIds.includes(char.id);
            return (
              <div 
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className={`glass-panel p-6 cursor-pointer transition-all group relative border-t-2 ${
                  isSelected 
                    ? 'border-t-emerald-500 bg-emerald-900/5 ring-1 ring-emerald-500/30' 
                    : 'border-t-transparent hover:border-blue-500/50 hover:bg-blue-900/10'
                }`}
              >
                {/* Select Checkbox */}
                <div 
                  onClick={(e) => toggleSelect(e, char.id)}
                  className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-20 ${
                    isSelected 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                      : 'border-slate-700 hover:border-slate-500 scale-90 group-hover:scale-100'
                  }`}
                >
                  {isSelected && <span className="text-xs">✓</span>}
                </div>

                <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield className="w-12 h-12 text-blue-400" />
                </div>
                
                <div className="relative z-10">
                  <h3 className={`text-xl font-bold transition-colors ${isSelected ? 'text-emerald-300' : 'text-white group-hover:text-blue-300'}`}>{char.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-blue-400 uppercase tracking-widest mt-1">
                    Level {char.level} <span className="opacity-30">•</span> {char.faction}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <div className="text-[10px] uppercase tracking-tighter text-slate-500">Reputation</div>
                    <div className="text-xs font-bold text-emerald-400 stat-glow uppercase tracking-wider">
                      {char.reputation} {char.reputationValue !== undefined && `(${char.reputationValue > 0 ? '+' : ''}${char.reputationValue})`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
