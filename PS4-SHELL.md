# Latest update

See [BEHAVIOR-TRACE.md](BEHAVIOR-TRACE.md) for recovered footer/function timings, [SOUND-CATALOG.md](SOUND-CATALOG.md) for audio confidence. Build and actual-app review pass 16 checks. Launch Run-PS4.cmd. Game-row movement retained.

# PS4 shell integration — first working version

Run **Run-PS4.cmd** in this folder. It launches the built application using the existing portable .NET runtime. The original Downloads/openPS4-Source is untouched. The starting source is preserved in Git commit `61e7277`. No Blend installation or use.

## Controls

| Control | Action |
|---|---|
| Enter / controller Cross | Continue, choose profile, open selected item |
| Arrow keys / D-pad | Navigate tiles and function row |
| Escape / Backspace / Circle | Return from function row; close a local dialog |
| Home / End or L1 / R1 | First / last tile |
| F2 | Adjust current screen background; Save persists settings |
| F11 | Windowed / full screen |
| M | Mute / unmute |
| F10 | Open original openPS4 home window |
| Alt+F4 | Close |

Gamepad mapping uses the browser's standard mapping. Actual controller hardware and the PS/Guide button have not been tested; Enter/Cross is available for the welcome prompt. The profile chooser currently offers one local profile and explains the unimplemented New User action.

## Implemented

- Local WebView2 surface inside the existing VB/WPF openPS4 application. No hosted website or downloaded JavaScript dependencies.
- Live WebGL rendering of the recovered wave mesh, 96-bone animation, camera, material ramps and translated pixel arithmetic. Animation advances at the recovered 0.7 rate. Depth-only, non-nearest and nearest-surface passes preserve original triangle ordering, followed by the traced FXAA-style filter. Poses interpolate between the recovered 30 Hz samples.
- Health warning, welcome/PS-button prompt, local profile chooser and the staged 1.88-second home entrance. The initial PS logo screen is skipped. Sony's four-symbol strip is used for the initialization indicator; its motion is a reversible approximation, not a recovered stacked-frame sequence.
- Separate welcome/profile/home/function background settings. The real footage's welcome screen has a darker lower gradient; home is more uniform blue. A background-only blend provides that change without washing out the wave surfaces. F2 exposes saturation, brightness and home-gradient blend; settings persist in this copy's WebView profile and are also exported to `ShellReview/wave-settings.json`.
- Game tiles enlarge from 200 to 330 logical units, with separate movement/size channels, delayed focus growth, focus-out shrink, per-tile outgoing outline fade and delayed incoming outline/Start strip, and a cancellable 100 ms title-out / 320 ms title-in sequence. Long jumps skip the excess distance beyond eight tiles and fade the remaining travel. The scroll base is the recovered library default, not a claim that all Sony layouts use it unchanged.
- What's New, original Store artwork, blue Start area, original Plus and function icons (including Events), compact/expanded function layouts and coordinated 340 ms row transitions. Down/Circle restores the previous game. Projected function-row placement is fitted to the real recording rather than treating native 3D coordinates as screen pixels.
- One reusable effects player and a 75 ms cursor gate prevent stacking switch sounds. Login/main music crossfades; the inactive track pauses. Main music is decoded from the recovered `bgm_main.at9`; Login uses the local MP3 tagged `bgm_login`.
- Existing openPS4 Game Library, Settings, browser and file explorer remain available. Library entries are read from this copy's `Games/GamesList.json`; launching uses the existing GameStarter implementation and a host-side ID lookup. Gallery/music utility tiles currently use the existing file explorer. Store/PS Plus/social entries explain that network services are not connected.

## Maintainable boundaries

- `openPS4/Shell/wave.js`, `wave.frag`, `assets/wave.bin`: renderer and recovered geometry/material data.
- `assets/background.json`: recovered background palette/ramp.
- `config.json`: screen treatment, animation timings, row projection offsets, music paths and levels.
- `shell.js` / `shell.css`: shell state, interruptible motion, layout and input.
- `ShellWindow.xaml.vb`: local resource hosting and narrow bridge to existing openPS4 windows/library.
- `assets/provenance.json`: source paths and hashes for packaged artwork/sounds. Music evidence also lives in the research workspace's `outputs/openPS4-readiness/integration-media-evidence.json`.

