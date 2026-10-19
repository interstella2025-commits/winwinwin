import FlowText from '../components/flow-text';
import type { ReactNode } from 'react';
const image='/images/revision/';
const phrases=(text:string)=>text.split('｜');
function Heading({children}:{children:ReactNode}){return <h2>{children}</h2>}
function Panel({children,id,kicker}:{children:ReactNode;id?:string;kicker?:string}){return <section className="revision-panel" id={id}>{kicker&&<p className="revision-kicker">{kicker}</p>}{children}<p className="revision-signature">EXPERT TO ENTERPRISE</p></section>}
function Cards({items}:{items:readonly (readonly [string,string])[]}){return <div className="revision-cards">{items.map(([title,body],i)=><article key={`${i}-${title}`}><span className="revision-number">{String(i+1).padStart(2,'0')}</span><div><h3><FlowText parts={phrases(title)}/></h3><p><FlowText parts={phrases(body)}/></p></div></article>)}</div>}
function Photo({src,caption,malaysia=false}:{src:string;caption:string;malaysia?:boolean}){return <figure><div className={malaysia?'revision-photo malaysia-photo':'revision-photo'}><img src={image+src} alt={caption} loading="lazy"/></div><figcaption>{caption}</figcaption></figure>}
export function HeroCopy(){return <><span className="hero-brand-fix">EXPERT TO ENTERPRISE</span><div className="hero-caption-fix hero-sales"><strong>銷售演講</strong><span>讓你的演講<br/>創造現金流、放大人效</span></div><div className="hero-caption-fix hero-franchise"><strong>招商加盟</strong><span>倍增營業收入、<br/>規模化事業版圖</span></div><span className="hero-digital-fix">建立數位影響力</span><span className="hero-footer-fix">EXPERT TO ENTERPRISE</span></>}
export function MentorGallery(){return <section className="revision-panel lecture-gallery"><p className="revision-kicker">GLOBAL LEARNING &amp; TEACHING</p><Heading>走進真實的<br/><em>國際演講現場</em></Heading><div className="revision-photo-grid"><Photo src="beijing.webp" caption="北京｜京台科學家論壇"/><Photo src="singapore.webp" caption="新加坡｜Brands For Good 舞台"/><Photo src="japan.webp" caption="日本｜演講與教育交流"/><Photo src="teaching-map.webp" caption="馬來西亞｜公開講座" malaysia/></div></section>}
export function InternationalExchange(){return <section className="international"><p className="eyebrow">INTERNATIONAL EXCHANGE</p><h2><FlowText parts={["走進國際現場，","濃縮商業精華"]}/></h2><div className="photo-grid"><figure><img src="/images/gary-v.webp" alt="WIN 博士與 Gary Vaynerchuk 的國際課程交流紀錄" loading="lazy"/><figcaption>Gary Vaynerchuk（Gary V）</figcaption></figure><figure><img src="/images/grant-cardone.webp" alt="WIN 博士與 Grant Cardone 的國際課程交流紀錄" loading="lazy"/><figcaption>Grant Cardone</figcaption></figure><figure><img src={image+"cambridge.webp"} alt="英國劍橋哈默頓學院研習與交流現場" loading="lazy"/><figcaption>英國劍橋｜研習與交流現場</figcaption></figure><figure><img src={image+"award.webp"} alt="新加坡 Brands For Good 頒獎交流現場" loading="lazy"/><figcaption>新加坡｜頒獎與國際交流</figcaption></figure></div><p className="exchange-caption">國際課程學習與交流紀錄</p></section>}
export const revisedIndexes=new Set([1,3,4,5,6,8,9,13,14,15,16,19]);
export default function CourseRevision({index}:{index:number}){
 switch(index){
 case 1:return <Panel><Heading>你缺的，<br/>可能不是專業<br/>而是<em>讓市場買單的能力</em></Heading><Cards items={[
 ['有專業，｜卻不知道怎麼複製擴張','把經驗整理成｜可以被複製的方法'],
 ['有專業，｜卻不知道怎麼建立高價銷售','讓市場看懂｜你的專業價值'],
 ['想募資，｜卻說不清市場與成長空間','把事業潛力｜說成可信的成長故事'],
 ['有營運，｜卻缺少成交與現金流路徑','把提案連到｜可執行的商業模式'],
 ['能上台，｜卻不知道行銷漏斗怎麼設計','從引起興趣｜一路走到下一步行動']
 ]}/><p className="revision-conclusion">不是沒有內容，<br/>而是要把內容，<em>轉化成商業語言。</em></p></Panel>;
 case 3:return <Panel><Heading>一個商業核心<br/><em>三種關鍵提案</em></Heading><p className="revision-lead">不只完成一場演講，而是說出能推動下一步的話。</p><Cards items={[
 ['銷售演講提案','把專業說成｜顧客願意購買的價值'],['招商加盟提案','把成功經驗整理成｜能被複製的模式'],['募資簡報提案','用趨勢、數據與財務｜說清楚成長可能']
 ]}/></Panel>;
 case 4:return <Panel><Heading>把「會做」<br/>變成<em>能複製、能擴張</em></Heading><p className="revision-lead">課堂產業情境拆解</p><Cards items={[
 ['按摩・美業','門店模型、｜人才培訓與加盟價值'],['身心靈','品牌語言、｜方法系統與市場定位'],['補教・知識教育','線上知識產品｜與營運模式'],['中小企業・新創','市場優勢｜與募資成長故事'],['餐飲品牌','單店模型、｜複製條件與招商支持'],['醫美・生技保健品','專業價值、｜信任建立與通路合作'],['高階主管・業務領導','策略溝通、｜團隊影響與提案成交']
 ]}/></Panel>;
 case 5:return <Panel kicker="PROGRAM STRUCTURE"><Heading>兩天正課<br/><em>另安排一天舞台 PK</em></Heading><p className="revision-lead">從信念到數據，從銷售到募資。</p><Cards items={[
 ['DAY 1｜銷售演講 × 招商加盟','信念・價值・銷售・商業模式'],['DAY 2｜趨勢洞察 × 募資簡報','趨勢・數據・財務・提案練習'],['DAY 3｜舞台 PK（另日安排）','帶著真實事業上台，｜接受提問與回饋']
 ]}/><p className="revision-note">舞台 PK 另日舉行，日期與評審安排將另行公告。</p></Panel>;
 case 6:return <Panel><Heading>兩天正課，<br/><em>完成六件提案成果</em></Heading><p className="revision-lead">另日帶上舞台，持續演練與優化。</p><Cards items={[
 ['商業定位主張','說清楚你創造的價值'],['銷售演講架構','建立從理解到行動的順序'],['招商加盟提案骨架','整理模式、｜複製條件與執行路徑'],['商業設計思維模型','把專業、顧客與｜商業模式連起來'],['募資簡報核心素材','用數據與財務｜支持成長邏輯'],['正式舞台演練稿','整理提案內容｜與回答問題的方向']
 ]}/></Panel>;
 case 8:return <Panel kicker="DAY 2"><Heading>趨勢、募資<br/><em>與提案練習</em></Heading><Cards items={[
 ['科技、社會與產業趨勢','辨認長期機會｜與短期話題'],['商業設計思維模型','從顧客需求｜走到可執行的商業模式'],['數據與財務的募資邏輯','把商業模式、收入來源｜與財務假設說清楚'],['募資簡報與分組練習','整理提案、｜試講與回答問題']
 ]}/><p className="revision-conclusion">第二天先練習，<br/><em>另一天正式上台 PK。</em></p></Panel>;
 case 9:return <Panel kicker="DAY 3 · STAGE PK（另日安排）"><Heading>正式舞台 PK<br/><em>帶你的真實事業上台</em></Heading><Cards items={[
 ['有限時間','說清楚你的商業提案'],['面對追問','檢驗信念、｜數據與邏輯'],['接受回饋','找到真正｜需要修正的地方']
 ]}/><div className="jury-block"><h3>產業、學術與實務的多元視角</h3><p>從商業可行性、提案邏輯到舞台表達，接受專業提問與回饋。</p><div className="revision-photo-grid"><Photo src="ryla.webp" caption="WIN 過往扶輪青年創業活動紀錄"/><Photo src="simoc.webp" caption="WIN 過往國際教育活動紀錄"/></div><p className="revision-note">本班舞台 PK 的評審名單與日期將另行公告。</p></div></Panel>;
 case 13:return <Panel id="mentor" kicker="YOUR MENTOR"><Heading>從 18 歲補教名師<br/>到<em>國際教育型企業家</em></Heading><div className="mentor-profile"><img src={image+'mentor.webp'} alt="林嘉宏 WIN 博士" loading="lazy"/><div><h3>林嘉宏 WIN 博士</h3><dl><dt>學歷</dt><dd>國立臺北科技大學<br/>經營管理博士</dd><dt>現任企業</dt><dd>尚億國際創育有限公司 董事長<br/>鼎盛全球科技股份有限公司 董事長</dd><dt>學術與教育交流</dt><dd>美國加州州立大學蒙特雷灣分校訪問學者，長期投入企業培訓與國際教育交流。</dd></dl></div></div></Panel>;
 case 14:return <Panel kicker="LEADERSHIP & COMMUNITY"><Heading>林嘉宏 WIN 博士<br/><em>社團經歷</em></Heading><Cards items={[
 ['世界華商領袖協會','理事長'],['台灣職工教育和職業培訓協會','副理事長'],['中華工商經貿科技發展協會','常務理事'],['新加坡國際奧林匹亞競賽中心 SIMCC','台灣地區主席'],['國際扶輪 3482 地區','2026–27 年度｜公共形象委員會副主委'],['國際扶輪 3482 地區','2024–25 年度｜扶輪青年領袖獎研習營委員會主委'],['台北景福扶輪社','2020–21 年度社長']
 ]}/></Panel>;
 case 15:return <Panel kicker="AWARDS & RECOGNITION"><Heading>林嘉宏 WIN 博士<br/><em>重要獎項</em></Heading><Cards items={[
 ['2024 拉姆・查蘭管理實踐獎','創新創業實踐獎'],['新加坡｜Brands For Good','商業向善獎'],['澳洲｜The CEO Institute','Certified CEO｜（Provisional）認證'],['中國大陸','最佳實戰培訓師百強'],['東南亞','世界華人楷模傑出領袖獎'],['香港｜8 Figure Award Winners','企業家成就獎'],['台灣','臺北市優秀青年獎']
 ]}/><div className="revision-photo-grid credential-gallery"><Photo src="hbr-award.webp" caption="2024 拉姆・查蘭獎得獎紀錄"/><Photo src="ceo.webp" caption="The CEO Institute｜Certified CEO（Provisional）證書"/></div><p className="revision-conclusion">2024 拉姆・查蘭管理實踐獎<br/><em>「創新創業實踐獎」得主</em></p><p className="revision-note">《哈佛商業評論》中文版主辦<br/><a href="https://ibeauty.media/archives/210216" target="_blank" rel="noopener noreferrer">獲獎案例所屬企業獲報導為該年度唯一入選案例庫的台灣企業 ↗</a><br/><a href="https://finance.people.com.cn/n1/2026/1019/c1004-40817418.html" target="_blank" rel="noopener noreferrer">被媒體譽為「中國管理界奧斯卡」 ↗</a></p></Panel>;
 case 16:return <Panel kicker="INTERNATIONAL FOOTPRINT"><Heading>國際舞台現場</Heading><p className="revision-lead">從亞洲到歐美，持續學習、授課與交流。</p><div className="city-grid">{['台北','北京','深圳','東京','新加坡','吉隆坡','金邊','雅加達','曼谷','加州','賓州','劍橋'].map(city=><div key={city}><svg viewBox="0 0 120 70" aria-hidden="true"><path d="M5 64h110M14 63V40h13v23m10 0V27h14v36m12 0V9h12v54m12 0V33h15v30M68 9V2"/></svg><strong>{city}</strong></div>)}</div></Panel>;
 case 19:return <Panel kicker="QUESTIONS BEFORE YOU JOIN"><Heading>常見問題</Heading><Cards items={[
 ['這是口才課或一般講師培訓嗎？','核心是商業表達，｜學會組織銷售、｜招商與募資提案。'],['我不是講師，也適合嗎？','只要需要對顧客、｜合作夥伴或投資人提案，｜就與你有關。'],['還沒有成熟商業模式，可以上嗎？','帶著正在發展的專業、｜產品或事業題目進場。'],['不懂財務，也能學募資簡報嗎？','從基本數據與財務假設，｜建立商業判斷邏輯。'],['我是高階主管，適合參加嗎？','從執行與管理的視角，｜進一步練習經營者思維、｜商業模式與策略提案。'],['一般上班族也適合嗎？','可以從現有專業出發，｜練習辨識市場需求、｜設計提案與探索事業方向。']
 ]}/></Panel>;
 default:return null;
 }
}
