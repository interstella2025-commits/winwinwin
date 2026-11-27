import { gated } from '@/lib/seminar/http';
import { settle } from '@/lib/seminar/checkout';
import { siteOrigin } from '@/lib/seminar/flags';

/** 付款完成後瀏覽器回來的位置。狀態以伺服器通知為準，這裡只負責導回說明會頁。 */
export async function POST(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  try {
    const { rec } = await settle(Object.fromEntries(new URLSearchParams(await request.text())));
    return Response.redirect(`${siteOrigin()}/seminar/${rec.slug}?order=${rec.data.token}`, 303);
  } catch {
    return Response.redirect(`${siteOrigin()}/`, 303);
  }
}
