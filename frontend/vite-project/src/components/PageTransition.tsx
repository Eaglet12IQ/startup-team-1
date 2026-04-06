import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    // y: 20,
  },
  animate: {
    opacity: 1,
    // y: 0,
  },
  exit: {
    opacity: 0,
    // y: -20,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.3,
};

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};