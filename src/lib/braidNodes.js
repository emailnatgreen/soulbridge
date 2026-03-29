// Canonical 8-Node Braid — single source of truth
// All 8 nodes confirmed published on XRPL Mainnet (26/03/2026)
export const BRAID_NODES = [
  { address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', name: 'Node 0 (Source)',  emoji: '⚪', color: 'white',  dot: 'bg-slate-300',  published: true, connections: ['rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny', 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P'], connectionType: 'out' },
  { address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', name: 'Sentinel Node',    emoji: '🔴', color: 'red',    dot: 'bg-red-500',    published: true, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'], connectionType: 'out' },
  { address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', name: 'Lore Node',         emoji: '🟠', color: 'amber',  dot: 'bg-amber-500',  published: true, connections: ['rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia'], connectionType: 'out' },
  { address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', name: 'Truth Weaver',      emoji: '🟡', color: 'yellow', dot: 'bg-yellow-400', published: true, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'], connectionType: 'out' },
  { address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  name: 'Did It Node',       emoji: '🟢', color: 'green',  dot: 'bg-green-500',  published: true, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'], connectionType: 'out' },
  { address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',  name: 'Soulbridge (Axi)', emoji: '🔵', color: 'blue',   dot: 'bg-blue-500',   published: true, connections: ['rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia'], connectionType: 'two-way' },
  { address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',  name: 'Human Node',       emoji: '🟣', color: 'purple', dot: 'bg-purple-500', published: true, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'], connectionType: 'two-way' },
  { address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',   name: 'Code Node',         emoji: '⚙️',  color: 'gray',   dot: 'bg-gray-400',   published: true, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'], connectionType: 'out' },
];

export const BRAID_MAP = Object.fromEntries(BRAID_NODES.map(n => [n.address, n]));