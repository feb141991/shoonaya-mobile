import type { KulFamilyMember } from './kul';
import type { LayoutVanshEdge, LayoutVanshNode } from './vanshLayout';

export const SAMPLE_VANSH_MEMBERS: KulFamilyMember[] = [
  // Gen 1: Paternal Grandparents (Pitri Paksha)
  { id: 'dada', name: 'Pt. Ramdas Sharma', role: 'पितामह (Pitamaha)', generation: 1, is_alive: false, parent_id: null, spouse_id: 'dadi', linked_user_id: null },
  { id: 'dadi', name: 'Savitri Devi', role: 'पितामही (Pitamahi)', generation: 1, is_alive: false, parent_id: null, spouse_id: 'dada', linked_user_id: null },

  // Gen 1: Maternal Grandparents (Matri Paksha)
  { id: 'nana', name: 'Gopal Krishna Upadhyay', role: 'मातामह (Matamaha)', generation: 1, is_alive: false, parent_id: null, spouse_id: 'nani', linked_user_id: null },
  { id: 'nani', name: 'Kanti Devi', role: 'मातामही (Matamahi)', generation: 1, is_alive: false, parent_id: null, spouse_id: 'nana', linked_user_id: null },

  // Gen 2: Parents & Uncles / Aunts
  { id: 'pitaji', name: 'Devendra Sharma', role: 'जनक / पिता (Pita)', generation: 2, is_alive: true, parent_id: 'dada', spouse_id: 'mataji', linked_user_id: null },
  { id: 'mataji', name: 'Sunita Sharma (Upadhyay)', role: 'माता / जननी (Mata)', generation: 2, is_alive: true, parent_id: 'nana', spouse_id: 'pitaji', linked_user_id: null },
  { id: 'tauji', name: 'Surendra Sharma', role: 'तात / ताऊजी (Tauji)', generation: 2, is_alive: true, parent_id: 'dada', spouse_id: null, linked_user_id: null },
  { id: 'mamaji', name: 'Rajesh Upadhyay', role: 'मातुल / मामा (Mamaji)', generation: 2, is_alive: true, parent_id: 'nana', spouse_id: null, linked_user_id: null },

  // Gen 3: Self, Spouse, Brother, Cousin
  { id: 'self', name: 'Arjun Sharma', role: 'आत्मज (Self)', generation: 3, is_alive: true, parent_id: 'pitaji', spouse_id: 'patni', linked_user_id: 'user_active' },
  { id: 'patni', name: 'Pooja Sharma', role: 'धर्मपत्नी (Dharmapatni)', generation: 3, is_alive: true, parent_id: null, spouse_id: 'self', linked_user_id: null },
  { id: 'bhai', name: 'Rohan Sharma', role: 'अनुज / भाई (Brother)', generation: 3, is_alive: true, parent_id: 'pitaji', spouse_id: null, linked_user_id: null },
  { id: 'cousin', name: 'Amit Upadhyay', role: 'मातुल-पुत्र (Cousin)', generation: 3, is_alive: true, parent_id: 'mamaji', spouse_id: null, linked_user_id: null },

  // Gen 4: Children / Next Gen
  { id: 'son', name: 'Aarav Sharma', role: 'पुत्र / वंशधर (Son)', generation: 4, is_alive: true, parent_id: 'self', spouse_id: null, linked_user_id: null },
  { id: 'daughter', name: 'Ananya Sharma', role: 'पुत्री (Daughter)', generation: 4, is_alive: true, parent_id: 'self', spouse_id: null, linked_user_id: null },
];

export function getSampleVanshLayout(): { nodes: LayoutVanshNode[]; edges: LayoutVanshEdge[] } {
  const nodes: LayoutVanshNode[] = SAMPLE_VANSH_MEMBERS.map((m, idx) => ({
    data: m,
    resolvedParentId: m.parent_id,
    x: (idx % 4) * 110,
    y: (m.generation ?? 3) * 110,
    width: 140,
    height: 110,
    generation: m.generation ?? 3,
    columnIndex: (idx % 4),
    isRemembered: !m.is_alive,
  }));

  const edges: LayoutVanshEdge[] = [
    // Dada-Dadi marriage & descent to Parents
    { id: 'l1', fromId: 'dada', toId: 'dadi', type: 'spouse', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l2', fromId: 'dada', toId: 'pitaji', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l3', fromId: 'dada', toId: 'tauji', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },

    // Nana-Nani marriage & descent to Mother / Mama
    { id: 'l4', fromId: 'nana', toId: 'nani', type: 'spouse', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l5', fromId: 'nana', toId: 'mataji', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l6', fromId: 'nana', toId: 'mamaji', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },

    // Father-Mother marriage & descent to Self / Sibling
    { id: 'l7', fromId: 'pitaji', toId: 'mataji', type: 'spouse', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l8', fromId: 'pitaji', toId: 'self', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l9', fromId: 'pitaji', toId: 'bhai', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l10', fromId: 'mamaji', toId: 'cousin', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },

    // Self-Wife marriage & descent to Children
    { id: 'l11', fromId: 'self', toId: 'patni', type: 'spouse', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l12', fromId: 'self', toId: 'son', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
    { id: 'l13', fromId: 'self', toId: 'daughter', type: 'parent_child', startX: 0, startY: 0, endX: 0, endY: 0, pathD: '' },
  ];

  return { nodes, edges };
}

export function getEffectiveVanshLayout(layout: { nodes: LayoutVanshNode[]; edges: LayoutVanshEdge[]; crest: any }): { nodes: LayoutVanshNode[]; edges: LayoutVanshEdge[]; crest: any } {
  const parentChildCount = layout.edges.filter((e) => e.type === 'parent_child').length;
  const isMinimalGraph = layout.nodes.length < 5 || parentChildCount < 2;

  if (isMinimalGraph) {
    const sample = getSampleVanshLayout();
    if (layout.nodes.length >= 1) {
      const u1 = layout.nodes[0]?.data;
      const u2 = layout.nodes[1]?.data;
      const mapped = sample.nodes.map((n) => {
        if (n.data.id === 'self' && u1) {
          return { ...n, data: { ...n.data, name: u1.name, role: u1.role || 'आत्मज (Self)' } };
        }
        if (n.data.id === 'patni' && u2) {
          return { ...n, data: { ...n.data, name: u2.name, role: u2.role || 'धर्मपत्नी (Spouse)' } };
        }
        return n;
      });
      return { nodes: mapped, edges: sample.edges, crest: layout.crest };
    }
    return { nodes: sample.nodes, edges: sample.edges, crest: layout.crest };
  }
  return layout;
}
