export interface TextBlockData {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'center' | 'bottom';
  fitText: boolean;
}

export interface ImageBlockData {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
}

export type BlockData = TextBlockData | ImageBlockData;

export interface SlideData {
  schema_name: string;
  schema_id: string;
  payload: {
    blocks: BlockData[];
  };
}