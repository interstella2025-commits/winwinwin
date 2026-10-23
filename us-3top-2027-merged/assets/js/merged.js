/* 諮詢表單：送往 Win 的系統（端點待提供）。不使用 ActiveCampaign。 */
(function(){var f=document.getElementById('consult-form');if(!f)return;
f.addEventListener('submit',function(e){e.preventDefault();var m=f.querySelector('.f-msg');
 if(!f.checkValidity()){m.textContent='請填寫姓名、手機、Email 並勾選同意';f.reportValidity&&f.reportValidity();return}
 var ep=f.dataset.endpoint,data=Object.fromEntries(new FormData(f).entries());data.source='us-3top-2027-merged';data.page=location.href;
 if(!ep||ep.indexOf('TODO')===0){console.warn('TODO: Win 系統 API 未設定',data);m.textContent='（預覽版：表單尚未串接 Win 系統，資料未送出）';return}
 fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){if(!r.ok)throw 0;f.querySelector('button').textContent='已收到，顧問將與你聯繫';m.textContent=''}).catch(function(){m.textContent='送出失敗，請改撥 02-8988-2862'});
});})();
