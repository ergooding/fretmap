# Fretmap

A guitar fretboard trainer that runs as a single page: intervals, scales and modes, positions, chord-aware drills, chord progressions to strum and arpeggiate with a metronome, and a learning path from scales to songs.

**Live:** https://ergooding.github.io/fretmap/

## Modes

- **Explore**: see every degree of a scale around the key. With a song in focus, it explains the song instead: its key and the pentatonic to solo with, what each chord does there, the notes and mode to play over it (with swaps for chords from outside the key), and how it leads into the next chord.
- **Quiz**: interval quizzes that weight the intervals you miss. **Name it** asks which degree a note is; **Find it** asks where a degree sits.
- **Drill**: pick a 5-fret box (the positions are the CAGED shapes of the home chord) or the whole neck, then either
  - **Scale lines**: play patterns through it, starting and ending on the root, against a chord with a count-in, tab, fingerings, a chord diagram, and optional chord hits on beat 1, or
  - **Strum chords**: pick a common progression (pop, doo-wop, ii V I, 12-bar blues, Andalusian and more) built from the key and mode, or one of your songs. The song sheet shows a tile per bar with the chord, its roman numeral and the frets you'll play, and lights up the current bar. Play each chord as a bar of strumming, a bar of the same shape picked, or both. The strum card under the neck holds the pattern: plain 8ths through ghost strums, 16ths, syncopation, and shuffle, with the counting under each step; edit any step to make your own.

  Tempo, Play, the count and Mark clean sit in one practice bar. Everything else (each chord, 7ths, notes per beat, click, notes, shuffle, dot labels, what the neck shows while playing, and the tempo ramp) is in the ⚙ Settings sheet.
- **Path**: a learning path from scales, CAGED box by box and then one run up the whole neck, to the home chord in each position, to progressions, to your songs, with a rhythm track of strum patterns alongside. Every step is built from the focus (key, scale, mode, and position if you pick one) in the header above the tabs, which every tab shares; pentatonic and blues focuses borrow chords from the 7-note mode they sit in. Each step opens Drill set up for it and is done when you mark a run clean at its goal tempo.
- **Songs**: your songs, with their Songsterr links and a rating for how well you play them. Type each part's chords the way you'd write them (for example "(A, E6, Dmaj7) x2, A, E6, D, A"), a bar each, with slash chords such as C/G keeping their bass note lowest and square brackets sharing a bar ([C G] for two beats each, [C . . G] for three and one); parts play one after another. Tap a chord to pick its voicing from a few shapes drawn as diagrams, or type your own, such as 000220. A capo setting counts frets from the capo and plays everything that many half steps higher, so you type the shapes as the tab writes them. Each song keeps its own strum pattern, edited here or in Drill, and any part can have its own pattern instead. **Practice** opens Drill on the song, where a Part switch plays the whole song or just one part.

Progress is kept in the browser; add a GitHub token with only the gist permission to sync it between devices through a private gist (under Sync and backup on the Path tab), or export and import it as a file. The focus bar has two modes: **Key** (key, scale, mode and position) and **Song**, which focuses every tab on one of your songs: its key everywhere, and its chords, strum pattern and tempo in Drill. Switching back to Key puts back the key you had. The ? button opens a glossary, along with the keyboard shortcuts.

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
