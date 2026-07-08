/**
 * Icon — single source of truth for SVG icons (§1 RULE).
 * All icons use `currentColor` so parent-color tinting works.
 */
import type { FC, SVGProps } from 'react';

export type IconName =
  | 'search' | 'close' | 'plus' | 'minus' | 'trash' | 'check'
  | 'bag' | 'cart' | 'receipt' | 'print' | 'phone' | 'user'
  | 'shield' | 'zap' | 'chart' | 'arrow' | 'lock' | 'cash'
  | 'card' | 'coins' | 'spark' | 'store' | 'sun' | 'moon';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number | string;
  title?: string;
}

const PATHS: Record<IconName, JSX.Element> = {
  search:  <path d="M11 4a7 7 0 105.196 11.696l3.554 3.554 1.414-1.414-3.554-3.554A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"/>,
  close:   <path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71l-1.42-1.42L9.17 12 2.88 5.71 4.3 4.29l6.29 6.3 6.3-6.3z"/>,
  plus:    <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>,
  minus:   <path d="M5 11h14v2H5z"/>,
  trash:   <path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12a1 1 0 01-1 1H8a1 1 0 01-1-1L6 9z"/>,
  check:   <path d="M9 16.2l-3.5-3.6L4 14l5 5 11-11-1.4-1.4z"/>,
  bag:     <path d="M6 7V6a6 6 0 0112 0v1h3v14a1 1 0 01-1 1H4a1 1 0 01-1-1V7h3zm2 0h8V6a4 4 0 10-8 0v1z"/>,
  cart:    <path d="M7 4h-2v2h2l3 8-1.2 2.2A2 2 0 0010 19h9v-2h-9l1-2h7a2 2 0 001.8-1.2L22 7H8l-1-3zm11 15a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"/>,
  receipt: <path d="M5 2h14a1 1 0 011 1v19l-3-2-3 2-3-2-3 2-3-2V3a1 1 0 011-1zm2 6v2h10V8H7zm0 4v2h10v-2H7zm0 4v2h7v-2H7z"/>,
  print:   <path d="M8 3h8v4H8V3zM5 9h14a2 2 0 012 2v6h-4v4H7v-4H3v-6a2 2 0 012-2zm4 8v4h6v-4H9zm10-4a1 1 0 100-2 1 1 0 000 2z"/>,
  phone:   <path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11 11 0 003.5.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11 11 0 00.56 3.5 1 1 0 01-.25 1L6.6 10.8z"/>,
  user:    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0v1H4v-1z"/>,
  shield:  <path d="M12 2l9 4v6c0 5-3.8 9.4-9 10-5.2-.6-9-5-9-10V6l9-4z"/>,
  zap:     <path d="M13 2L4 14h6l-1 8 9-12h-6z"/>,
  chart:   <path d="M4 20h16v2H4v-2zm2-6h3v5H6v-5zm5-4h3v9h-3v-9zm5-6h3v15h-3V4z"/>,
  arrow:   <path d="M13 5l7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6z"/>,
  lock:    <path d="M12 2a5 5 0 015 5v3h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2h1V7a5 5 0 015-5zm-3 8h6V7a3 3 0 10-6 0v3z"/>,
  cash:    <path d="M2 6h20v12H2V6zm2 2v8h16V8H4zm8 1a3 3 0 100 6 3 3 0 000-6z"/>,
  card:    <path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v2h16V7H4zm0 4v6h16v-6H4z"/>,
  coins:   <path d="M8 3a5 5 0 015 5 5 5 0 01-1.2 3.25A5 5 0 1116 21a5 5 0 01-4.75-3.5A5 5 0 118 3zm0 2a3 3 0 100 6 3 3 0 000-6z"/>,
  spark:   <path d="M12 2v6l4-4-2 5h6l-6 2 4 4-5-2v6l-2-6-4 4 2-5H3l6-2-4-4 5 2V2z"/>,
  store:   <path d="M4 4h16l1 5a2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-3 0L4 4zm0 8a4.5 4.5 0 004-1.3A4.5 4.5 0 0012 12a4.5 4.5 0 004-1.3 4.5 4.5 0 004 1.3v8H4v-8z"/>,
  sun:     <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-5a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM4.22 4.22a1 1 0 011.42 0l1.4 1.4a1 1 0 11-1.41 1.42l-1.41-1.41a1 1 0 010-1.41zm12.72 12.72a1 1 0 011.42 0l1.41 1.41a1 1 0 11-1.41 1.42l-1.42-1.42a1 1 0 010-1.41zM2 12a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm17 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM4.22 19.78a1 1 0 010-1.42l1.41-1.4a1 1 0 011.42 1.41l-1.41 1.41a1 1 0 01-1.42 0zm12.72-12.72a1 1 0 010-1.42l1.41-1.41a1 1 0 111.42 1.42l-1.42 1.41a1 1 0 01-1.41 0z"/>,
  moon:    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>,
};

export const Icon: FC<IconProps> = ({
  name,
  size = 20,
  title,
  ...rest
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    focusable="false"
    {...rest}
  >
    {title && <title>{title}</title>}
    {PATHS[name]}
  </svg>
);
