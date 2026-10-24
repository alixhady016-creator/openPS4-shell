# Customization integration — 24 October 2026

## Corrected

- All four implemented optional entries (Online Friends, Party, Power, Notifications) have independent persisted visibility. Removing all leaves Sound/Devices and Customize. Existing saved configuration migrates without forcing hidden entries visible.
- Focus histories are invalidated when row identities/order change. Previously, the old checkbox focus index could be reassigned to the middle Sort row after a root insertion. Middle-column selection is tracked separately from the child row selection.
- Customize's Items/Sort preview now uses the previously recovered sequential200ms linear child fade; unrelated middle/root content is retained.
- Native insertion500ms aerial opacity, neighbor/reorder250ms custom movement curve, picked-row1.04 scale300ms aerial and top-center pivot are implemented. Removed entries disappear immediately with250ms neighbor movement on the inspected default path. The200ms removal fade exists in PUI but is not enabled by the inspected defaults. Full method tokens and formulas are in report.md.
- Power text is shared by Quick Menu and Power Options. Turn Off: “Close all applications and turn off the PS4. Select this before unplugging the AC power cord.” Restart: “Close all applications and restart the PS4.” Wording comes from the user-supplied reference, not a newly recovered English string table. Existing Windows actions remain intact.
- Removed the requested extra X/O footer prompts below the Quick Menu profile badge.

## Width correction and reference comparison

Earlier reports treated constructor arguments as complete panel widths. SubMenuPanel06009314 adds22px on each side; BasicSubMenuPanel0600931B/1C does likewise. These raw receipts supersede the earlier width conclusions:

|Panel|Content width|Outer width|
|---|---:|---:|
|Power|1103|1147|
|Sound/Devices|1138|1182|
|Customize|393|437|
|Menu Items|623|667|
|Sort|559|603|

Power's normal overall width is555+1147=1702. This resolves the roughly44px shortfall against the supplied native screenshot and expands its description text area. Native row baselines, line spacing and dynamic heights remain in use. Exact wrapping still depends on the browser/native text measurement implementation; screenshot agreement alone is not proof of identical glyph rendering. The new captures show corrected descriptions, wider Power content and no extra footer prompts. The supplied screenshot of the stale Sort outline was traced to index reuse, rather than an intended second selection.

## Hold activation

Foreground Windows-key hook and browser fallback now activate once after a600ms hold; release/focus loss cancels. Controller PS/Home has the same600ms hold in the Home screen; welcome/boot input remains available. Keyboard Home/End fast travel is unchanged. Native hold threshold was not established by this scoped recovery:600ms is an explicitly provisional adapter constant, not a native-recovered claim. Physical hardware button delivery remains unverified and deferred by the user.

## Verification

Release build passes with zero warnings/errors. Final runtime checks pass: four checkboxes; Power removable; no stale Sort focus motion;500ms insertion; only fixed entries remain; Customize fade;300ms picked scale;250ms reorder; final scale1.04; hidden footer; corrected Power content width/text. No JavaScript errors. Hold tests verify sub-threshold taps, threshold activation, single firing, release cancellation, sparse gamepad slot and foreground-loss reset. No destructive power actions were invoked.

Previously documented native glow, Online Friends inner message placement and incomplete network services remain outside this correction. Full byte-level visual equivalence is not claimed.
