import { useState, useEffect, useRef } from 'react';
import type { ModuleProps } from '../../module';

interface ImageBlockProps extends ModuleProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

const FALLBACK = 'https://i0.wp.com/kifabrik.mirmi.tum.de/wp-content/uploads/2022/05/placeholder-139.png?fit=1200%2C800&ssl=1&w=640';
const LOAD_TIMEOUT = 5000;

function resolveSrc(src: string): string {
  if (!src) return FALLBACK;
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  return `/api/uploads/${src}`;
}

export const ImageBlock = ({
  src,
  objectFit = 'cover',
}: ImageBlockProps) => {
  const resolved = resolveSrc(src);
  const [imgSrc, setImgSrc] = useState(resolved);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const next = resolveSrc(src);
    setImgSrc(next);
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
