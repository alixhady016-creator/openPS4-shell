# Quick Menu Notifications and root switching recovery

Static IL observations only; no executable launched and no production edits. Source app.exe is the cached managed 6.00 build identified by the parent report; PUI.dll is work/row-trace-dependencies/PUI.dll. Receipt filenames include build-local MethodDef RID and contain full tokens/IL offsets. trace.py reuses the parent's dnfile/dncil decoder.

## Notifications child

CustomMenuManager factory 06008A14 constructs NotificationsMenuPanel, not the full Notifications scene. NotificationsMenuPanel constructor 060090D6 passes content width1044 normal/large and1360VR into SubMenuPanel constructor06009314, which adds22 left+22 right. Actual child width therefore1088 normal/large,1404VR.

SetupPanel060090D8 creates QuickMenuNotificationsInfo with current MenuPanel.UserId, rect(22,150,Width−44,796), Layout0normal/1VR/2large, CloseAction closing Quick Menu, CountUpdatedAction updating focusability. It constructs NotificationTabManager(parent=this, backAction=null, qmInfo). The second null parameter is a back callback, not a scene object.

NotificationTabManager.AdjustQmRect0600B50A adds Util.GetNewIconWidth0600B4A0 (55normal,76large/VR) to rect.X and subtracts it from rect.Width. Final rects, local to Notifications child:

|Mode|Child width|Inner list X,Y,Width,Height|
|---|---:|---|
|Normal|1088|77,150,989,796|
|Large font|1088|98,150,968,796|
|VR|1404|98,150,1284,796|

With normal full root width555, child startsX555 and list starts globalX632. This global coordinate is derived from parent geometry, not runtime measurement.

TabManagerBase.CreatePanel0600B472 makes transparent NotificationTabPanel and a same-size local(0,0) NotificationTabListPanel. It enables item borders; disables section headers and empty sections. Quick Menu InitPanel0600B471 overrides scrollbar visibility to enum3. Empty NoNotificationLabel fills list rect, white, UIFont.SizeNormal(33), alignment enums vertical2/horizontal1 (center), text localized msg_no_notifications. No separate full-interface header/tab strip is created by this path.

Content is the actual NotificationTabManager0600B508 model: three section sources in order DownloadSummaryItemSource, UploadSummaryItemSource, NotificationItemSource. Each receives the QuickMenuNotificationsInfo factory. NotificationItemSource.Create0600B4FB takes qmInfo.UserId instead of the foreground fallback; iterator0600B4FA wraps NotificationItemAccessor for that user in CachedItemAccessor and AccessorIterator. NotificationItemFactory.Create0600B4D3 uses GetQmAssetManager and NotificationItem with qmInfo. Thus the reconstruction should reuse its actual notifications model/provider while rendering a Quick Menu child; unread count alone does not describe list contents. Empty behavior and source identity are proven; individual NotificationItem geometry/assets/actions were not exhaustively followed in this scoped pass.

## Selected root changes and fades

ChangeChildMenu06008B2A first updates FocusedData. Same identity returns. Layout1 disposes child; layout3 disposes child and calls SetFocusedMenuPanel(parent,true,true). For layout2 with an existing visible child it hides old child using FadeOutFromCurrentOpacity(DefaultFadeOut.Option,completion callback). If already finally hidden, it returns. If no child it proceeds immediately to SetFocusedMenuPanel. Callback06008B36 proceeds only on successful finish and while layout remains2, then SetFocusedMenuPanel(parent,true,true).

SetFocusedMenuPanel06008AFB calls CreateFocusedChildMenu06008B29. CreateChildMenu06008B28 disposes the old hierarchy, creates the latest FocusedData factory child, places X at parent.X+parent.Width, hides it and sets opacity0. This uses the latest selected data, so rapid selection updates during an outgoing fade are not captured as an obsolete earlier destination. UpdatePanelLayout06008AFC shows the new child through WidgetMethodExteneder.ShowFadeInFromCurrentOpacity06008C51 with animation=true and target opacity1 normal /0.16VR.

