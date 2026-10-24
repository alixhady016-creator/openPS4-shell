# Audio catalog

The firmware PUI RCO sound-script table now establishes original event bindings. Move/up/down use direct HEVAG decoding with vgmstream r2117; receipts are in investigation outputs/shell-corrections/sound-map.json.

| Local file / original candidate | Likely use | Confidence |
|---|---|---|
| Shell/assets/main.wav ← systembgm/bgm_main.at9 | Dashboard background music | High: decoded directly from recovered firmware |
| Shell/assets/login.mp3 ← Downloads/02 Login.mp3 (tag bgm_login) | Login/profile music | Medium: tagged local candidate; no extracted login AT9 match |
| Shell/assets/login.wav ← src20-se_log_login.wav | Login/home entrance chime | Medium-high: filename agrees with decoded se_log_login trigger at entrance stage two |
| Shell/assets/move.wav ← PUI snd_cursor1_src.vag | Tile navigation, event se_std_cursor1 | High: original firmware play binding |
| Shell/assets/select.wav ← src11-Decide_refine_D_.wav | Confirm, event se_std_enter1 | Medium-low: named candidate; bank alias unverified |
| Shell/assets/cancel.wav ← src10-Cancel_refine_D_.wav | Cancel/back | Medium-low: named candidate; bank alias unverified |
| Shell/assets/up.wav ← PUI snd_cz_cursor_in2_src.vag | Enter functions, event se_fnc_cursor_in | High: firmware binding; video attack correlation 0.846868 at 4.676s |
| Shell/assets/down.wav ← PUI snd_cz_cursor_in1_src.vag | Return to games, event se_cz_cursor_in1 | High: original firmware play binding |

Move/up/down come directly from firmware PUI HEVAG. Remaining effects retain existing PS4-System-Software-Sounds.zip candidates. Effects are predecoded into Web Audio buffers. An active sample finishes its full buffer; repeats of that same sample are discarded until it finishes. Different effects have independent voices, so a cursor cannot suppress the up/down transition. Minimizing does not truncate effect tails. This is a deliberate local playback policy, not recovered Sony mixer behavior. Music remains separate. Automated checks measure complete buffer lifetimes; physical speaker output and exact sample matching still require listening comparison.
