import { useState, useEffect, useRef } from 'react';
import type { ModuleProps } from '../../module';

interface ImageBlockProps extends ModuleProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

const FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
  '<rect width="400" height="300" fill="#f0f0f0"/>' +
  '<rect x="150" y="110" width="100" height="80" rx="8" fill="#d0d0d0"/>' +
  '<circle cx="170" cy="130" r="12" fill="#c0c0c0"/>' +
  '<polygon points="260,115 310,150 260,185" fill="#c0c0c0"/>' +
  '<rect x="150" y="210" width="100" height="6" rx="3" fill="#d0d0d0"/>' +
  '</svg>'
);

const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

function resolveSrc(src: string): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  return `/api/uploads/${src}`;
}

export const ImageBlock = ({
  src,
  objectFit = 'cover',
}: ImageBlockProps) => {
  const resolved = resolveSrc(src) || FALLBACK;
  const [imgSrc, setImgSrc] = useState(resolved);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = resolveSrc(src);
    if (next) {
      setImgSrc(next);
      retryCountRef.current = 0;
    } else {
      setImgSrc(FALLBACK);
    }
  }, [src]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleLoad = () => {
    retryCountRef.current = 0;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  };

  const handleError = () => {
    const resolvedUrl = resolveSrc(src);
    if (!resolvedUrl || retryCountRef.current >= MAX_RETRIES) {
      setImgSrc(FALLBACK);
      return;
    }
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      setImgSrc(resolvedUrl + (resolvedUrl.includes('?') ? '&' : '?') + '_retry=' + retryCountRef.current);
    }, RETRY_DELAY);
  };

  return (
    <img
      src={imgSrc}
      alt=""
      draggable={false}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        width: '100%',
        height: '100%',
        objectFit,
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
};
