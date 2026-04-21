import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Shield, Sparkles } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  faction: string;
  reputation: string;
}

interface Props {
  friendId: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function FriendCharacters({ friendId, selectedIds = [], onSelectionChange }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'characters'),
      where('userId', '==', friendId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Character[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Character);
      });
      setCharacters(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [friendId]);

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(idx => idx !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  if (loading) return <div className="text-center py-8 text-gold italic">Consulting the distant records...</div>;

  return (
    <div>
      {characters.length === 0 ? (
        <div className="text-center py-12 opacity-50 italic font-serif">
          This adventurer has not yet chronicled their journey.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {characters.map(char => {
            const isSelected = selectedIds.includes(char.id);
            return (
              <div 
                key={char.id} 
                onClick={() => toggleSelect(char.id)}
                className={`p-4 rounded-xl relative overflow-hidden group border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-emerald-900/10 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                    : 'bg-black/60 border-slate-800 hover:border-blue-500/30'
                }`}
              >
                {/* Select Checkbox */}
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-all z-20 ${
                  isSelected 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'border-slate-700 group-hover:border-slate-600'
                }`}>
                  {isSelected && <span className="text-[10px]">✓</span>}
                </div>

                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles className="w-24 h-24 text-blue-400" />
                </div>
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-blue-900/20 border-blue-500/30 text-blue-400'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold transition-colors ${isSelected ? 'text-emerald-300' : 'text-blue-300'}`}>{char.name}</h4>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest flex gap-2">
                      Level {char.level} • {char.faction}
                    </div>
                    <div className="mt-2 text-xs font-serif italic text-slate-400">
                      "{char.reputation}"
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
