# The Tea Ride · Remixed

[简体中文](README.md) | English

This remix adds free riding, manual flight, a clickable control panel and eight replayable scenes from the original film.

An 81.6-second film about a young man drinking tea on a giant pelican. It plays live in the browser from **one HTML file**, and every note of its score moves something on screen.

It opens on a flat woodblock print. The colour blocks go down on four clacks, the sun switches on at 4.8 s, and the sheet opens into a 3D world. The ride goes through a market, a tea break, a lemon chase, a run off the pier at sunset, a night flight through hundreds of lanterns and a landing on the lake. The film closes on the print with its seal and then loops.

![Frames from the film](stills/sheet.jpg)

## Pure three.js

- The page embeds [three.js](https://threejs.org) r180. Custom code handles post-processing, physics and audio.
- The browser generates every mesh, texture, shader, movement and note when the page loads.
- The page runs offline directly from disk.

## Play or watch

Download or clone the repository and open the local `index.html` in a browser with WebGL 2. Pick **自由骑行** (Free ride) to explore the market, pier and lake, or **播放短片** (Play film) to watch the original film.

The interface starts in Simplified Chinese. Select **English** on the start screen or use the language button during play.

### Free ride

| Input | Action |
|---|---|
| `W` / `↑`, `S` / `↓` | Move forward and back. In flight, speed up and brake |
| `A` / `←`, `D` / `→` | Steer left and right |
| `Shift` | Sprint or give the bird a boost in flight |
| `Space`, `Z` / `X`, `C` | Take off, climb or descend, and land on the ground or lake |
| Drag, scroll | Orbit and zoom the camera |
| `Q`, `E` | Honk and sip tea |
| `F`, `Shift+F` | Toss a lemon or make it rain lemons |
| `L`, `Shift+L` | Release one sky lantern or a group |
| `P`, `T`, `V`, `O` | Woodblock mode, time of day, camera angle and full screen |
| `B`, `Y`, `Shift+1–5`, `N`, `M`, `I` | Drum, koto riff, individual strings, score, mute and pause |
| `H`, `Esc`, `R` | Open the control panel, close or leave the current sequence, and reset to the starting point |

Press `H` or click **控制台** (Control panel) to open the mouse and touch controls. Inputs can be combined, for example `W` + `Shift` + `Z` for a powered climb or `T` and `Shift+L` for a moonlit lantern release. Clicking on objects still plays them.

| Shortcut | Sequence |
|---|---|
| `U` | Arrive at the tea stalls, play koto, take a sip and honk |
| `G` | Go to the pier, switch to sunset, honk, run and take off |
| `J` | Take off at night and release three waves of sky lanterns |
| `K` | Land, have a sip and release a lantern |
| `1`–`8` | Play the original opening, market, tea break, lemon chase, pier takeoff, lantern flight, lake landing or printed ending |

The original film sequences return you to your playing position when they end. You can return early with `Esc` or the banner button. Steering or pressing `Esc` cancels a live action combination.

Ride through the three gold markers to check in at the market entrance, the tea stalls and the pier. Touch controls are available on touch screens. Add `?ride` to the local URL to open the game directly.

### Film controls

| Input | Action |
|---|---|
| Tap anything | It answers, in key and on the next sixteenth |
| Tap empty air | Throws a lemon with real physics |
| Drag, scroll | Look around, zoom |
| `A` `S` `D` `F` `G` `H` `J` `K` `L` `;` | Play the koto |
| `B` `Q` `W` `E` | Drum, honk, sip, a rain of lemons |
| `R` | Ride along |
| `P` | Turn any moment into a woodblock print |
| `N` | Unroll the score under the picture |
| `Space`, arrows, `M`, `X` | Pause, jump, mute, full screen |

## The score moves the picture

One note list, `src/06_score.js`, is read by the synthesiser and by everything on screen. 100 BPM, 34 bars.

| Notes | What they move |
|---|---|
| Koto | Paper lanterns, with eight per bar and one per pitch. The notes light the sky lanterns in flight |
| Flute | The steam ribbon over the cup changes height with pitch and width with breath |
| Marimba, bars 12–17 | The lemon strikes the crockery on written notes and follows a gravity-driven path between strikes |
| Bass | Awning cloth, trees, tail feathers, the riding lamp, rings round the floating bird |
| Taiko | Paving stones, the hand on the camera |
| Wood block | Shutters, parasols, claps |
| Bells | Rings on the water, stars |
| Chords | Balloon burners |
| Steps and wingbeats | Both fall on the beat. Stones sink under each foot |

## How it is put together

Source lives in `src/` as plain scripts. The build checks them with Node.js, then joins them in filename order and embeds them with three.js in `dist/pelican-market-3d.html`. Copy that output over `index.html` to update the page players open.

| File | What it makes |
|---|---|
| `00_util.js`, `02_sdf.js`, `04_sculpt.js` | Geometry kit, signed-distance shapes, sculpted and skinned bodies |
| `06_score.js` | The score, story cues, and the queries every moving thing asks |
| `08_look.js` | Palette, 18 materials, wind, soft shadows, light through thin things, print mode |
| `10_sky.js` | Dawn to moonlight, and a light field that lets hundreds of lanterns light the street |
| `16_path.js` | Where the pelican is at any moment |
| `30_phys.js`, `56_lemons.js` | Lemon physics and the musical lemon chase |
| `40_pelican.js`, `42_rider.js`, `41_lamp.js`, `43_steam.js` | The two leads, their lamp, the singing steam |
| `44_beasts.js`, `46_folk.js` | Six animals and 159 townspeople |
| `50_arch.js`, `54_stalls.js` | Streets, houses, the pier, market stalls, cloth and lantern strings |
| `60_land.js`, `64_water.js`, `66_air.js` | Mountains, plants, the lake, splashes, balloons, clouds, sky lanterns and birds |
| `80_post.js` | Ambient occlusion, sun shafts, depth of field, bloom, grade, the woodblock print |
| `85_audio.js` | Koto, flute, strings, drums, bells and every effect, synthesised sample by sample in a Worker |
| `86_ride.js`, `86_ride_trail.js` | Free riding and flight, camera modes, exploration checkpoints |
| `87_ride_show.js`, `87_ride_ui.js` | Action combos, film scene selections, visual styles and the control panel |
| `87_scorestrip.js`, `88_film.js`, `89_player.js`, `90_main.js` | The unrolled score, shot list, live player, render loop |

The original project reports 60 fps at 3.7 megapixels on an Apple-silicon laptop. The player lowers its internal resolution when frames run long.

## Build, test, render

```bash
python3 -X utf8 tools/build.py
```

The production tools include headless Chrome capture (`capd.mjs`, `cap.py`), performance probes (`perf.py`, `tris.py`), audio mix analysis (`stems.mjs`, `listen.py`) and frame-accurate video rendering (`render.mjs`, `finish.py`). They use Node.js, Python 3 with Pillow and NumPy, local Chrome, and FFmpeg for video export. The browser capture and render scripts use macOS Chrome paths and Metal settings by default.

## Credits

[The original film and source](https://github.com/ChetasLua/the-tea-ride) by ChetasLua.

[three.js](https://github.com/mrdoob/three.js), MIT licence. The licence text is in `vendor/LICENSE`.
