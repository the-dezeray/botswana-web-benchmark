/**
 * Shorthand name mapping utility
 */

let shorthandMap: Record<string, string> | null = null;

export const loadShorthand = async (): Promise<Record<string, string>> => {
  if (shorthandMap) return shorthandMap;
  
  try {
    const response = await fetch('/shorthand.json');
    shorthandMap = await response.json();
    return shorthandMap;
  } catch (error) {
    console.error('Failed to load shorthand.json:', error);
    return {};
  }
};

export const applyShorthand = (name: string, shorthand: Record<string, string>): string => {
  return shorthand[name] || name;
};
