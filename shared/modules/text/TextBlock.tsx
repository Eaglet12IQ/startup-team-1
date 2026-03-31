import type { ModuleProps } from '../../module';

interface TextBlockProps extends ModuleProps {
    content: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
}

export const TextBlock = ({
                               content,
                               fontSize = 16,
                               fontWeight = 'normal',
                               color = '#000000',
                               textAlign = 'left',
                               verticalAlign = 'center',
                           }: TextBlockProps) => {
    const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
    const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
    
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                fontSize,
                fontWeight,
                color,
                textAlign,
                overflow: 'hidden',
                display: 'flex',
                alignItems,
                justifyContent,
            }}
        >
            {content}
        </div>
    );
};