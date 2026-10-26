import FlowText from '../components/flow-text';
import artworks from './revision-artworks.json';

const image = '/images/revision/';

function Photo({ src, caption, malaysia = false, hideCaption = false }: {
  src: string;
  caption: string;
  malaysia?: boolean;
  hideCaption?: boolean;
}) {
  const parts = caption.split(/(?<=｜)/);
  return <figure>
    <div className={malaysia ? 'revision-photo malaysia-photo' : 'revision-photo'}>
      <img src={image + src} alt={caption} loading="lazy" />
    </div>
    {!hideCaption && <figcaption><FlowText parts={parts} /></figcaption>}
  </figure>;
}

type Slot = { src?: string; caption: string; malaysia?: boolean };

/* 國際舞台現場：只標國家／城市。src 未填的格位（照片尚未提供）不渲染。 */
const stagePhotos: Slot[] = [
  { src: 'beijing.webp', caption: '中國・北京' },
  { src: 'stage-singapore.webp', caption: '新加坡' },
  { src: 'japan.webp', caption: '日本' },
  { src: 'teaching-map.webp', caption: '馬來西亞・吉隆坡', malaysia: true },
  { src: 'stage-usa-pennsylvania.webp', caption: '美國・賓州' },
  { src: 'stage-cambodia-live.webp', caption: '柬埔寨・直播' },
  { src: 'stage-uk-cambridge.webp', caption: '英國・劍橋' },
  { src: 'stage-usa-california.webp', caption: '美國・加州' },
];

export function MentorGallery() {
  const ready = stagePhotos.filter((p) => p.src);
  return <section className="revision-panel lecture-gallery">
    <h2>國際舞台現場</h2>
    <div className="revision-photo-grid">
      {ready.map((p) => <Photo key={p.caption} src={p.src!} caption={p.caption} malaysia={p.malaysia} />)}
    </div>
  </section>;
}

type Mentor = { src?: string; name: string; title: string };

/* 國際交流：上排兩位、下排三位。src 未填（照片尚未提供）則不渲染。 */
const mentors: Mentor[] = [
  { src: '/images/gary-v.webp', name: 'GaryVee', title: '美國著名創業家、世界社群行銷大師' },
  { src: '/images/grant-cardone.webp', name: 'Grant Cardone', title: '美國著名企業家、世界銷售培訓專家' },
  { src: '/images/revision/exchange-blair-singer.webp', name: 'Blair Singer', title: '國際銷售與領導大師' },
  { src: '/images/revision/exchange-shimizu-kenji.webp', name: '清水健二', title: '日本微表情大師' },
  { src: '/images/revision/exchange-amada-yukihiro.webp', name: '天田幸宏', title: '日韓創業教父' },
];

export function InternationalExchange() {
  const ready = mentors.filter((m) => m.src);
  return <section className="international">
    <img className="exchange-title-art" src={image + 'restore-exchange-heading-approved.webp'} width={1942} height={809} alt="走進國際現場，濃縮商業精華" loading="lazy" />
    <div className="photo-grid exchange-grid">
      {ready.map((m) => <figure key={m.name}>
        <img src={m.src} alt={`林嘉宏 WIN 博士與${m.title} ${m.name}合照`} loading="lazy" />
        <figcaption><span className="wrap-unit">{m.title}</span> <span className="wrap-unit">{m.name}</span></figcaption>
      </figure>)}
    </div>
  </section>;
}

const profile: { label: string; icon: 'edu' | 'work' | 'academic'; items: [string, string][] }[] = [
  { label: '學歷', icon: 'edu', items: [['臺北科技大學', '經營管理博士']] },
  { label: '工作經歷', icon: 'work', items: [
    ['鼎盛全球科技（股）公司', '董事長'],
    ['愛語包容 AI（股）公司', '共創人兼營運長'],
    ['華沃教育', '創辦人'],
    ['世界華商領袖協會', '理事長'],
    ['台灣職工教育和職業培訓協會', '副理事長'],
    ['中華工商經貿科技發展協會', '常務理事'],
    ['新加坡奧林匹亞競賽中心SIMCC', '台灣地區主席'],
  ] },
  { label: '學術經歷', icon: 'academic', items: [
    ['美國矽谷研究院', '院士'],
    ['史丹佛大學', '訪問學者'],
    ['柏克萊加州大學', '訪問學者'],
    ['美國瑪麗伍德大學', '台灣項目教授'],
    ['美國加州州立大學', '國際講師認證專案教授'],
  ] },
];

function Icon({ kind }: { kind: 'edu' | 'work' | 'academic' }) {
  const paths = {
    edu: <><path d="M3 9.5 12 5l9 4.5-9 4.5z" /><path d="M7 11.6V15c0 1.3 2.3 2.5 5 2.5s5-1.2 5-2.5v-3.4" /><path d="M20 10v4.5" /></>,
    work: <><rect x="4" y="7" width="7" height="13" rx="1" /><rect x="11" y="3.5" width="9" height="16.5" rx="1" /><path d="M7 10.5h1.5M7 14h1.5M14 7.5h3M14 11h3M14 14.5h3" /></>,
    academic: <><rect x="5" y="3.5" width="14" height="17" rx="1.6" /><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" /></>,
  };
  return <span className="mp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg></span>;
}

export function MentorProfile() {
  return <section className="mentor-poster" id="mentor" aria-labelledby="mentor-title">
    <div className="mp-inner">
      <div className="mp-head">
        <p className="mp-kicker">YOUR MENTOR</p>
        <h2 id="mentor-title"><span className="wrap-unit">從 18 歲台北</span><span className="wrap-unit">補教界名師</span><br /><span className="wrap-unit">到<em>國際教育型企業家</em></span></h2>
        <p className="mp-name">林嘉宏 <b>WIN</b> <small>博士</small></p>
      </div>
      <img className="mp-portrait" src={image + 'mentor-cutout.webp'} width={630} height={1231} alt="林嘉宏 WIN 博士" loading="lazy" />
      <dl className="mp-list">
        {profile.map((g) => <div className="mp-group" key={g.label}>
          <Icon kind={g.icon} />
          <div>
            <dt>{g.label}</dt>
            {g.items.map(([org, role]) => <dd key={org + role}><span className="mp-org">{org}</span><span className="mp-role"><span className="mp-sep" aria-hidden="true">｜</span>{role}</span></dd>)}
          </div>
        </div>)}
      </dl>
    </div>
    <p className="mp-foot"><span className="mp-foot-en">EXPERT TO ENTERPRISE</span><span className="mp-foot-sep" aria-hidden="true">｜</span><span className="mp-foot-zh">專業講師實戰班</span></p>
  </section>;
}

export const revisedIndexes = new Set([1, 3, 4, 5, 6, 8, 9, 15, 16, 19, 20]);

/* 10：評審回饋（評審陣容即將公布）— 依 Win 回饋先移除；14：社團經歷 — 移除。 */
export const hiddenIndexes = new Set([10, 14]);

export default function CourseRevision({ index }: { index: number }) {
  const art = artworks[String(index) as keyof typeof artworks];
  if (!art) return null;
  return <>
    <section className="generated-artwork" aria-label={art.alt}>
      {index === 9 ? <div className="pk-poster">
        <img className="pk-layout" src={art.src} width={art.width} height={art.height} alt={art.alt} loading="lazy" />
        <img className="pk-inset-photo" src={image + 'ryla.webp'} alt="WIN 與同台交流人士的實拍照片" loading="lazy" />
      </div> : <img src={art.src} width={art.width} height={art.height} alt={art.alt} loading="lazy" />}
    </section>
  </>;
}
