# Fretmap

A guitar fretboard trainer that runs as a single page: intervals, scales and modes, positions, chord-aware drills, chord progressions to strum and arpeggiate with a metronome, and a practice log.

**Live:** https://ergooding.github.io/fretmap/

## Modes

- **Explore**: see every degree of a scale around the key.
- **Name it** and **Find it**: interval quizzes that weight the intervals you miss.
- **Drill**: pick a 5-fret box, then either
  - **Scale lines**: play patterns through it against a chord with a count-in, tab, fingerings, a chord diagram, and optional chord hits on beat 1, or
  - **Progression**: pick a common progression (pop, doo-wop, ii V I, 12-bar blues, Andalusian and more) built from the key and mode, voiced inside the box, and play each chord as a bar of strumming, a bar of the same shape arpeggiated, or both. Strum patterns run from plain 8ths through ghost strums, 16ths, syncopation, and shuffle, with the counting under each step; edit any step to make your own.
- **Practice**: a log of what you practiced, filled in as you play drills and progressions and answer quizzes, plus songs and other practice you add by hand. Shows your best clean tempo for each skill and your time this week. The log stays in the browser; add a GitHub token with only the gist permission to sync it between devices through a private gist, or export and import it as a file.

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
