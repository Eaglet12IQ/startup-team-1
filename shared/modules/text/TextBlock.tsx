import type { ModuleProps } from '../../module';

interface TextBlockProps extends ModuleProps {
    content: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
}

export const TextBlock = ({
                              content,
                              fontSize = 16,
                              fontWeight = 'normal',
                              color = '#000000',
                              x = '0',
                              y = 0,
                              width = 200,
                              height = 50,
                          }: TextBlockProps) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width,
                height,
                fontSize,
                fontWeight,
                color,
                overflow: 'hidden',
            }}
        >
            {content}
        </div>
    );
};
