/**
 * PageShell — every page uses this: header + main region with intro slot.
 */
import type { FC, ReactNode } from 'react';
import cls from './templates.module.css';
import { AppHeader } from '../organisms';
import { Text } from '../atoms';

interface PageShellProps {
  route: 'cashier' | 'dashboard';
  onNavigate: (route: 'cashier' | 'dashboard') => void;
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  fluid?: boolean;
}

export const PageShell: FC<PageShellProps> = ({
  route, onNavigate, title, subtitle, headerRight, children, fluid,
}) => (
  <div className={cls.pageShell}>
    <AppHeader route={route} onNavigate={onNavigate} />
    <main
      className={cls.pageShell__main}
      style={fluid ? { maxWidth: 'none' } : undefined}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--wm-space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div className={cls.pageIntro}>
          <Text as="h1" size="2xl" weight="heavy">{title}</Text>
          {subtitle && <Text tone="subtle">{subtitle}</Text>}
        </div>
        {headerRight}
      </div>
      {children}
    </main>
  </div>
);
