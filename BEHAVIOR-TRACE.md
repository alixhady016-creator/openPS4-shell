# Boot, footer, function focus: implementation evidence

Primary evidence: decoded PS4 6.00 app.exe and matching PUI.dll. Selected decoded bodies are in evidence/. Real ps4_shell_boot is a 10.48-second 2400x1080 recording with side bars; it begins in the profile chooser, not at power-on. Simulator screenshots are appearance references only. Recording skips and different firmware forbid interpreting all elapsed footage as a native timer.

## Recovered and implemented

- HealthWarning: 0–0.5 seconds opacity in; hold to 2.5; out to 3.0, cubic easing. Black behind the warning. Existing warning/resource readiness gates remain distinct from home entrance.
- First-user home entrance: 360 ms approach, 620 ms hold, 900 ms EaseInOutExpo settling; se_log_login at stage two. Web implementation approximates native Z=600 through scaling. It does not reproduce the complete native projection or asynchronous plugin loading.
- Function icon focus: app 060033C6 cancels previous block and starts 250 ms EaseOutCubic; 060033C7 cancels and uses 200 ms EaseInOutCubic on focus-out. Expanded targets are scale/opacity 1 versus .5; compact scale .375. Label is a child of the scale panel (060033B8), now reproduced instead of a shared traveling label. Existing 340 ms coordinated row transitions and game-row motion retained.
- Footer: PUI 06002476 creates a 3-second auto-show timer; 06002477 creates a 9-second auto-hide timer. 0600246F restarts the sequence on focus/touch/background activation. 0600247C can postpone hiding until the first navigation animation cycle completes. Our short static legends need no scrolling-cycle wait. Only focus changes are modeled, not every native touch/background branch.
- Footer slide-in: 300 ms EaseOutExpoAerial; slide-out: 200 ms same curve. Shown Y = screen height minus footer height; hidden target is half a footer lower, opacity zero. At 1080p height136, left inset106, baseline40 come from PUI 0600431D–1F. Browser exponential easing approximates the aerial curve.
- Footer contents now depend on profiles/function/game context and include the extracted profile avatar and PUI controller glyphs. Background/border color remains a footage fit; default skin image mapping is not fully resolved.

## Color and resources

app 06003A70 constructs UIColor(0,186/255,1,0). PUI 06000DD4 assigns arguments R,G,B,A. Thus the logged 0000BAFF is consistent with ARGB alpha0/R0/G186/B255, not an opaque CSS blue. We do not use it to tint the screen or selection. White text and no title shadow are implemented; Sony's font is not bundled.

Native background work already recovered palette records, ramps, and conditional 625/2000 ms theme-transition clocks. This does not establish that a welcome-to-home change is that same theme-change path. The renderer retains original ramps and separate per-screen treatments; home bottom blue is lifted and saturation adjusted. Screen treatment and wave lighting gain are explicitly reversible approximations, with no invented themed dimmer.

Store uses the original colored Settings.Theme bag on a composed gradient. What's New and utility tiles use extracted tutorial artwork (512px What's New, 192px other tiles), not verified dashboard textures. What's New now retains the source PNG alpha without an added blue fill. Start/down-arrow strips are transparent. Store cyan and the pale translucent footer tint remain adjustable visual fits. No claim of recovered exact tile material.

## Footage comparison and remaining gaps

The supplied real clip shows the profile-to-home entrance, initialization symbols, delayed footer, and later function-row opening. The footer is absent during initial loading and navigation and visible after settling, consistent with the traced show timer. It cannot independently verify the nine-second timer because the clip ends shortly after opening the function row. The revised function labels remain under their own icons. Home background now avoids the former near-black lower region.

Remaining: exact native projection, background lighting/final display transform, full Store/What's New online behavior, complete footer skin and scrolling hints, and verified sound-bank alias mapping. Do not label candidate menu sounds as proven row-transition sounds. No runtime log was used as an animation specification.



## 2026-10-15: recovered footer behavior

Dedicated footer.js controller implements the native 3s show / 9s hide sequence, 300ms/200ms animation endpoints, interruption without focus changes, and suspension/resume. L1/R1 hints follow native first/last index conditions; explicit tile capability flags govern Enter/Options with local-action fallbacks. All 23 in-app checks and seven deterministic behavior checks pass. Skin tint, user badge geometry, exact easing, login policy, and multiline scrolling remain pending. Firmware trace tokens and captures are recorded in the current chat outputs/footer-implementation/README.md.


## 2026-10-15: original footer prompt appearance

Footer prompts now use original firmware6.00 SST Light at30px and default-resolution original PUI PNGs, native40px gaps, baseline40, icon baseline offset6, and the native6px themed text width margin. Default blue Home footer skin is recovered as RGB(4,41,141), alpha242/255 through Theme.dll GuidePanel mapping. Original separator replaces the fitted border. Build and24 in-app checks pass. The original PS4 font rasterizer, exact user badge layout and login material remain unverified; no bit-exact video claim. Detailed evidence and comparison are in this chat outputs/footer-visual-recovery.
