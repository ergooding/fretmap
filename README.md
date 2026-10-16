# Fretmap

A guitar fretboard trainer that runs as a single page: intervals, scales and modes, positions, chord-aware drills, chord progressions to strum and arpeggiate with a metronome, and exercises you can gather into named practice sessions.

**Live:** https://ergooding.github.io/fretmap/

## Modes

- **Explore**: see every degree of a scale around the key. With a song in focus, it explains the song instead: its key and the pentatonic to solo with, what each chord does there, the notes and mode to play over it (with swaps for chords from outside the key), and how it leads into the next chord.
- **Quiz**: interval quizzes that weight the intervals you miss. **Name it** asks which degree a note is; **Find it** asks where a degree sits, with a How to find it panel showing the shape each interval makes on the neck.
- **Drill**: one builder, in foldable rows down the side, sets up everything you play. Every chip has a tooltip that explains it in plain words, with an example in your key.
  - **Chords**: **One chord** (pick which one in the **Over** row: I, ii, V and so on), a common progression (pop, doo-wop, ii V I, 12-bar blues, Andalusian and more) built from the key and mode, or one of your songs from the **Song ▾** menu. A song with parts adds a **Part** row to play the whole song or just one part.
  - **Play each chord**: **Strum**, **Strum, then pick**, **Pick**, the bluegrass styles (**Boom-chuck**: bass on 1 and 3, a strum on 2 and 4, walking into each new chord; **Crosspick**: rolls across the top three strings with strict alternate picking; **Travis**: the thumb alternating the bass, fingers on the ands), a **Scale line**, or **Chord tones**. A scale line plays a **Line** pattern (up and down, two strings, 3rds, groups of 3 or 4) starting and ending on the root; over a progression, **Over the changes** either runs straight through the box while the chords go round underneath, or restarts the pattern from each chord's root. Chord tones play the notes of whichever chord is sounding, bar by bar: as an arpeggio, circling them from the scale notes above and below, or as a walk that lands a chord tone on every beat. Lines take a **Technique**: any picking, strict alternate, or hammer-ons and pull-offs, each marked in the tab. Strumming takes a **Strum pattern**, also edited in the strum card under the neck: plain 8ths through ghost strums, 16ths, syncopation, and shuffle, with the counting under each step; edit any step to make your own.
  - **Where**: **Follow the focus** (the position in the header), **Open position**, **Each shape in turn** (the next CAGED shape of the home chord after every pass), or the **Whole neck**, where lines climb through all five shapes and each chord takes the usual shape closest to the nut. The bluegrass styles move to the open position and back.
  - **Save as a new exercise** keeps the setup under Yours in the Exercises tab.

  The neck, tab and song sheet follow along: a tile per bar with the chord, its roman numeral and the frets you'll play, lighting up the current bar. Tempo, Play, the count and Mark clean sit in one practice bar. Everything else (7ths, notes per beat, click, notes, shuffle, dot labels, what the neck shows while playing, and the tempo ramp) is in the ⚙ Settings sheet.
- **Exercises**: a library of **Starting points** (box patterns, chord tones, picking technique, the home chord in each CAGED shape, progressions, your songs), the setups you saved under **Yours**, and the interval quiz under **Ear**. Each one opens Drill with the same builder rows, set up for it, and is built from the focus (key, scale, mode, and position if you pick one) in the header above the tabs, which every tab shares; pentatonic and blues focuses borrow chords from the 7-note mode they sit in. Try any exercise on its own, or add it to a named **practice session**: an ordered list you can rename, reorder (drag or ↑ ↓), duplicate or delete, which remembers where you stopped. The app starts with a **Weeknight** session (box patterns, picking technique, progressions, your songs). An exercise shows a ✓ on each chip played clean at the goal tempo, and a strip to step through the session. **Customize** picks which choices show as chips, what the exercise starts with, and its goal; changes made in Drill can be saved back to the session.
- **Songs**: your songs, with their Songsterr links and a rating for how well you play them. Type each part's chords the way you'd write them (for example "(A, E6, Dmaj7) x2, A, E6, D, A"), a bar each, with slash chords such as C/G keeping their bass note lowest and square brackets sharing a bar ([C G] for two beats each, [C . . G] for three and one); parts play one after another. Tap a chord to pick its voicing from a few shapes drawn as diagrams, or type your own, such as 000220. A capo setting counts frets from the capo and plays everything that many half steps higher, so you type the shapes as the tab writes them. Each song keeps its own strum pattern, edited here or in Drill, and any part can have its own pattern instead. **Practice** opens Drill on the song, where the Part row plays the whole song or just one part.

Progress is kept in the browser; add a GitHub token with only the gist permission to sync it between devices through a private gist (under Sync and backup on the Exercises tab), or export and import it as a file. The focus bar has two modes: **Key** (key, scale, mode and position) and **Song**, which focuses every tab on one of your songs: its key everywhere, and its chords, strum pattern and tempo in Drill. Switching back to Key puts back the key you had. The ? button opens a glossary, along with the keyboard shortcuts. It all stays one page, but the browser's Back button steps back through the tabs, songs, settings and glossary you opened.

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
