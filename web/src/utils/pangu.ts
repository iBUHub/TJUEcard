import pangu from 'pangu';

/**
 * Add spacing between Chinese and English characters
 * @param text - The text to process
 * @returns The text with proper spacing
 */
export const spacingText = (text: string): string => {
    if (!text) return '';
    return pangu.spacingText(text);
};
