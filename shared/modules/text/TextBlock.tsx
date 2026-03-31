import { useRef, useEffect, useState } from 'react';
import type { ModuleProps } from '../../module';

interface TextBlockProps extends ModuleProps {
    content: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    blockHeight?: number;
    fitText?: boolean;
}

export const TextBlock = ({
                               content,
                               fontSize = 50,
                               fontWeight = 'normal',
                               color = '#000000',
                               textAlign = 'left',
                               verticalAlign = 'center',
                               blockHeight = 10,
                               fitText = false,
                           }: TextBlockProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [fittedSize, setFittedSize] = useState<number | null>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!fitText || !containerRef.current) {
            setFittedSize(null);
            return;
        }

        const fitFontSize = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
                const container = containerRef.current;
                if (!container) return;

                const element = container.querySelector('.text-content') as HTMLElement;
                if (!element) return;

                const containerHeight = container.clientHeight;
                const containerWidth = container.clientWidth;
                
                const margin = 2;
                let minSize = 1;
                let maxSize = 1000;
                let finalSize = fontSize;

                for (let i = 0; i < 15; i++) {
                    const midSize = (minSize + maxSize) / 2;
                    element.style.fontSize = `${midSize}px`;
                    
                    const fitsHeight = element.scrollHeight <= containerHeight + margin;
                    const fitsWidth = element.scrollWidth <= containerWidth + margin;
                    
                    if (fitsHeight && fitsWidth) {
                        minSize = midSize;
                        finalSize = midSize;
                    } else {
                        maxSize = midSize;
                    }
                }

                element.style.fontSize = '';
                setFittedSize(finalSize);
            }, 16);
        };

        fitFontSize();

        const resizeObserver = new ResizeObserver(fitFontSize);
        resizeObserver.observe(containerRef.current);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            resizeObserver.disconnect();
        };
    }, [fitText, fontSize, content]);

    const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
    const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
    
    const fontSizeStyle = fitText && fittedSize !== null
        ? `${fittedSize}px`
        : `calc(${blockHeight}vh * ${fontSize} / 100)`;
    
    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{
                fontSize: fontSizeStyle,
                fontWeight,
                color,
                textAlign,
                display: 'flex',
                alignItems,
                justifyContent,
            }}
        >
            <span className="text-content whitespace-pre-wrap break-words">{content}</span>
        </div>
    );
};