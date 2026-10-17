export type MailConfig = { RESEND_API_KEY?: string; RESEND_FROM?: string; RESEND_REPLY_TO?: string };
export type MailResult = 'accepted' | 'not_configured' | 'failed';

export function confirmationContent(name: string) {
 const safeName = name.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
 const subject = '已收到你的申請｜WIN 90分鐘線上前導課';
 const message = '我們已收到你的90分鐘線上前導課申請。請留意報名時填寫的電子郵件，查收前導課相關資訊。';
 return {
  subject,
  text: `${name}，你好：\n\n${message}\n\n這封信為申請資料收件確認，不代表正式講師班錄取或付款完成。\n\nEnter to Enterprise｜WIN 課程團隊`,
  html: `<div lang="zh-Hant" style="font-family:Arial,sans-serif;line-height:1.8;color:#17243a;max-width:600px;margin:auto;padding:28px"><p>${safeName}，你好：</p><h2 style="font-size:22px">我們收到你的前導課申請了</h2><p>${message}</p><p style="color:#64748b;font-size:14px">這封信為申請資料收件確認，不代表正式講師班錄取或付款完成。</p><p>Enter to Enterprise<br>WIN 課程團隊</p></div>`
 };
}

export async function sendConfirmation(config: MailConfig, application: {id:string;name:string;email:string}, request: typeof fetch = fetch): Promise<MailResult> {
 if (!config.RESEND_API_KEY || !config.RESEND_FROM) return 'not_configured';
 try {
  const response = await request('https://api.resend.com/emails', {
   method:'POST',
   headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`win-application/${application.id}`},
   body:JSON.stringify({from:config.RESEND_FROM,to:[application.email],...confirmationContent(application.name),...(config.RESEND_REPLY_TO ? {reply_to:config.RESEND_REPLY_TO} : {})}),
   signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) { console.error('Application confirmation rejected', {applicationId:application.id,status:response.status}); return 'failed'; }
  return 'accepted';
 } catch { console.error('Application confirmation unavailable', {applicationId:application.id}); return 'failed'; }
}
