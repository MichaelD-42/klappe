// The klappe/fx exports a deck author does not call: pure helpers (layout, parsing, maths) and engine-only parts.
// demo-coverage and skill-catalog skip them.
export const ALLOW = [
  'KEN_BURNS', 'LANGS', 'cleanSvg', 'donutSlices', 'kpiDelta', 'raceRanks', 'spread', 'shapeEdge', 'tagSpread', 'waffleCells', 'scribble', 'MARKER_MIX', 'scrambleGlyphs', 'MAX_LINES', 'MIN_FONT', 'anchor', 'arcPath', 'chartDomain', 'codeLines', 'counted', 'counterText', 'bubbleLayout', 'wrapBreaks', 'crtColor', 'cursorCentre',
  'dataError', 'edgePath', 'fitFont', 'fitProjection', 'flowRoutes', 'iconGlyph', 'labelPos', 'limbAngle', 'matrixLayout', 'lineDiff', 'loadHighlighter',
  'parseCsv', 'parseGroups', 'roadmapLayout', 'rowY', 'shatterGeometry', 'showsSample', 'splitConsole', 'swarmPoint', 'swimlaneRoutes',
  'gitLayout', 'scatterTracks', 'zoomLayout', 'zoomView', 'timerState', 'treeLayout', 'treeRoute', 'typed', 'untilMs', 'waterfallSteps',
  // The transition functions: demo-coverage checks the transition kinds instead.
  'loadTransitions', 'playTransition', 'registry', 'transitionCrt', 'transitionShatter', 'transitionZoom',
  'funnelLayout', 'sankeyLayout', // funnel-sankey: chart layout helpers
  'gaugeAngle', 'likertShares', // gauge task
  'cycleLayout', 'vModelLayout', // cycle task: the cycle and vModel layouts, for their unit test
  'pyramidLayout', 'vennLayout', // venn-pyramid task
  'NOTE_MIX', 'fanPose', 'stickyLayout', // notes-cards: the note colour mix and the two layouts, for their unit tests
  'cloudLayout', // cloud-quote task: the word cloud layout, for its unit test
  'wordDiff', 'flapGlyphs', // redline-flap task: the word diff and the board glyphs, for their unit test
  'barInk', 'sankeyPalette', 'scatterIn', // fix-w3: funnel value ink, sankey node colours, sticky-note scatter, for their unit tests
  'loupeOffset', // loupe task: the lens offset, for its unit test
  'irisHole', 'irisRadius', 'pushOffset', // push-iris: the transition geometry, for its unit test
  'glitchFrame', 'pagePeel', 'transitionCube', 'transitionGlitch', 'transitionPageTurn', // glitch-cube-page: the transitions (covered by their kinds); the glitch frame and the peel, for their unit test
  'handwriteGlyphs', // handwriting task: the per-glyph write timing, for its unit test
  'loadKatex', // formula: KaTeX's one-time load, engine only
  'fishboneLayout', // fishbone: the bone layout, for its unit test
  'mindMapLayout', // mind map: the radial layout, for its unit test
  'layerStackLayout', // layer stack: the slab geometry, for its unit test
  'depLayout', 'depReach', // dependency graph: the columns and the trace's hops, for their unit test
  'calendarLayout', 'calendarSpan', // calendar: the month grid and a span's week bars, for their unit test
  'magicBox', 'magicFit', 'transitionMagicMove', // magic-move: the transition (covered by its kind); the rect and pose maths, for its unit test
]
