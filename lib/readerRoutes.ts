// Which routes are full-screen readers. On these the global bottom navigation
// bar is hidden: the reader has its own back button and bottom control
// capsule, and the collapsed nav button otherwise sits on top of the text
// (docs/reader-experience/PROGRESS.md, decision 1).
//
// `segments` are expo-router's useSegments() for the current route, e.g.
// ['dharm-veer', '[id]'] or ['bhakti', 'stotram', '[id]']. List pages
// (['dharm-veer'], ['vrat'], ['bhakti', 'katha']) are not readers.
export function isReaderRoute(segments: readonly string[]): boolean {
  const [root, second] = segments;
  if (root === 'pathshala') return segments.length >= 3;
  if (root === 'dharm-veer' || root === 'vrat' || root === 'festival') return segments.length >= 2;
  if (root === 'bhakti') return (second === 'stotram' || second === 'katha') && segments.length >= 3;
  return false;
}
