import type { ModuleProps } from '../../module';

interface ImageBlockProps extends ModuleProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

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
  return (
    <img
      src={resolveSrc(src)}
      alt=""
      draggable={false}
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