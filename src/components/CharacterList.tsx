import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { PlusCircle, Shield, User, Trash2, Filter, ArrowUpDown } from 'lucide-react';
import { getReputationClasses } from '../lib/repUtils';

interface Character {
  id: string;
  name: string;
  faction: string;
  reputation: string;
  reputationValue?: number;
}

interface Props {
  onAddCharacter: () => void;
  onSelectCharacter: (id: string) => void;
}

type SortOption = 'name' | 'reputation';
type FactionFilter = 'All' | "Norrath's Keepers" | 'Dark Reign';

export default function CharacterList({ onAddCharacter, onSelectCharacter }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter and Sort states
  const [factionFilter, setFactionFilter] = useState<FactionFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('name');

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
    }, (error) => handleFirestoreError(error, 'listen', 'characters'));

    return unsubscribe;
  }, []);

  const processedCharacters = useMemo(() => {
    let result = [...characters];

    // Filter by Faction
    if (factionFilter !== 'All') {
      result = result.filter(char => char.faction === factionFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'reputation') {
        const repA = a.reputationValue ?? 0;
        const repB = b.reputationValue ?? 0;
        if (repB !== repA) return repB - repA;
        return a.name.localeCompare(b.name); // Tie-break with name
      }
      return 0;
    });

    return result;
  }, [characters, factionFilter, sortBy]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'characters', id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting character:', err);
    }
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
        <div className="flex items-center justify-between lg:justify-start gap-4">
          <h2 className="text-2xl font-serif font-bold text-gold">Your Adventurers</h2>
          <button 
            onClick={onAddCharacter}
            className="fancy-button flex items-center gap-2 lg:hidden"
          >
            <PlusCircle className="w-5 h-5" /> Add
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Faction Filter */}
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={factionFilter} 
              onChange={(e) => setFactionFilter(e.target.value as FactionFilter)}
              className="bg-transparent text-[10px] uppercase font-black tracking-widest text-slate-300 outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#161b22]">All Factions</option>
              <option value="Norrath's Keepers" className="bg-[#161b22]">Norrath's Keepers</option>
              <option value="Dark Reign" className="bg-[#161b22]">Dark Reign</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-[10px] uppercase font-black tracking-widest text-slate-300 outline-none cursor-pointer"
            >
              <option value="name" className="bg-[#161b22]">Sort by Name</option>
              <option value="reputation" className="bg-[#161b22]">Sort by Reputation</option>
            </select>
          </div>

          <button 
            onClick={onAddCharacter}
            className="fancy-button hidden lg:flex items-center gap-2 shrink-0 ml-2"
          >
            <PlusCircle className="w-5 h-5" /> Add Character
          </button>
        </div>
      </div>

      {processedCharacters.length === 0 ? (
        <div className="fancy-card p-12 text-center border-dashed border-slate-600 bg-transparent">
          <User className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 italic font-serif">
            {characters.length === 0 
              ? "No characters tracked yet. Begin your chronicles by adding a character." 
              : "No characters match your current filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {processedCharacters.map((char) => {
            const isDR = char.faction === "Dark Reign";
            return (
              <div 
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className={`glass-panel p-6 cursor-pointer transition-all group relative border-t-2 border-t-transparent ${
                  isDR 
                    ? 'hover:border-red-500/50 hover:bg-red-900/10' 
                    : 'hover:border-blue-500/50 hover:bg-blue-900/10'
                }`}
              >
                <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield className={`w-12 h-12 ${isDR ? 'text-red-400' : 'text-blue-400'}`} />
                </div>
                
                <div className="relative z-10">
                  <h3 className={`text-xl font-bold text-white transition-colors ${
                    isDR ? 'group-hover:text-red-300' : 'group-hover:text-blue-300'
                  }`}>{char.name}</h3>
                  <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest mt-1 ${
                    isDR ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {char.faction}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <div className="text-[10px] uppercase tracking-tighter text-slate-500">Reputation</div>
                    <div className="flex items-center gap-3">
                      <div className={`text-xs ${getReputationClasses(char.reputationValue ?? 0)} transition-all duration-300`}>
                        {char.reputation} {char.reputationValue !== undefined && `(${char.reputationValue > 0 ? '+' : ''}${char.reputationValue})`}
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, char.id)}
                        className={`p-1.5 transition-all z-20 rounded flex items-center gap-1 ${
                          deleteConfirmId === char.id 
                            ? 'bg-red-500 text-white px-2 animate-pulse' 
                            : 'text-slate-600 hover:text-red-400'
                        }`}
                        title={deleteConfirmId === char.id ? "Confirm Delete" : "Delete Character"}
                      >
                        {deleteConfirmId === char.id ? (
                          <span className="text-[10px] font-black uppercase">Confirm?</span>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
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