Edit the copied output's `Shell/config.json` to test defaults immediately, or source config and rebuild for a lasting source change. Saved F2 overrides take precedence; clear this copy's local overrides with `localStorage.removeItem('waveScreens-v3')` in WebView developer tools when comparing new defaults. No renderer reintegration is needed.

## Validation

`Build-PS4.ps1` builds against the already available bundled dependencies and seeds this isolated runtime's settings/library only if absent. `Build-PS4.ps1 -Review` runs the actual application with scripted navigation and captures results into `openPS4/bin/Release/net9.0-windows7.0/ShellReview`.

The review exercises welcome/profile/home, tile travel, rapid navigation, long jumps, function opening/closing, quick Up–Down reversal, title cancellation, remembered selection, sound coalescing, live frame advancement and WebGL/JavaScript errors. It also opens/closes the existing Game Library and Settings. These are production input-handler tests, not a physical controller test. No game executable was launched during validation.

The neutral phase-35 WebGL capture is compared with the earlier CPU diagnostic, separately from footage comparison. That checks port consistency, not authenticity or a percentage match to PS4.

## Remaining differences

1. Wave shading/edge precision and footage phase remain imperfect. Background dither is omitted in the GPU port; material dither remains. The final display transform is not claimed exact. The screen-specific blue blend is footage-informed, not a newly proven native palette switch.
2. Sony's font, complete outline glow, marquee behavior and some specialized tile behaviors still differ. Layout/perspective and easing fits remain adjustable.
3. Loading-symbol motion, controller-connection presentation and profile management are first-version choices. Only one local profile is implemented.
4. Login music and generic row/cursor sound choices need listening comparison. Original main BGM and the login chime have stronger source evidence.
5. Social/network screens are placeholders; library/settings retain openPS4's existing visuals. Controller hardware, game launching and emulator-specific paths were not exercised.

This is a working local shell integration, not PS4 firmware or an exact-match certification.

## October 13 correction pass

- Outgoing borders remain children of the shrinking tile and fade over 200 ms. Incoming borders and Start strips fade in after 100 ms; that delay is a reversible footage fit, not an exact recovered timing. No shared border travels across gaps.
- Function focus now interpolates size and opacity over 250 ms in / 200 ms out with cubic easing and retargets from current values. Quick row reversal remains interruptible.
- Colored Store bag comes from Settings.Theme/tex_store_tile_src_4k.png. Store caption/background are composed locally. What's New now uses the 512px tutorial image; this is extracted Sony artwork, but not verified as the dashboard's actual texture. Library/browser/gallery also use extracted tutorial artwork instead of the former inset openPS4 icons.
- Cross/Circle/L1/R1/Options prompts use PUI emoji resources, and What's New uses the TopMenu down arrow. Options/O opens a local placeholder, not Sony's complete menu. Down on What's New opens its local content explanation.
- Home treatment retains a blue gradient. Screen config includes lightingGain for wave color output independently of background; this is an approximation, not a recovered material parameter. Previous saved v1 palette overrides are retained but not applied to these defaults.
- Release build: zero errors/warnings. All 12 in-app checks pass, including old-border fade, function focus interpolation, rapid navigation, remembered selection, Up/Down reversal, sound coalescing and renderer errors. Actual captures are in ShellReview. These checks do not certify exact visual timing.

Still to refine: What's New brightness versus real footage; precise glow/Start appearance timing; complete contextual prompt visibility and specialized Store/news behavior; native lighting/final color transform. Hardware controller testing remains outstanding.

## Latest playback and transparency correction

Start/down strips now have no fill. What's New uses its original PNG alpha over the live background without a blue tile backing. Store has a cyan gradient; the footer has a pale translucent cyan tint. These composition choices follow the user's correction and remain adjustable.

Effects now use decoded Web Audio buffers with one active voice per sample. Repeated navigation cannot restart a playing cursor sample. Up/down effects have separate voices and are not blocked by cursor playback. Music remains separate. The old global gate could suppress row effects; its tests did not establish audible continuity. No openPS4 engine limitation was established.

