import type { Metadata } from 'next';
import './globals.css';
import PublicChrome from '../components/public-chrome';
export const metadata: Metadata = {title:'Expert to Enterprise WIN講師班｜銷講・招商・募資實戰',description:'兩天正課，另安排一天正式舞台 PK。從銷售路演、加盟招商到募資簡報，打通商業模式，讓專業成為能推動事業的提案。'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-Hant"><body>{children}<PublicChrome/></body></html>}
