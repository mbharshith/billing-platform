// ThemeToggle - shared light/dark switcher used by every shell.
// Extracted to atoms/ so CounterShell + StorefrontShell (and future shells)
// don't each duplicate the 20-line component + CSS.
import type { FC } from 'react';
import { Icon } from './Icon';
import { useTheme } from '@billing/shared/lib/theme';
import cls from './atoms.module.css';

interface Props {
  /** Icon px size. Defaults to 18 (matches counter shell). */
  size?: number;
}

export const ThemeToggle: FC<Props> = ({ size = 18 }) => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={toggle}
      className={cls.themeToggle}
      aria-label={label}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={size} />
    </button>
  );
};
