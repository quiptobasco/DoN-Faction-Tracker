import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Circle, Shield, Trophy } from 'lucide-react';
import { NORRATHS_KEEPERS_TIERS, Tier, Task } from '../lib/constants';

interface Character {
  id: string;
  name: string;
  level: number;
  faction: string;
  reputation: string;
  reputationValue?: number;
  completedTasks: string[];
}

interface Props {
  characterId: string;
  onBack: () => void;
}

export default function CharacterDetails({ characterId, onBack }: Props) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedTaskIds, setEditedTaskIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'characters', characterId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as Character;
        setCharacter(data);
        // Only initialize state if we don't have a character yet (first load)
        // or if we want to sync after a successful save.
        // We'll use a functional update to check the current character value safely.
        setEditedTaskIds(prev => (prev.length === 0 && !character) ? data.completedTasks : prev);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [characterId, character]); // Added character to dependencies to handle the initial null check correctly

  const toggleTask = (taskId: string) => {
    setEditedTaskIds(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleUpdate = async () => {
    if (!character) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'characters', characterId), {
        completedTasks: editedTaskIds,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
      </div>
    );
  }

  if (!character) return null;

  const isNKSide = character.faction === "Norrath's Keepers";
  const hasChanges = JSON.stringify([...editedTaskIds].sort()) !== JSON.stringify([...character.completedTasks].sort());

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gold">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-serif font-bold faction-gold tracking-tight">{character.name}</h2>
            <div className="flex items-center gap-6 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Faction:</span>
                <span className="text-sm text-blue-300 font-bold tracking-wide uppercase">{character.faction}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Standing:</span>
                <span className="text-sm text-emerald-400 font-bold tracking-wide uppercase stat-glow">
                  {character.reputation} {character.reputationValue !== undefined && `(${character.reputationValue > 0 ? '+' : ''}${character.reputationValue})`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Overall Progression</div>
          <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_#3b82f6] transition-all duration-500" 
              style={{ width: `${(editedTaskIds.length / 15) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-300 font-mono">{Math.round((editedTaskIds.length / 15) * 100)}% Current</div>
          
          <div className="flex gap-4 mt-4">
            {hasChanges && (
              <button
                onClick={() => setEditedTaskIds(character.completedTasks)}
                disabled={saving}
                className="px-4 py-2 rounded-lg font-sans font-bold border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all"
              >
                Discard
              </button>
            )}
            <button
              onClick={handleUpdate}
              disabled={!hasChanges || saving}
              className={`px-6 py-2 rounded-lg font-sans font-bold transition-all ${
                hasChanges 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              {saving ? 'Saving...' : 'Update Chronicles'}
            </button>
          </div>
        </div>
      </div>

      {!isNKSide ? (
        <div className="fancy-card p-12 text-center border-t-2 border-t-emerald-500/30">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-2xl font-serif text-blue-200 mb-2">Dark Reign Intel Pending</h3>
          <p className="text-slate-400 max-w-md mx-auto">The scouts are still gathering information for the Dark Reign faction. For now, only Norrath's Keepers progression is available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NORRATHS_KEEPERS_TIERS.map((tier) => (
            <div key={tier.id} className="fancy-card border-t-2 border-t-blue-500/30">
              <h3 className="text-lg font-serif text-blue-200 border-b border-slate-700 pb-3 mb-4 flex justify-between items-center">
                <span>{tier.name}: {tier.reputation}</span>
                <span className="text-xs text-slate-500 font-sans">
                  {tier.tasks.filter(t => editedTaskIds.includes(t.id)).length}/{tier.tasks.length}
                </span>
              </h3>

              <div className="space-y-4">
                {tier.tasks.map((task) => {
                  const isCompleted = editedTaskIds.includes(task.id);
                  return (
                    <label 
                      key={task.id}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input 
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleTask(task.id)}
                        className="task-checkbox shrink-0"
                      />
                      <div className={`text-sm transition-colors ${
                        isCompleted ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'
                      }`}>
                        <span className="opacity-50 text-[10px] uppercase font-sans mr-1">{task.type.split(' ')[0]}:</span>
                        {task.name}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
