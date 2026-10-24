# Quick Menu panel follow-up (static IL, 2026-10-24)

Source: `[local research workspace]/work/dashboard-managed-600/app.exe`; dependency `work/row-trace-dependencies/PUI.dll`. Receipts in this folder name assembly + MethodDef RID. Full tokens and IL offsets are inside each receipt. Existing receipts under `../quick-menu-native-20261024` were reused. No production edits, no target execution. Decoder copied as trace.py.

## Power

`app-0091B4` (SetupPanel, IL009C–01A2) proves this order:

| Index | Title resource | Icon | Description resource |
|---|---|---|---|
|0|msg_log_out_system|tex_logout|none|
|1|msg_switch_user|tex_switch_user|none|
|2|separator|none|none|
|3|msg_enter_rest|tex_enter_rest_mode|msg_rest_mode_info_with_suspend|
|4|msg_safe_power_off|tex_turn_off|msg_poweroff_info|
|5|msg_safemode_restart_system|tex_restart|msg_restart_ps4_info|

Thus Log Out, Switch User, separator, Enter Rest Mode, Turn Off, Restart. All rows are created unconditionally here. Initial focus is index3 if PowerManager.IsEnableStandbyMode(), index4 otherwise (IL01D2–01E7). Do not infer rest-row removal from this predicate.

List local X22,Y150,width=panelWidth−44 (1059 normal),height796, vertical gap0, ShowItemBorder=false (`91B4` IL000C–0064). Cached constructor `../quick-menu-native-20261024/app-0091B3.txt` gives widths1103/1340/1205.

Separator height22, nonfocusable, zero horizontal padding, embedded panel X0,Y10,width1103,height2, white alpha0.2 (`91CD` IL009A–0140). Other rows use PUI formatted layout, not BasicMenuData height assignment. PUI `2C00` defaults SmallHeight84, Medium116, Large148; `2BC0` selects by size type or custom height. Power uses one title plus optional description, and requests description visibility2 (`91B4` IL01A7); PUI `2BF2` IL0056–006E proves mode2 shows every eligible description, not only focused row. `2BF1` eligibility requires Small size, nonempty description and no indicator URI. Exact final height therefore includes measured wrapped text (`2BF3` and `2BEC`), and must not be hardcoded84 for description rows. Locale/font width determine wrapping. `2BEC` uses first title label X when available, row width minus right padding, description TopBaselineY=title TopBaselineY+DescriptionPadding38 (normal); total height=description baseline+(lineCount−1)*DescriptionLineSpace38+DescriptionMargin34. Thus title baseline52 gives one-line description row124, two-line162. Base description-free rows84. Full positioning receipt retained.

## Right preview switching

`8B2A` ChangeChildMenu sets latest FocusedData first; unchanged data returns. Layout1 disposes child immediately. Layout3 disposes and refocuses parent. Layout2, with a present visible child, hides it using FadeOutFromCurrentOpacity(DefaultFadeOut.Option); completion callback `8B36` proceeds only when completion Boolean true and layout still2. It calls SetFocusedMenuPanel(parent,true,true). With no child it invokes this immediately. A child already finally hidden does not restart that path.

Cached `app-008AFB` then CreateFocusedChildMenu -> `8B28`: dispose previous, invoke latest menu factory, set child X=parent.X+parent.Width, Hide(), opacity0. Cached `8AFC` IL006D–0075 shows new child via ShowFadeInFromCurrentOpacity(animated,target opacity). Cached `8C51` skips redundant completed transitions and preserves current opacity; `8C57` uses LinearPoint2Sec. PUI `A1F`, `A24`,`A2A` prove DefaultFadeOut and DefaultFadeIn both linear0.20 seconds, zero delay. This is old preview out0.20 then new preview in0.20, with parent/background layout potentially animating concurrently; it is not a simultaneous old/new crossfade. Existing main root SlideIn0.28 depth animation is separate.

## Friends and Online Friends differ

OnlineFriendsPanel (`9109`,`910A`) content widths662/1002/822, outer width+44 =>706/1046/866; content X22,Y150,height796, profile width=content−142. MessageLabel is `msg_no_online_friends`. Signed-out/error state `9111`: `msg_singed_in_psn_general` + `msg_signin_psn`, else `msg_error_obtaining_content` + `msg_refresh_vb`.