Exact outgoing fade: PUI TransitionVariety static constructor06000A1F initializes LinearPoint2Sec with duration0.20,delay0,curve Linear. DefaultFadeOut invokes FadeOut ctor06000A2A using that option. FadeOutFromCurrentOpacity ctor06000A31 omits prepare/reset and targets hiding opacity; it retains current opacity at interruption. Exact incoming fade: app FadeInFromCurrentOpacity ctor06008C57 also uses LinearPoint2Sec and current opacity to target passed opacity. Therefore ordinary root switching is sequential old fade-out200ms, replace child, new fade-in200ms; not a simultaneous crossfade, and not the300ms aerial layout curve. Width/layout interpolation separately uses the parent's established LayoutAnimation300ms aerial option.

## Evidence boundaries

All conclusions above are read-only static observations/derived coordinates. Individual list items and live user notification contents remain runtime/model-dependent. No arbitrary fake content, extra notification page transition, or guessed fade duration is justified. Existing parent receipts app-008AFB,008AFC,008B0C,008C51,008C57,008C59,008A14 are reused; fresh focused receipts are in this directory.

## Scoped row geometry follow-up

NotificationItemBase.InitItem0600B346 creates ordinary rows height148; icon128x128 at(10,10); body1 X158/top baseline47,width=rowWidth−178,height48,font SizeNormal33,white alpha1. Body2 sharesX158/baseline88,height36,font SizeXSmall26,white alpha0.7. Body3 sharesX158/baseline122,initial width0,height36,SizeXSmall26,white alpha0.7. Timestamp X=rowWidth−20,baseline122,initial width0,height36,alignment right,SizeXSmall26,white alpha0.7; timestamp/body3 width is later content/layout dependent.

NotificationItem.CreateListItem0600B4D6 overrides large modes (QuickMenuNotificationsInfo.IsLargeMode0600B506 means VR OR large font): row170,icon146x146 at(10,12),body1/2/3 X176,baselines56/106/154,timestamp baseline154. Large-font mode disables further automatic font enlargement for body2/body3/timestamp. IconBg matches icon rectangle with white alpha0.1, starts hidden. This is not the84 height Quick Menu root row.

Unread marker Util.AddNewIcon0600B4A1 is a label, not a bitmap: width55normal/76large modes,height=rowHeight,X=−width,Y0,center vertical,white SizeNormal33,initial opacity0; text from Util.UnreadMark and speech msg_new. This explains the separate outer list indent55/76.

Both summary factories0600B1B7/0600B310 use ItemLayoutInstruction.CreateSummaryLayout0600B1F3. Normal summary height180,icon(10,10,128,128); VR and large-font height208,icon(10,10,146,146). MarginLeft is iconRight+20 =158normal/176large; right margin20. Summary baseline arrays, decoded directly from FieldRVA static blobs (arrays.py): field0400C65E RVA658EA9 float[4]=(47,88,122,156); field0400C67C RVA6598AB=(56,106,146,187). Summary Title uses baseline0,Name baseline1,State baseline2,count baseline3. Thus normal Title47/Name88/State122/count156; large56/106/146/187. Download Label2 and timestamp use baseline1 by GetTopBaselineY0600B1F8; Upload ContentType and Name also use baseline1. Upload content type/text have extra horizontal split: normal IconRight+15/+65=(153,203); VR IconRight+14/+84=(170,240); large-font=(171,221).

Summary progress bar defaults height16 (ctor0600B1FC), Y=baseline2−16=106normal or124large/VR; pause image default32x32. Summary TextSpace40normal/large font,60VR. SetupLabel0600B1FB sets fixed left/right margins as above except the explicit split upload labels, and uses semantic FirstLineLabelFont/OtherLabelFont and colors. Their static initialization was not decoded in this bounded pass; do not infer extra custom font styling from the summary baseline arrays.

DownloadSummaryItem0600B1B9 uses QuickMenu asset tex_icon_summary_download and localized msg_downloads; UploadSummaryItem0600B312 uses tex_icon_summary_upload. Cached originals exist at [local research workspace]/work/verified-rco-assets/Sce.Vsh.ShellUI.QuickMenu/tex_icon_summary_download_src.dds and tex_icon_summary_upload_src.dds, with _src_4k.dds siblings. No asset conversion was performed. Ordinary NotificationItem images are supplied by actual notification data and GetQmAssetManager, not one fixed generic icon.

Party English msg_no_party_join_create_one_invite: bounded search across cached work XML/JSON/TXT found no match; its English value is unresolved by this pass.
