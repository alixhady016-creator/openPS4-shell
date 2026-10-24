import {NATIVE_SETTINGS_DOCUMENTS as RECOVERED_SETTINGS_DOCUMENTS} from './native-settings-data.js';
import {NATIVE_SETTINGS_ADDITIONS} from './native-settings-additions.js';
export const NATIVE_SETTINGS_DOCUMENTS=Object.freeze({...RECOVERED_SETTINGS_DOCUMENTS,...NATIVE_SETTINGS_ADDITIONS});

// Menu visibility follows recovered retail structure, independently of execution support.
export const SETTINGS_ROOT_FILE='SettingsRoot/data/settings_root.xml';
export const nativePageKey=(file,id='')=>`native:${file}#${encodeURIComponent(id)}`;
const hiddenIds=new Set(['sandbox','debug_settings','label_ip_address_dev','label_mac_address_dev']);
const presentationTypes=new Set(['spacer','option','footer','footer_item','navi','bottom_area','bottom_label','top_label','top_area','group_title']);
const matches=(node,id)=>[...(node.id===id?[node]:[]),...(node.children||[]).flatMap(child=>matches(child,id))];
const find=(node,id)=>{const nodes=matches(node,id);return nodes.find(n=>n.type==='setting_list')||nodes[0];};
const firstPage=doc=>doc?.children?.find(n=>n.type==='setting_list');
const crossPages={
 'Login/data/login.xml':{button_face_recognition:'setting_list_face_recognition',button_passcode:'setting_list_passcode'},
 'StorageData/data/storage_data.xml':{system_storage:'storage_data#system_storage',extended_storage:'storage_data#extended_storage'},
 'Network/data/network.xml':{id_btn_internet_connect_settings:['Network/data/network_select_connection.xml','id_select_connection_method']}
};
export function isRetailSetting(node){return !!node&&!hiddenIds.has(node.id)&&!String(node.label||'').startsWith('★');}
export function resolveNativePage(route){
 if(typeof route!=='string'||!route.startsWith('native:'))return null;
 const separator=route.indexOf('#',7),file=separator<0?route.slice(7):route.slice(7,separator);
 let target;try{target=separator<0?'':decodeURIComponent(route.slice(separator+1));}catch{return null;}
 const doc=NATIVE_SETTINGS_DOCUMENTS[file];
 const node=doc?(target?find(doc,target):firstPage(doc)):null;
 return node&&isRetailSetting(node)?{file,node,route:nativePageKey(file,node.id)}:null;
}
function targetFor(file,node){
 const cross=crossPages[file]?.[node.id];
 if(cross)return Array.isArray(cross)?nativePageKey(...cross):nativePageKey(file,cross);
 if(node.type==='link')return nativePageKey(node.attributes.file,node.attributes.target_id||'');
 return nativePageKey(file,node.id||'');
}
export function nativeOperationDescriptor(file,node){
 const route=targetFor(file,node),resolved=resolveNativePage(route);
 // Descriptors contain no executable host callbacks, PS4 registry writes, or implicit Windows analogues.
 if(resolved&&(resolved.node!==node||(node.children||[]).some(n=>isRetailSetting(n)&&!presentationTypes.has(n.type)&&String(n.label||'').trim())))return Object.freeze({kind:'navigate',route,execution:'navigation'});
 return Object.freeze({kind:'reference',route,execution:'none',evidence:resolved?'recovered-node':'root-or-link-only',requires:'PS4',destructive:/format|initializ|restore|delete|backup|transfer/i.test(`${file} ${node.id}`)});
}
function entry(file,node){return Object.freeze({id:node.id,label:node.label,type:node.type,description:node.description||'',file,source:node,route:targetFor(file,node),operation:nativeOperationDescriptor(file,node)});}
const root=NATIVE_SETTINGS_DOCUMENTS[SETTINGS_ROOT_FILE].children.find(n=>n.id==='settings_root');
export const nativeRootEntries=Object.freeze(root.children.filter(isRetailSetting).map(n=>entry(SETTINGS_ROOT_FILE,n)));
export const NATIVE_SETTINGS_MAPPING=Object.freeze(nativeRootEntries.map(n=>Object.freeze([n.id,n.label,n.route])));
export function nativeSubmenuEntries(route){
 const page=resolveNativePage(route);if(!page)return [];
 return (page.node.children||[]).filter(n=>isRetailSetting(n)&&!presentationTypes.has(n.type)&&String(n.label||'').trim()).map(n=>entry(page.file,n));
}
export function nativeReferencePage(route,label='Settings'){
 const page=resolveNativePage(route);
 return {title:page?.node.label?.trim()||label,rows:page?nativeSubmenuEntries(route):[],evidence:page?'recovered-node':'root-or-link-only'};
}
