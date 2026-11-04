'use client';
import { useEffect, useRef, useState } from 'react';

type Master = { src: string; w: number; h: number; alt: string; title: string; name: string; pos?: string };

export default function MastersCarousel({ items }: { items: Master[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const cards = Array.from(el.children) as HTMLElement[];
      const left = el.scrollLeft;
      let best = 0, d = Infinity;
      cards.forEach((c, i) => { const x = Math.abs(c.offsetLeft - el.offsetLeft - left); if (x < d) { d = x; best = i; } });
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) best = cards.length - 1;
      setActive(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const go = (i: number) => {
    const el = track.current;
    const c = el?.children[i] as HTMLElement | undefined;
    if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };
  return <div className="masters">
    <div className="masters-track" ref={track}>
      {items.map(m => <figure className="master-card" key={m.name}>
        <div className="master-photo"><img src={m.src} width={m.w} height={m.h} alt={m.alt} loading="lazy" style={m.pos ? { objectPosition: m.pos } : undefined} /></div>
        <figcaption><span className="master-title">{m.title}</span><span className="master-name">{m.name}</span></figcaption>
      </figure>)}
    </div>
    <div className="masters-dots">
      {items.map((m, i) => <button type="button" key={m.name} aria-label={m.name} aria-current={i === active} className={i === active ? 'on' : undefined} onClick={() => go(i)} />)}
    </div>
  </div>;
}