Friends22 constructs FriendsMenuPanel, whose default content width is likewise662/1002/822 (`8F8D`), but CreatePanel `8F8E` constructs FriendsPulldownMenuPanel with36 parameter, places it X13, full owner height and passes width. `8F95` determines pulldown visible state from online/custom-list monitor results. `8F9D` creates FriendsMenuListPanel variants with a36 inset and profile width−142. This is not interchangeable with the older OnlineFriends-only child. `8F9C` repeats sign-in/refresh errors above. Exact pulldown selected labels, empty message location, and shared Friend assembly row geometry remain unresolved by this bounded pass; no generic hardcoded Friends empty state is justified.

## Party

`9956`/`9957`/`9958` panel widths940 normal,1240VR,1205large. `916C` root X22,Y150,width=outer−44,height796. It embeds QuickMenuPartyPanel; note IL0093–00AA assigns nested Height=root.Width then Width=root.Height, directly as shipped (do not silently correct it in an evidence report).

`9959` loads layout_quick_menu_party_panel / _acs / _vr through CXML resources. `995D` finds StatusPanel and StatusButton; signed-out path sets status4; loading uses msg_wait; parental chat restriction uses msg_error_pc_use_feature. `9970` status update locates StatusLabel,StatusButton,StatusBusyIndicator; resources include msg_singed_in_psn_general/msg_signin_psn, msg_error_obtaining_content/msg_refresh_vb, msg_qm_ps_now_no_list_info/msg_go_to_party.

`988D` Home._UpdateData IL00CE–00E2 (and010A–0116) for zero joinable parties sets status2 with `msg_no_party_join_create_one_invite`; positive count clears status. Thus the actual empty message is a create/invite prompt, not merely 'No parties'. `9976` changes child views to QMPPanelHome or QMPPanelRoom, hides new child, appends, then ShowFade. `9884` home binds PartiesListPanel. Native Party is a dynamic home/room/status UI.

Unknown: exact native CXML StatusPanel/label/button coordinates, home create-button rows and their measured heights, final localized strings, modern Friends pulldown rows and empty-message position. These require following layout resources/shared Friend implementation, not deriving coordinates from screenshot estimates. Retained receipts establish the state branches and resource names without fabricating missing layout values.


## Exact Party resource geometry follow-up

`decode-panels.py` reuses existing UIBL0003 decoder; `layout_quick_menu_party_panel.json` consumes all970 bytes, byte-exact roundtrip=true, SHA256965f2233afc576ade3f670c0bcb67b79ab828406bac61959364838f9d8483cf1. Native normal template: QuickMenuPartyPanel940x798; StatusPanel local(20,82),900x716; StatusLabel relative(0,308),900x100,System30; StatusButton(200,376),500x56; busy(418,326),64x64.

These are template coordinates. `app-00996E` OnArrange status2 branch IL0034–00B5 sets label width=min(panel.width,label.GetLongestLineWidth(panel.width)), X=(panel.width−label.width)/2, Y=(panel.height−label.height)/2. This is the normal zero-joinable empty state: centered message within StatusPanel, no icon. `app-009970` status2 branch IL009D–00FA assigns status text, installs layout rule2, hides button and busy indicator and shows status panel. Thus empty state is text centered at template Y308 within StatusPanel (local outer Y82+308), subject to current measured height/anchoring; message is msg_no_party_join_create_one_invite. No separate empty icon is present.

`layout_qmp_list_item_button.json` fully decodes700 bytes, roundtrip=true: row940x84, SettingImageBox(10,10)64x64, NameLabel(94,0)826x84. `layout_qmp_panel_home` decoding stops at unsupported ListPanel offset0x18a and is explicitly not treated as a complete layout. No guessed ListPanel field decoding added.

OnlineFriends4 message label layout is owned by Sce.Vsh.Friend referenced implementation; this available dependency cache only contains PUI, so native message positioning inside its X22,Y150,width662,height796 host remains unresolved here.
