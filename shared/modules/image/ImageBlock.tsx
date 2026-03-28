import type { ModuleProps } from '../../module';

interface ImageBlockProps extends ModuleProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export const ImageBlock = ({
  src,
  objectFit = 'cover',
  x = 0,
  y = 0,
  width = 200,
  height = 200,
}: ImageBlockProps) => {
  return (
    <img
      src={src}
      alt=""
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        objectFit,
      }}
    />
  );
};
