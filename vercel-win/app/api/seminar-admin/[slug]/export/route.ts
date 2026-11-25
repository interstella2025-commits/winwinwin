import { gated } from '@/lib/seminar/http';
import { audit, can, guard, maskEmail, maskPhone } from '@/lib/seminar/admin-auth';
import { store } from '@/lib/seminar/store';

const TYPE: Record<string, string> = { reminder: '預約提醒', lead: '留名單', form: '填表', notes: '寄筆記' };
const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };

/** 名單 CSV。沒有「完整名單」權限時，Email 與手機會遮蔽。 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'leads'); if (s instanceof Response) return s;
  const { slug } = await params;
  const full = can(s.role, 'leadsFull');
  const includeDemo = new URL(request.url).searchParams.get('demo') === '1';
  const rows = (await store().list<Record<string, unknown>>(slug, 'lead', 50_000)).filter(r => includeDemo || r.data.demo !== true);
  const head = ['時間', '類型', '姓名', 'Email', '手機', '通知管道', '表單內容', '已聯絡', '備註', '示範資料'];
  const lines = rows.map(r => {
    const d = r.data as Record<string, unknown>;
    const email = String(d.email || ''), phone = String(d.phone || '');
    return [new Date(r.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }), TYPE[String(d.type)] || d.type, d.name, full ? email : maskEmail(email), full ? phone : maskPhone(phone), (d.channels as string[] | undefined)?.join('/') || '', JSON.stringify(d.fields || {}), d.followed ? '是' : '', d.memo || '', d.demo ? '是' : ''].map(cell).join(',');
  });
  await audit(s, slug, '匯出名單', `${rows.length} 筆${full ? '' : '（遮蔽）'}`);
  return new Response('\ufeff' + [head.map(cell).join(','), ...lines].join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="seminar-${slug}-leads.csv"`, 'Cache-Control': 'no-store' } });
}
