# Fretmap

A guitar fretboard trainer that runs as a single page: intervals, scales and modes, positions, chord-aware drills, chord progressions to strum and arpeggiate with a metronome, and a learning path from scales to songs.

**Live:** https://ergooding.github.io/fretmap/

## Modes

- **Explore**: see every degree of a scale around the key.
- **Name it** and **Find it**: interval quizzes that weight the intervals you miss.
- **Drill**: pick a 5-fret box, then either
  - **Scale lines**: play patterns through it against a chord with a count-in, tab, fingerings, a chord diagram, and optional chord hits on beat 1, or
  - **Strum chords**: pick a common progression (pop, doo-wop, ii V I, 12-bar blues, Andalusian and more) built from the key and mode, voiced inside the box, and play each chord as a bar of strumming, a bar of the same shape arpeggiated, or both. Strum patterns run from plain 8ths through ghost strums, 16ths, syncopation, and shuffle, with the counting under each step; edit any step to make your own.
- **Path**: a learning path from scales (all five A minor pentatonic boxes) to the chords inside each box, to progressions, to songs you add with their Songsterr links, with a rhythm track of strum patterns alongside, played in whatever key and scale you have selected. Each step opens Drill set up for it and is done when you mark a run clean at its goal tempo. Progress is kept in the browser; add a GitHub token with only the gist permission to sync it between devices through a private gist, or export and import it as a file.

The layout switches between phone and desktop based on the window shape. The ◐ button in the header overrides it.

## Project layout

- `index.html`: the whole app, with no build step. Edit it and push; GitHub Pages redeploys in about a minute.
- `tests/`: checks that run the app in a simulated browser (jsdom).
- `.nojekyll`: tells GitHub Pages to serve the files as-is.

## Running the tests

```
npm install
npm test
```

`npm run test:tips` and `npm run test:log` are quick. `npm run test:rhythm` checks every progression across keys, modes and boxes, and `npm run test:audit` tries every drill setting; each takes a few minutes.
