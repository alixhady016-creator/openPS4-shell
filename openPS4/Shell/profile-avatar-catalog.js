import {MODERN_CDN_AVATARS,OBSERVED_NATIVE_AVATAR_ORDER} from './modern-avatar-catalog.js';

// Category names are visible in supplied footage. Membership below is local
// visual curation of the recovered contact sheet, never Sony metadata.
const CATEGORY_LABELS=['All','Action / Adventure','Characters','Creatures','Family','Fighting','Items / Miscellaneous'];
const CURATED_GROUPS={};
function group(prefix,numbers,labels){for(const number of numbers){const id=`modern-${prefix}${number}`;CURATED_GROUPS[id]=[...new Set([...(CURATED_GROUPS[id]||[]),...labels])];}}
const range=(first,last)=>Array.from({length:last-first+1},(_,i)=>first+i);
group('A',[2000,2001,2002,2003,2005,2006,2007,2008,2009,2010,2027,2028,2031,...range(2071,2082),2103,2105,2114,2115,2116,2117,2118,2119],['Characters','Action / Adventure']);
group('A',[2006,2007,2008,2009,2010,2027,2028,2031,2103],['Creatures']);
group('A',[2006,2007,2008,2009,2010,2011,2012,2013,2027,2028,2029,2103,2104,2105],['Family']);
group('A',[2011,2012,2013,2029,2104],['Characters']);
group('A',[2004],['Items / Miscellaneous']);
group('E',[2089,2090,2091,2092,2093,2096,2097,2099,2101,2102,2106,2107,2108],['Characters','Action / Adventure']);
group('E',[2098,2100],['Creatures','Action / Adventure']);
group('E',[2109,2110,2111,2112,2113],['Characters','Creatures','Family']);
group('J',[2014,2015,2026,2030,2055,2056,2058,2066,2067,2069,2070,2083,2084,2085],['Creatures','Family']);
group('J',[2014,2015,2026,2030,...range(2032,2041),2043,2055,2056,2058,...range(2059,2070),2083,2084,2085,2086,2087,2088,2094,2095],['Characters']);
group('J',[2056,2058,2059,2060,2063,2064,2065,2066,2067,2068,2069,2083,2084,2085,2086,2087,2088,2094,2095],['Action / Adventure']);
group('J',[2036],['Fighting']);
group('J',[...range(2044,2054)],['Items / Miscellaneous','Family']);
group('J',[2061,2062],['Family']);

const DEFAULT_AVATAR=Object.freeze({id:'native-default-solid',label:'Default Avatar',src:'assets/local-profiles/default-avatar-solid.png',width:260,height:260,category:null,displayCategories:Object.freeze(['Items / Miscellaneous']),displayClassificationBasis:'Local display group; native category metadata unavailable.',kind:'native-resource',source:'Sce.Vsh.ShellUI.Notification.rco / tex_default_avatar_src_4k.dds (lossless PNG conversion)',sha256:'75505a394342c7bf91cb8c356e1b334189d2cc4f88bc4c44d59d516334a8d00d'});
const modernById=new Map(MODERN_CDN_AVATARS.map(avatar=>[avatar.id,avatar]));
const observedIds=new Set(OBSERVED_NATIVE_AVATAR_ORDER);
// Only 24 portraits have an observed relative order. The remainder retain recovery
// catalogue source order; full native ordering is unknown. Default stays first.
const orderedModern=[...OBSERVED_NATIVE_AVATAR_ORDER.map(id=>modernById.get(id)).filter(Boolean),...MODERN_CDN_AVATARS.filter(avatar=>!observedIds.has(avatar.id))];
export const NATIVE_AVATARS=Object.freeze([DEFAULT_AVATAR,...orderedModern.map(avatar=>Object.freeze({...avatar,kind:'original-modern-static-cdn',displayCategories:Object.freeze(CURATED_GROUPS[avatar.id]?.length?CURATED_GROUPS[avatar.id]:['Characters']),displayClassificationBasis:'Locally curated from visible subjects; category names observed in supplied footage. Native Sony membership unavailable.',displayOrderBasis:observedIds.has(avatar.id)?'Relative order observed in supplied native selector frame.':'Recovery catalogue source order; native relative order unknown.'}))]);
export const AVATAR_CATEGORIES=Object.freeze(CATEGORY_LABELS.filter(label=>label==='All'||NATIVE_AVATARS.some(avatar=>avatar.displayCategories.includes(label))));
export const FOOTAGE_AVATARS=NATIVE_AVATARS;
