// PageShell + CenteredMessage - layout templates shared by all pages.
import type { FC, ReactNode } from 'react';
import cls from './templates.module.css';
import { AppHeader } from '../organisms';
import { Icon, Text, type IconName } from '../atoms';
import { type IconTone } from '../atoms/Icon';

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
    <main className={`${cls.pageShell__main} ${fluid ? cls['pageShell__main--fluid'] : ''}`}>
      <div className={cls.pageHeaderRow}>
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

// CenteredMessage - reusable full-viewport centered placard. Used by ForbiddenCard + ComingSoonPage.
interface CenteredMessageProps {
  icon?: IconName;
  iconTone?: IconTone;
  title: string;
  body?: ReactNode;
  footer?: ReactNode;
  full?: boolean;  // 100vh instead of 60vh
  plain?: boolean; // no card chrome (transparent bg, no shadow)
}

export const CenteredMessage: FC<CenteredMessageProps> = ({
  icon, iconTone, title, body, footer, full, plain,
}) => (
  <main className={`${cls.centered} ${full ? cls['centered--full'] : ''}`}>
    <div className={`${cls.centered__card} ${plain ? cls['centered__card--plain'] : ''}`}>
      {icon && (
        <div className={cls.centered__iconWrap}>
          <Icon name={icon} size={48} tone={iconTone} />
        </div>
      )}
      <Text as="h1" size="2xl" weight="heavy">{title}</Text>
      {body && (typeof body === 'string' ? <Text tone="subtle">{body}</Text> : body)}
      {footer}
    </div>
  </main>
);
