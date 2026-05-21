import { motion, useInView } from 'framer-motion';
import * as React from 'react';

const pullupVariant = {
    initial: { y: 10, opacity: 0 },
    animate: (i: number) => ({
        y: 0,
        opacity: 1,
        transition: {
            delay: i * 0.025,
        },
    }),
    exit: {
        opacity: 0,
        y: -20,
    },
};

interface HeaderTransitionProps {
    text: string;
    className?: string;
}

export const HeaderTransition = ({ text, className = '' }: HeaderTransitionProps) => {
    const ref = React.useRef<HTMLHeadingElement>(null);
    const isInView = useInView(ref, { once: true });

    const lines = text.split('\n');
    let globalIndex = 0;

    return (
        <motion.h2
            ref={ref}
            exit="exit"
            variants={pullupVariant}
            className={`text-5xl font-semibold text-[#1d1d1f] mb-6 ${className}`}
        >
            {lines.map((line, lineIdx) => (
                <span key={lineIdx} className="flex justify-center">
                    {line.split('').map((char) => {
                        const i = globalIndex++;
                        return (
                            <motion.span
                                key={`${lineIdx}-${i}`}
                                variants={pullupVariant}
                                initial="initial"
                                animate={isInView ? 'animate' : ''}
                                custom={i}
                                className="inline-block"
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                        );
                    })}
                </span>
            ))}
        </motion.h2>
    );
};