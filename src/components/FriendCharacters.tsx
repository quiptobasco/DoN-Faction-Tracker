import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Shield, Sparkles, ExternalLink } from 'lucide-react';
import { getReputationClasses } from '../lib/repUtils';

interface Character {
  id: string;
  name: string;
  faction: string;
  reputation: string;
  reputationValue?: number;
}

interface Props {
  friendId: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onSelectCharacter?: (id: string) => void;
}

export default function FriendCharacters({ friendId, selectedIds = [], onSelectionChange, onSelectCharacter }: Props) {
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

  const sortedCharacters = useMemo(() => {
    const sortOption = localStorage.getItem('norrath_character_sort_by') || 'name';
    const result = [...characters];
    result.sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'reputation') {
        const repA = a.reputationValue ?? 0;
        const repB = b.reputationValue ?? 0;
        if (repB !== repA) return repB - repA;
        return a.name.localeCompare(b.name); // Tie-break with name
      }
      return 0;
    });
    return result;
  }, [characters]);

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
      {sortedCharacters.length === 0 ? (
        <div className="text-center py-12 opacity-50 italic font-serif">
          This adventurer has not yet chronicled their journey.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedCharacters.map(char => {
            const isSelected = selectedIds.includes(char.id);
            return (
              <div 
                key={char.id} 
                onClick={() => {
                  if (onSelectCharacter) {
                    onSelectCharacter(char.id);
                  } else {
                    toggleSelect(char.id);
                  }
                }}
                className={`p-4 rounded-xl relative overflow-hidden group border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-emerald-900/10 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                    : 'bg-black/60 border-slate-800 hover:border-blue-500/30'
                }`}
              >
                {/* Select Checkbox */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(char.id);
                  }}
                  className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-all z-20 hover:scale-115 ${
                    isSelected 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-slate-700 bg-black/40 group-hover:border-slate-500'
                  }`}
                  title={isSelected ? "Remove from compare" : "Select for compare"}
                >
                  {isSelected && <span className="text-[10px]">✓</span>}
                </div>

                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles className="w-24 h-24 text-blue-400" />
                </div>
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-black text-xs shrink-0 transition-colors ${
                    isSelected 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                      : char.faction === "Dark Reign" ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-blue-900/20 border-blue-500/30 text-blue-400'
                  }`}>
                    {char.faction === "Dark Reign" ? 'DR' : 'NK'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-lg font-bold transition-colors flex items-center gap-1.5 truncate ${
                      isSelected ? 'text-emerald-300 font-bold' : 'text-blue-300 group-hover:text-blue-200'
                    }`}>
                      {char.name}
                      {onSelectCharacter && (
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      )}
                    </h4>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest flex gap-2">
                      {char.faction}
                    </div>
                    <div className={`mt-2 text-xs transition-all duration-300 ${getReputationClasses(char.reputationValue ?? 0)}`}>
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