Build passed with zero warnings/errors. All 18 in-app checks passed, including complete decoded effect lifetimes and both row effects, rapid navigation, focus preservation, footer timers, and renderer errors. The updated application was also inspected through native computer use. Automated duration checks do not certify speaker output or authentic sample mapping.

Boot now keeps the clock/profile badge hidden until the settling stage. Native projection and loading-symbol motion remain approximate; this pass does not claim to resolve all boot differences. Approved game-row motion was retained.


## 2026-10-15: recovered footer behavior

Dedicated footer.js controller implements the native 3s show / 9s hide sequence, 300ms/200ms animation endpoints, interruption without focus changes, and suspension/resume. L1/R1 hints follow native first/last index conditions; explicit tile capability flags govern Enter/Options with local-action fallbacks. All 23 in-app checks and seven deterministic behavior checks pass. Skin tint, user badge geometry, exact easing, login policy, and multiline scrolling remain pending. Firmware trace tokens and captures are recorded in the current chat outputs/footer-implementation/README.md.


## 2026-10-15: original footer prompt appearance

Footer prompts now use original firmware6.00 SST Light at30px and default-resolution original PUI PNGs, native40px gaps, baseline40, icon baseline offset6, and the native6px themed text width margin. Default blue Home footer skin is recovered as RGB(4,41,141), alpha242/255 through Theme.dll GuidePanel mapping. Original separator replaces the fitted border. Build and24 in-app checks pass. The original PS4 font rasterizer, exact user badge layout and login material remain unverified; no bit-exact video claim. Detailed evidence and comparison are in this chat outputs/footer-visual-recovery.

## 2026-10-18 firmware-based integration

Game focus now uses the recovered GPU shader equations and idle cycle, native tile/start-strip geometry, and recovered aerial easing. Function row uses original 128px icon/mask resources and a validated alpha-map sweep. Profile cards use the original logical geometry, Medium font/baseline and shader focus. Home/profile transitions use the recovered screen-centered perspective and scene timing. openPS4 runs independent code; no PS4 shell emulation is involved.

Build: `openPS4/bin/Release/net9.0-windows7.0/openPS4.exe`. Dedicated `--recovery-review` validates rendering and captures results. Build succeeds with zero warnings/errors; 17 integration checks pass. Detailed provenance, shader numerical results, footage comparison, and remaining limits: `C:/Users/AlixHady/Documents/Codex/2026-10-14/for-more-previous-findings-extracted-binary/outputs/shell-integration/README.md`.

Full console pixel equality is not certified: profile projection discrepancy, dynamic-avatar LOD, custom themes/service-populated layouts, native glyph rasterization and some input-triggered outline behavior remain unresolved. Accepted wave palette/shading was preserved.

## 2026-10-18 targeted corrections

Fixed held-navigation caption accumulation and recovered shared icon/caption scaling. Corrected boot function layout to original top38 and boot-specific distribution; images now replace original loading placeholders independently. Recovered dynamic Sony loading-symbol atlas/timeline and independent1s live-area delay/200ms ready fade. Corrected profile footer Enter/Cancel/Options and separator-only default; moved compact username into original profile base at x98/baseline73, Light26. Original function-row sounds now decoded from firmware event mapping and checked against recorded audio. Corrected SST role weights, Start label30/baseline44, recovered runtime blue profile-card material, and What'sNew arrow strip10%white.

What'sNew artwork unchanged: tutorial-source pixel identity confirmed, main-runtime AppBrowse URI still unproven. No selected brightness filter was recovered, so none was added. Full evidence and latest checks: `C:/Users/AlixHady/Documents/Codex/2026-10-14/for-more-previous-findings-extracted-binary/outputs/shell-corrections/README.md`.

## 2026-10-19 sequencing correction
The latest authoritative recovery report is C:/Users/AlixHady/Documents/Codex/2026-10-14/for-more-previous-findings-extracted-binary/outputs/shell-sequence-recovery/README.md. It supersedes earlier timing shortcuts: separate logical/widget focus, callback-owned tile geometry, native startup palette/wave tracks, and the controller notification are now integrated. Original font-name regression is fixed. See that report for remaining browser/native metric and asynchronous timing limits.

