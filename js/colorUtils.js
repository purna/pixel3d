/**
 * colorUtils.js — Pixel 3D Pro Staging Studio
 *
 * Color conversion utilities.
 */

/** Hex string → {r,g,b} in 0-1 range */
export function hexToRgb(hex) {
    const n = parseInt(hex.replace('#',''), 16);
    return { r: ((n>>16)&255)/255, g: ((n>>8)&255)/255, b: (n&255)/255 };
}

/** {r,g,b} 0-1 → '#rrggbb' */
export function rgbToHex({ r, g, b }) {
    const c = v => Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0');
    return `#${c(r)}${c(g)}${c(b)}`;
}