export const FACTIONS = ["Norrath's Keepers", "Dark Reign"] as const;

export type Faction = typeof FACTIONS[number];

export interface Task {
  id: string;
  name: string;
  type: 'Solo Task' | 'Group Mission' | 'Raid';
}

export interface Tier {
  id: number;
  name: string;
  reputation: string;
  tasks: Task[];
}

export const NORRATHS_KEEPERS_TIERS: Tier[] = [
  {
    id: 1,
    name: 'Tier 1',
    reputation: 'Indifferent',
    tasks: [
      { id: 'nk1-s1', name: 'Creating the Antidote', type: 'Solo Task' },
      { id: 'nk1-s2', name: 'Burning Arrows', type: 'Solo Task' },
      { id: 'nk1-s3', name: 'Greed of the Goblins', type: 'Solo Task' },
      { id: 'nk1-g1', name: 'Children of Gimblax', type: 'Group Mission' },
    ]
  },
  {
    id: 2,
    name: 'Tier 2',
    reputation: 'Amiable',
    tasks: [
      { id: 'nk2-s1', name: 'Turn the Tides of the Sand', type: 'Solo Task' },
      { id: 'nk2-s2', name: 'Recover the Lost Map', type: 'Solo Task' },
      { id: 'nk2-s3', name: 'Defend the Kirin Contact', type: 'Solo Task' },
      { id: 'nk2-g1', name: 'Sickness of the Spirit', type: 'Group Mission' },
      { id: 'nk2-r1', name: 'Calling Emoush', type: 'Raid' },
    ]
  },
  {
    id: 3,
    name: 'Tier 3',
    reputation: 'High Amiable (300-500)',
    tasks: [
      { id: 'nk3-s1', name: 'Protect the Waters', type: 'Solo Task' },
      { id: 'nk3-s2', name: 'Snowfoot Revenge', type: 'Solo Task' },
      { id: 'nk3-s3', name: 'The Sacred Scrolls', type: 'Solo Task' },
      { id: 'nk3-g1', name: 'History of the Isle', type: 'Group Mission' },
      { id: 'nk3-r1', name: 'Trial of Perseverance', type: 'Raid' },
      { id: 'nk3-r2', name: 'Volkara’s Bite', type: 'Raid' },
    ]
  }
];
