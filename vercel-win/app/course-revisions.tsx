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

export function MentorGallery() {
  return <section className="revision-panel lecture-gallery">
    <h2>國際舞台現場</h2>
    <div className="revision-photo-grid">
      <Photo src="beijing.webp" caption="中國・北京" />
      <Photo src="stage-singapore.webp" caption="新加坡" />
      <Photo src="japan.webp" caption="日本" />
      <Photo src="teaching-map.webp" caption="馬來西亞・吉隆坡" malaysia />
      <Photo src="stage-usa-pennsylvania.webp" caption="美國・賓州" />
      <Photo src="stage-cambodia-live.webp" caption="柬埔寨・直播" />
      <Photo src="stage-uk-cambridge.webp" caption="英國・劍橋" />
      <Photo src="stage-usa-california.webp" caption="美國・加州" />
    </div>
  </section>;
}

export function InternationalExchange() {
  return <section className="international">
    <img className="exchange-title-art" src={image + 'restore-exchange-heading-approved.webp'} width={1942} height={809} alt="走進國際現場，濃縮商業精華" loading="lazy" />
    <div className="photo-grid">
      <figure><img src="/images/gary-v.webp" alt="林嘉宏 WIN 博士與 Gary Vaynerchuk（Gary V）合照" loading="lazy" /><figcaption><span>美國著名創業家、世界社群行銷大師</span> <span>GaryVee</span></figcaption></figure>
      <figure><img src="/images/grant-cardone.webp" alt="林嘉宏 WIN 博士與 Grant Cardone 合照" loading="lazy" /><figcaption><span>美國著名企業家、世界銷售培訓專家</span> <span>Grant Cardone</span></figcaption></figure>
    </div>
    <div className="photo-grid photo-row">
      <figure style={{ '--r': 992 / 1080 } as React.CSSProperties}><img src={image + 'exchange-blair-singer-full.webp'} width={992} height={1080} alt="林嘉宏 WIN 博士與 Blair Singer 合照" loading="lazy" /><figcaption><span>國際銷售與領導大師</span> <span>Blair Singer</span></figcaption></figure>
      <figure style={{ '--r': 1600 / 854 } as React.CSSProperties}><img src={image + 'exchange-shimizu-kenji-full.webp'} width={1600} height={854} alt="林嘉宏 WIN 博士與清水健二合照" loading="lazy" /><figcaption><span>日本微表情大師</span> <span>清水健二</span></figcaption></figure>
      <figure style={{ '--r': 1200 / 901 } as React.CSSProperties}><img src={image + 'exchange-amada-yukihiro-full.webp'} width={1200} height={901} alt="林嘉宏 WIN 博士與天田幸宏合照" loading="lazy" /><figcaption><span>日韓創業教父</span> <span>天田幸宏</span></figcaption></figure>
    </div>
  </section>;
}

export const revisedIndexes = new Set([1, 3, 4, 5, 6, 8, 9, 13, 15, 16, 19]);

/* 10：評審回饋、14：社團經歷 — 依 Win 回饋移除。 */
export const hiddenIndexes = new Set([10, 14]);

export default function CourseRevision({ index }: { index: number }) {
  const art = artworks[String(index) as keyof typeof artworks];
  if (!art) return null;
  return <>
    <section className="generated-artwork" id={index === 13 ? 'mentor' : undefined} aria-label={art.alt}>
      {index === 9 ? <div className="pk-poster">
        <img className="pk-layout" src={art.src} width={art.width} height={art.height} alt={art.alt} loading="lazy" />
        <img className="pk-inset-photo" src={image + 'ryla.webp'} alt="WIN 與同台交流人士的實拍照片" loading="lazy" />
      </div> : <img src={art.src} width={art.width} height={art.height} alt={art.alt} loading="lazy" />}
    </section>
  </>;
}
