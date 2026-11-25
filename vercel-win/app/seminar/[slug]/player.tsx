'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicConfig } from '@/lib/seminar/public';

type Props = {
  video: PublicConfig['video'];
  /** 依伺服器時間算出的目前播放秒數（示範時是縮短後的秒數）。 */
  target: () => number;
  poster?: string;
  onUnmute: () => void;
};

/**
 * 說明會播放器：不能快轉、不能倒轉，所有人看到同一個時間點。
 * HLS／MP4 每 2 秒校正一次；Vimeo／YouTube 進場時對齊一次。
 * 範例影片比場次短時會循環播放。
 */
export default function Player({ video, target, poster, onUnmute }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);
  const native = video.provider === 'hls' || video.provider === 'mp4';

  useEffect(() => {
    const el = ref.current;
    if (!el || !native || !video.url) return;
    let hls: { destroy(): void } | null = null;
    let disposed = false;
    const aligned = () => {
      const t = targetRef.current();
      const d = el.duration;
      if (!Number.isFinite(d) || d <= 0) return t;
      return video.sample ? t % d : Math.min(t, d - 0.2);
    };
    const sync = () => {
      const want = aligned();
      if (Math.abs(el.currentTime - want) > 2.5) el.currentTime = want;
    };
    const play = () => el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    const onMeta = () => { sync(); play(); };
    const onSeeking = () => { if (Math.abs(el.currentTime - aligned()) > 3) el.currentTime = aligned(); };
    const onPause = () => { if (!disposed && !el.ended) setBlocked(true); };
    const onPlaying = () => { setWaiting(false); setBlocked(false); };
    const onWaiting = () => setWaiting(true);
    el.muted = true;
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('seeking', onSeeking);
    el.addEventListener('pause', onPause);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('waiting', onWaiting);
    if (video.provider === 'hls' && !el.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (disposed) return;
        if (Hls.isSupported()) { const h = new Hls({ maxBufferLength: 20 }); h.loadSource(video.url); h.attachMedia(el); hls = h; }
        else el.src = video.url;
      });
    } else el.src = video.url;
    const timer = window.setInterval(() => { if (!el.paused) sync(); }, 2000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('seeking', onSeeking);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('waiting', onWaiting);
      hls?.destroy();
      el.removeAttribute('src');
      el.load();
    };
  }, [native, video.provider, video.url, video.sample]);

  const unmute = () => {
    const el = ref.current;
    if (el) { el.muted = false; el.currentTime = video.sample && Number.isFinite(el.duration) ? targetRef.current() % el.duration : targetRef.current(); el.play().catch(() => undefined); }
    setMuted(false); setBlocked(false); onUnmute();
  };
  const fullscreen = () => {
    const el = wrap.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = ref.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else if (el?.requestFullscreen) el.requestFullscreen().catch(() => undefined);
    else v?.webkitEnterFullscreen?.();
  };

  const [embedStart] = useState(() => Math.floor(target()));
  return (
    <div className="sm-player" ref={wrap}>
      {native ? (
        <video ref={ref} playsInline muted autoPlay preload="auto" poster={poster || undefined} disablePictureInPicture controlsList="nodownload noplaybackrate noremoteplayback" onContextMenu={e => e.preventDefault()} />
      ) : video.provider === 'vimeo' ? (
        <iframe title="說明會影片" src={`https://player.vimeo.com/video/${encodeURIComponent(video.id)}?${video.hash ? `h=${encodeURIComponent(video.hash)}&` : ''}autoplay=1&muted=1&controls=0&keyboard=0&dnt=1#t=${embedStart}s`} allow="autoplay; fullscreen; picture-in-picture" />
      ) : (
        <iframe title="說明會影片" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&start=${embedStart}`} allow="autoplay; fullscreen" />
      )}
      {video.sample && <span className="sm-player-sample">範例影片・正式場次會替換</span>}
      {native && waiting && !blocked && <span className="sm-player-wait" aria-hidden="true" />}
      {native && (muted || blocked) && (
        <button type="button" className="sm-player-sound" onClick={unmute}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" /></svg>
          {blocked && !muted ? '繼續觀看' : '點這裡開啟聲音'}
        </button>
      )}
      {native && <button type="button" className="sm-player-fs" onClick={fullscreen} aria-label="全螢幕"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg></button>}
    </div>
  );
}
