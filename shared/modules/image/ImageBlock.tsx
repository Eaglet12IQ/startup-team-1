import type { ModuleProps } from '../../module';

interface ImageBlockProps extends ModuleProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export const ImageBlock = ({
  src,
  objectFit = 'cover',
}: ImageBlockProps) => {
  return (
    <img
      src={src}
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