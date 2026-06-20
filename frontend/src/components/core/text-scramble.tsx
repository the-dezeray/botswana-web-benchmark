'use client';

import { useEffect, useState } from 'react';

interface TextScrambleProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
}

export function TextScramble({
  children,
  className = '',
  duration = 1000,
  speed = 50,
  characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
}: TextScrambleProps) {
  // Convert children to string
  const targetText = String(children || '');
  const [displayText, setDisplayText] = useState(targetText);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!targetText) return;
    
    setIsAnimating(true);
    const iterations = Math.floor(duration / speed);
    let currentIteration = 0;

    const interval = setInterval(() => {
      setDisplayText(() => {
        return targetText
          .split('')
          .map((char, index) => {
            if (index < currentIteration) {
              return targetText[index];
            }
            if (char === ' ') return ' ';
            return characterSet[Math.floor(Math.random() * characterSet.length)];
          })
          .join('');
      });

      currentIteration += targetText.length / iterations;

      if (currentIteration >= targetText.length) {
        clearInterval(interval);
        setDisplayText(targetText);
        setIsAnimating(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [targetText, duration, speed, characterSet]);

  return <span className={className}>{displayText}</span>;
}
