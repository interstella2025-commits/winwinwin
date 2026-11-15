export const PHONE_ERROR='請輸入正確的手機號碼。';
export const DIALS=[
 {id:'886',short:'🇹🇼 +886',label:'🇹🇼 +886 台灣',name:'台灣',placeholder:'例：0912 345 678'},
 {id:'852',short:'🇭🇰 +852',label:'🇭🇰 +852 香港',name:'香港',placeholder:'例：9123 4567'},
 {id:'853',short:'🇲🇴 +853',label:'🇲🇴 +853 澳門',name:'澳門',placeholder:'例：6612 3456'},
 {id:'65',short:'🇸🇬 +65',label:'🇸🇬 +65 新加坡',name:'新加坡',placeholder:'例：8123 4567'},
 {id:'60',short:'🇲🇾 +60',label:'🇲🇾 +60 馬來西亞',name:'馬來西亞',placeholder:'例：12 345 6789'},
 {id:'86',short:'🇨🇳 +86',label:'🇨🇳 +86 中國',name:'中國',placeholder:'例：138 0013 8000'},
 {id:'1',short:'🇺🇸 +1',label:'🇺🇸 +1 美國／加拿大',name:'美國／加拿大',placeholder:'例：201 555 0123'},
 {id:'81',short:'🇯🇵 +81',label:'🇯🇵 +81 日本',name:'日本',placeholder:'例：90 1234 5678'},
 {id:'44',short:'🇬🇧 +44',label:'🇬🇧 +44 英國',name:'英國',placeholder:'例：7400 123456'},
 {id:'61',short:'🇦🇺 +61',label:'🇦🇺 +61 澳洲',name:'澳洲',placeholder:'例：412 345 678'},
 {id:'other',short:'其他',label:'其他',name:'其他',placeholder:'例：+國碼手機號碼'},
] as const;
/** Accept a local Taiwan number or an already combined international number. */
export function normalizePhone(input:string){
 const compact=input.replace(/[\s-]/g,'');
 if(/^09\d{8}$/.test(compact))return '+886'+compact.slice(1);
 if(/^\+8860?9\d{8}$/.test(compact))return '+886'+compact.replace(/^\+8860?/,'');
 if(/^\+[1-9]\d{6,14}$/.test(compact))return compact;
 return null;
}
/** Combine the country dropdown with the number field. +886 drops the local leading 0. */
export function combinePhone(dial:string,raw:string){
 const compact=raw.replace(/[\s-]/g,'');
 if(dial==='other')return normalizePhone(compact.startsWith('+')?compact:'');
 if(dial==='886'){
  const digits=compact.replace(/\D/g,'');
  const local=digits.startsWith('886')?digits.slice(3):digits;
  const national=local.startsWith('0')?local.slice(1):local;
  return /^9\d{8}$/.test(national)?'+886'+national:null;
 }
 const digits=compact.replace(/\D/g,'');
 const national=digits.startsWith(dial)?digits.slice(dial.length):digits;
 if(!/^\d{6,14}$/.test(national))return null;
 const full='+'+dial+national;
 return /^\+[1-9]\d{6,14}$/.test(full)?full:null;
}
