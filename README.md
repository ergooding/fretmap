# Fretmap

A guitar fretboard trainer that runs as a single page: intervals, scales and modes, positions, and chord-aware drills with a metronome.

**Live:** https://YOUR-USERNAME.github.io/fretmap/

## Modes

- **Explore**: see every degree of a scale around the key.
- **Name it** and **Find it**: interval quizzes that weight the intervals you miss.
- **Drill**: pick a 5-fret box, then play patterns through it against a chord with a count-in, tab, fingerings, a chord diagram, and optional chord hits on beat 1.

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

`npm run test:tips` is quick. `npm run test:audit` tries every settings combination and takes a few minutes.
