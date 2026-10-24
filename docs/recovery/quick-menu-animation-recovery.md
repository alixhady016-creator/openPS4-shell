# Quick Menu customization motion recovery

Static IL from app.exe and PUI.dll supplied by parent task; no execution or production edits. Raw method dumps in this directory use exact metadata tokens in filenames. Reuses trace.py decoder from outputs/quick-menu-native-20261024. This is a bounded call-path recovery, not a global startup-configuration audit.

## Add/delete

- app 06008F1C sets CustomMenuData.Visible from selected state, then SetMenuDataList(current,false). MainMenuPanel.OnCustomMenuDataListChanged 0600904A calls UpdateMenuItem(true), 06008E80 forwards true to BasicMenuListPanel.SetMenuDataList 06008994.
- 06008994 removes absent entries using RemoveItem(index,true), then inserts new/reordered entries using InsertItem(index,true). Reordering here is removal+insertion, not an independent app tween.
- PUI ListPanel.internalInsertItem 06002FB3 moves neighboring row Y positions with scrollAnimationOption. Its callbacks 06003036/37 apply signed height offsets. ListPanelBase ctor 06003061 creates this option with duration 0.25 sec, delay0, defaultScrollCurve 06003144.
- Insertion fade is **500ms**: PUI OnInsertItem 060030F1 sets new row opacity0, then AnimationOption(0.5) animates opacity to1 via 060031A0. Delay0 and default curve established by 06000C01.
- Removal neighbor movement also uses the same 250ms option: ListPanel.internalRemoveItem 06002FB7 changes row Y by removed height (plus layout/section adjustments), with viewport/focus compensation branches.
- Removal fade is **conditional**: PUI ListPanelBase cctor 06003153 sets RemoveFadeOutTime=0.2 sec but defaultRemoveAnimation=0; ctor06003061 copies default into per-list field. OnRemoveItem060030F8 skips fade for type0. No override appears in BasicMenuListPanel ctor0600898F or the customization setup methods examined. Therefore implement immediate removed-item disappearance plus250ms neighbor movement for this recovered default path; do not claim200ms fade is active without an override.
- If enabled by external configuration, removeFadeOut060030F9 uses200ms linear opacity hiding, zero delay, and visibility/size/concurrency guards in060030F8. The global application startup was not audited for overrides.

## Sort / picked row

Exact class spelling in assembly: CunstomMenuChangeOrderPanel, app06008F39..4F. It uses ordinary PUI.UI2.ListPanel and CustomListPanelItem.

- Selected picked row scale **1.04 ×1.04 ×1**, PUI ListPanel ctor06002F60; UpdateMoveItemScale06002FC2→0600304B. Default animation option duration **300ms**, delay0 (06000C16/17→06000C19, default initialized06000C02).
- Selected pivot(.5,0), edge fade disabled through DisableEdgeFadeEffect; on release scale returns1, then completion restores pivot(.5,.5) and disposes the post effect (0600304C/4D). This is a scale animation, not an app-defined opacity animation.
- Row movement/reordering uses scrollAnimationOption **250ms**, same custom curve, PUI internalMoveItem06002FBB callbacks06003047/48: intervening rows move by picked row height; selected row moves by sum of crossed row heights. For equal84px rows, one step is84px. Offscreen/section/focus branches can adjust this.
- ItemMoving callback app06008F44 updates working order; ItemMoved06008F45 merges visible ordered entries to the front of full saved data then SetMenuDataList(...,true). MoveItemSelected06008F46 triggers speech only.

## Dimensions

Sort panel ctor06008F39 passes GetLayoutSize(559,846,705). List X22,Y150,width=panelWidth−44,height=hintTopBaselineY−194 (06008F3A). Hint bottom baseline946.

CustomListPanelItem06008F36: row height84; icon64×64 at(10,10); label X94 (=10+64+20), top baseline52, normal font. These dimensions mean picked height becomes87.36 at1.04 scale. Sort list itself supplies item width; exact resolved width depends on GetLayoutSize mode.

Add/delete panel ctor06008F18 passes GetLayoutSize(623,940,705). List X22,Y150,width=panelWidth−44,height796 (06008F1A).

## Exact curves

Scroll/movement: clamp endpoints to0/1. For normalized t<0.232, f(t)=2.586207151412964*t. Otherwise q=(t−0.23199999332427979)/0.7680000066757202−1; f(t)=0.3999999761581421*(q^3+1)+0.6000000238418579. Source PUI06003144. Use250ms total.

Default scale and insertion fade curve: EaseOutExpoAerial, PUI06000CA2→06000C90→06000CB8. Clamp t to[0,1], u=(1−t)^2; f(t)=1−0.4000000059604645*u−0.10000000149011612*u^2−0.5*u^3. Use300ms picked scale and500ms insertion opacity.

## Unknowns / boundaries

Home hold threshold was not adjacent to the recovered customization paths and was not searched broadly. No runtime validation. Global writes to PUI static defaults were not exhaustively audited. Removal fade therefore remains conditional; exact font numeric size and mode mapping for GetLayoutSize remain inherited from existing receipts rather than newly recovered here.

## Verified content versus outer widths (follow-up)

The constructor layout numbers above are **content widths**. SubMenuPanel06009314 adds22 on each side. BasicSubMenuPanel0600931B stores m_listPanelWidth, and SetupPanel0600931C sets outerWidth=m_listPanelWidth+44, list.X=22, list.Width=m_listPanelWidth.

- Customize06008F50: GetLayoutSize(393,640,456), outer widths(437,684,500).
- Add/delete Menu Items06008F18: GetLayoutSize(623,940,705), outer widths(667,984,749), list content same as input.
- Sort06008F39: GetLayoutSize(559,846,705), outer widths(603,890,749), list content same as input.

Thus normal-mode393,623,559 are not the outer pane widths. Mapping layout modes to tuple positions still follows existing GetLayoutSize evidence.
