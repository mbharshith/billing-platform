/**
 * Atomic building blocks — the lowest-level UI primitives.
 * Each atom does exactly one thing and accepts no children it doesn't
 * explicitly type. Rules every atom must follow:
 *   - No inline visual styles (colors, spacing, typography belong in
 *     atoms.module.css or design tokens).
 *   - Every interactive element must carry a visible label or aria-label.
 *   - Touch targets are at minimum 44×44 px (WCAG 2.2 AA, §10).
 *   - No direct reads from any React Context — props only.
 */
import type {
  ButtonHTMLAttributes, FC, InputHTMLAttributes, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';
import cls from './atoms.module.css';
import { Icon, type IconName } from './Icon';

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  children,
  className,
  ...rest
}) => {
  const classes = [
    cls.button,
    cls[`button--${variant}`],
    size !== 'md' && cls[`button--${size}`],
    block && cls['button--block'],
    className,
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : leadingIcon && <Icon name={leadingIcon} size={16} />}
      {children}
      {!loading && trailingIcon && <Icon name={trailingIcon} size={16} />}
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* IconButton                                                                 */
/* -------------------------------------------------------------------------- */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  a11yLabel: string;             // §10 RULE: every interactive element has an accessible name
  size?: 'sm' | 'md';
  danger?: boolean;
}

export const IconButton: FC<IconButtonProps> = ({
  icon, a11yLabel, size = 'md', danger, className, ...rest
}) => {
  const classes = [
    cls.iconButton,
    size === 'sm' && cls['iconButton--sm'],
    danger && cls['iconButton--danger'],
    className,
  ].filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} aria-label={a11yLabel} {...rest}>
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Input (with Field wrapper)                                                 */
/* -------------------------------------------------------------------------- */
interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}

export const Field: FC<FieldProps> = ({ label, required, hint, error, children, htmlFor }) => (
  <div className={cls.field}>
    <div className={cls.fieldLabelRow}>
      <label className={cls.fieldLabel} htmlFor={htmlFor}>
        {label}
        {required && <span className={cls.fieldRequired} aria-hidden="true">*</span>}
      </label>
      {hint && <span className={cls.fieldHint}>{hint}</span>}
    </div>
    {children}
    {error && (
      <div className={cls.fieldError} role="alert" aria-live="polite">{error}</div>
    )}
  </div>
);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: IconName;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leadingIcon, invalid, className, ...rest }, ref) => (
    <div
      className={[
        cls.inputShell,
        invalid && cls['inputShell--error'],
        className,
      ].filter(Boolean).join(' ')}
    >
      {leadingIcon && (
        <Icon name={leadingIcon} size={18} className={cls.inputIcon} />
      )}
      <input
        ref={ref}
        className={cls.inputControl}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    </div>
  ),
);
Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */
type BadgeVariant = 'neutral' | 'primary' | 'accent' | 'success' | 'danger';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: FC<BadgeProps> = ({ children, variant = 'neutral', className }) => (
  <span className={[cls.badge, cls[`badge--${variant}`], className].filter(Boolean).join(' ')}>
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Text — the ONLY typography atom                                            */
/* -------------------------------------------------------------------------- */
type TextSize   = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
type TextTone   = 'default' | 'subtle' | 'muted' | 'inverse' | 'danger' | 'success' | 'primary';

interface TextProps {
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'strong';
  size?: TextSize;
  weight?: TextWeight;
  tone?: TextTone;
  upper?: boolean;
  truncate?: boolean;
  center?: boolean;
  className?: string;
  children: ReactNode;
}

export const Text: FC<TextProps> = ({
  as: Tag = 'span',
  size = 'md',
  weight = 'regular',
  tone = 'default',
  upper, truncate, center,
  className,
  children,
}) => {
  const classes = [
    cls.text,
    cls[`text--${size}`],
    cls[`text--${weight}`],
    tone !== 'default' && cls[`text--${tone}`],
    upper && cls['text--upper'],
    truncate && cls['text--truncate'],
    center && cls['text--center'],
    className,
  ].filter(Boolean).join(' ');
  return <Tag className={classes}>{children}</Tag>;
};

/* -------------------------------------------------------------------------- */
/* Spinner                                                                    */
/* -------------------------------------------------------------------------- */
export const Spinner: FC<{ className?: string }> = ({ className }) => (
  <span
    className={[cls.spinner, className].filter(Boolean).join(' ')}
    role="status"
    aria-label="Loading"
  />
);

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */
type SelectAttrs = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>;
interface SelectProps extends SelectAttrs { invalid?: boolean; className?: string }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, children, ...rest }, ref) => (
    <div
      className={[cls.inputShell, invalid && cls['inputShell--error'], className]
        .filter(Boolean).join(' ')}
    >
      <select
        ref={ref}
        className={cls.inputControl}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
    </div>
  ),
);
Select.displayName = 'Select';

/* -------------------------------------------------------------------------- */
/* Textarea                                                                   */
/* -------------------------------------------------------------------------- */
type TextareaAttrs = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;
interface TextareaProps extends TextareaAttrs { invalid?: boolean; className?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, rows = 3, ...rest }, ref) => (
    <div
      className={[cls.inputShell, invalid && cls['inputShell--error'], className]
        .filter(Boolean).join(' ')}
    >
      <textarea
        ref={ref}
        rows={rows}
        className={cls.inputControl}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    </div>
  ),
);
Textarea.displayName = 'Textarea';

export { Icon } from './Icon';
export type { IconName } from './Icon';
