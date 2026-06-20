'use client';

import { useEffect, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  springOptions?: {
    bounce?: number;
    duration?: number;
  };
  formatValue?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  className = '',
  springOptions = { bounce: 0, duration: 1000 },
  formatValue = (val) => Math.round(val).toString(),
}: AnimatedNumberProps) {
  const prevValue = useRef(0);

  const { number } = useSpring({
    from: { number: prevValue.current },
    number: value,
    config: springOptions,
  });

  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  return (
    <animated.span className={className}>
      {number.to((n) => formatValue(n))}
    </animated.span>
  );
}
