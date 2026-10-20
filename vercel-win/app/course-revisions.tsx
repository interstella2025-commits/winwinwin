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
      <Photo src="beijing.webp" caption="京台科學家論壇｜演講現場" />
      <Photo src="singapore.webp" caption="新加坡｜Brands For Good 商業向善獎" />
      <Photo src="japan.webp" caption="日本" />
      <Photo src="teaching-map.webp" caption="馬來西亞" malaysia />
    </div>
  </section>;
}

export function InternationalExchange() {
  return <section className="international">
    <img className="exchange-title-art" src={image + 'restore-exchange-heading-approved.webp'} width={1942} height={809} alt="走進國際現場，濃縮商業精華" loading="lazy" />
    <div className="photo-grid">
      <figure><img src="/images/gary-v.webp" alt="林嘉宏 WIN 博士與 Gary Vaynerchuk（Gary V）合照" loading="lazy" /><figcaption>Gary Vaynerchuk（Gary V）</figcaption></figure>
      <figure><img src="/images/grant-cardone.webp" alt="林嘉宏 WIN 博士與 Grant Cardone 合照" loading="lazy" /><figcaption>Grant Cardone</figcaption></figure>
      <figure><img src={image + 'cambridge.webp'} alt="WIN 國際交流照片" loading="lazy" /></figure>
      <figure><img src={image + 'award.webp'} alt="WIN 國際交流照片" loading="lazy" /></figure>
    </div>
  </section>;
}

export const revisedIndexes = new Set([1, 3, 4, 5, 6, 8, 9, 13, 15, 16, 19]);

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
