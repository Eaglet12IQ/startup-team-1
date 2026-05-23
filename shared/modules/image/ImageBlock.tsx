import { useState, useEffect, useRef } from 'react';
import type { ModuleProps } from '../../module';

interface ImageBlockProps extends ModuleProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

const FALLBACK = 'https://i0.wp.com/kifabrik.mirmi.tum.de/wp-content/uploads/2022/05/placeholder-139.png?fit=1200%2C800&ssl=1&w=640';
const LOAD_TIMEOUT = 3000; // 3 секунды таймаут

function isValidImageUrl(s: string): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:');
}

export const ImageBlock = ({
  src,
  objectFit = 'cover',
}: ImageBlockProps) => {
  const [imgSrc, setImgSrc] = useState(() => isValidImageUrl(src) ? src : FALLBACK);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    setImgSrc(isValidImageUrl(src) ? src : FALLBACK);
    loadedRef.current = false;
  }, [src]);

  useEffect(() => {
    if (imgSrc === FALLBACK) return;
    timerRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        setImgSrc(FALLBACK);
      }
    }, LOAD_TIMEOUT);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [imgSrc]);

  const handleLoad = () => {
    loadedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleError = () => {
    loadedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setImgSrc(FALLBACK);
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