/**
 * Molecules — purposeful compositions of two or more atoms.
 * A molecule manages its own internal interaction state (e.g. the clear
 * button inside SearchBar) but receives all domain data and callbacks
 * from outside via props. The only context a molecule may read directly
 * is `useMoney` for currency-aware display formatting.
 */
import type { ChangeEvent, FC, ReactNode } from 'react';
import cls from './molecules.module.css';
import { Badge, Field, Icon, IconButton, Input, Text, type IconName } from '../atoms';
import type { BadgeTone, PaymentMethod, Product, SaleLine } from '@shared/domain/types';
import { STRINGS } from '@shared/domain/strings';
import { formatPhone, monogramFor } from '@shared/domain/format';
import { useMoney } from '@shared/hooks/useMoney';

/* -------------------------------------------------------------------------- */
/* ProductBadge — the "image" of a product (colored monogram)                 */
/* -------------------------------------------------------------------------- */
interface ProductBadgeProps {
  name: string;
  tone: BadgeTone;
  size?: 'sm' | 'md';
}

export const ProductBadge: FC<ProductBadgeProps> = ({ name, tone, size = 'md' }) => (
  <div
    className={[
      cls.productBadge,
      cls[`productBadge--${size}`],
      cls[`tone--${tone}`],
    ].join(' ')}
    aria-hidden="true"
  >
    {monogramFor(name)}
  </div>
);

/* -------------------------------------------------------------------------- */
/* ProductCard                                                                */
/* -------------------------------------------------------------------------- */
interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  flashing?: boolean;
  onAdd: () => void;
}

export const ProductCard: FC<ProductCardProps> = ({
  product, quantityInCart, flashing, onAdd,
}) => {
  const { money } = useMoney();
  return (
  <button
    type="button"
    className={[cls.productCard, flashing && cls['productCard--flash']]
      .filter(Boolean).join(' ')}
    onClick={onAdd}
    aria-label={`Add ${product.name}, ${money(product.price)}`}
    disabled={product.stock === 0}
  >
    {quantityInCart > 0 && (
      <span className={cls.productCard__qty} aria-hidden="true">{quantityInCart}</span>
    )}
    <ProductBadge name={product.name} tone={product.tone} />
    <Text size="xs" weight="semibold" tone="primary" upper>{product.category}</Text>
    <Text as="p" size="sm" weight="semibold">{product.name}</Text>
    <div className={cls.productCard__footer}>
      <Text weight="heavy" size="lg">{money(product.price)}</Text>
      <span className={cls.productCard__addHint} aria-hidden="true">
        <Icon name="plus" size={12} />
        {STRINGS.cashier.addToCart}
      </span>
    </div>
  </button>
  );
};

/* -------------------------------------------------------------------------- */
/* SearchBar                                                                  */
/* -------------------------------------------------------------------------- */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
}

export const SearchBar: FC<SearchBarProps> = ({ value, onChange, placeholder, clearLabel }) => (
  <div className={cls.searchBar}>
    <Input
      type="search"
      value={value}
      leadingIcon="search"
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      aria-label={placeholder}
    />
    {value && (
      <span className="sr-only">
        <IconButton icon="close" size="sm" a11yLabel={clearLabel} onClick={() => onChange('')} />
      </span>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/* CategoryFilter                                                             */
/* -------------------------------------------------------------------------- */
interface CategoryFilterProps<T extends string> {
  categories: readonly T[];
  active: T;
  onSelect: (category: T) => void;
}

export const CategoryFilter = <T extends string>({
  categories, active, onSelect,
}: CategoryFilterProps<T>) => (
  <div className={cls.filterRow} role="tablist" aria-label="Filter by category">
    {categories.map((cat) => {
      const isActive = cat === active;
      return (
        <button
          key={cat}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={[
            cls.filterChip,
            isActive && cls['filterChip--active'],
          ].filter(Boolean).join(' ')}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      );
    })}
  </div>
);

/* -------------------------------------------------------------------------- */
/* CartLineItem                                                               */
/* -------------------------------------------------------------------------- */
interface CartLineItemProps {
  line: SaleLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export const CartLineItem: FC<CartLineItemProps> = ({
  line, onIncrement, onDecrement, onRemove,
}) => {
  const { money } = useMoney();
  return (
  <div className={cls.cartLine}>
    <ProductBadge name={line.name} tone={line.tone} size="sm" />
    <div className={cls.cartLine__body}>
      <Text weight="semibold" size="sm" truncate>{line.name}</Text>
      <Text size="xs" tone="subtle">{money(line.unitPrice)} each</Text>
      <div className={cls.cartLine__footer}>
        <div className={cls.qtyStepper}>
          <button type="button" onClick={onDecrement} aria-label={STRINGS.cashier.decreaseQty}>
            <Icon name="minus" size={14} />
          </button>
          <span className={cls.qtyStepper__count}>{line.quantity}</span>
          <button type="button" onClick={onIncrement} aria-label={STRINGS.cashier.increaseQty}>
            <Icon name="plus" size={14} />
          </button>
        </div>
        <Text weight="bold">{money(line.lineTotal)}</Text>
      </div>
    </div>
    <IconButton
      icon="close"
      size="sm"
      danger
      a11yLabel={`${STRINGS.cashier.removeLine}: ${line.name}`}
      onClick={onRemove}
    />
  </div>
  );
};

/* -------------------------------------------------------------------------- */
/* StatCard                                                                   */
/* -------------------------------------------------------------------------- */
type StatTone = 'primary' | 'accent' | 'success' | 'danger';

interface StatCardProps {
  label: string;
  value: string;
  /**
   * Optional exact value to show on hover / long-press. Use for compact-
   * formatted metrics so users can still see the precise figure without a
   * separate 'details' click. Also sets aria-label to preserve a11y.
   */
  fullValue?: string;
  icon: IconName;
  tone?: StatTone;
  hint?: string;
}

export const StatCard: FC<StatCardProps> = ({ label, value, fullValue, icon, tone = 'primary', hint }) => {
  // Only show the 'hover for exact value' cue when the compact value actually
  // differs from the full value — otherwise the dotted underline is a false
  // affordance for numbers that are already displayed literally (M-03).
  const isCompacted = fullValue !== undefined && fullValue !== value;
  return (
    <div className={cls.statCard}>
      <div className={cls.statCard__topRow}>
        <Text size="sm" weight="semibold" tone="subtle" upper>{label}</Text>
        <span
          className={[
            cls.statCard__iconWrap,
            tone !== 'primary' && cls[`statCard__iconWrap--${tone}`],
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        >
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div
        className={cls.statCard__value}
        title={isCompacted ? fullValue : undefined}
        aria-label={isCompacted ? `${label}: ${fullValue}` : undefined}
      >
        {value}
      </div>
      {hint && <Text size="xs" tone="subtle">{hint}</Text>}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* EmptyState                                                                 */
/* -------------------------------------------------------------------------- */
interface EmptyStateProps {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, hint, action }) => (
  <div className={cls.emptyState}>
    <div className={cls.emptyState__iconWrap} aria-hidden="true">
      <Icon name={icon} size={28} />
    </div>
    <Text weight="semibold">{title}</Text>
    {hint && <Text size="sm" tone="subtle">{hint}</Text>}
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
/* MobileNumberField                                                          */
/* -------------------------------------------------------------------------- */
interface MobileNumberFieldProps {
  id: string;
  value: string;
  onChange: (formatted: string) => void;
  error?: string;
  required?: boolean;
}

export const MobileNumberField: FC<MobileNumberFieldProps> = ({
  id, value, onChange, error, required,
}) => (
  <Field
    label={STRINGS.payment.mobileLabel}
    hint={STRINGS.payment.mobileHint}
    error={error}
    required={required}
    htmlFor={id}
  >
    <Input
      id={id}
      type="tel"
      inputMode="numeric"
      leadingIcon="phone"
      value={value}
      placeholder="555-123-4567"
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(formatPhone(e.target.value))}
      invalid={!!error}
    />
  </Field>
);

/* -------------------------------------------------------------------------- */
/* PaymentMethodOption                                                        */
/* -------------------------------------------------------------------------- */
interface PaymentMethodOptionProps {
  method: PaymentMethod;
  icon: IconName;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}

export const PaymentMethodOption: FC<PaymentMethodOptionProps> = ({
  method, icon, label, hint, selected, onSelect,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    className={[cls.paymentOption, selected && cls['paymentOption--selected']]
      .filter(Boolean).join(' ')}
    onClick={onSelect}
    data-method={method}
  >
    <span className={cls.paymentOption__icon} aria-hidden="true">
      <Icon name={icon} size={22} />
    </span>
    <div className={cls.paymentOption__body}>
      <Text weight="semibold">{label}</Text>
      <Text size="sm" tone="subtle">{hint}</Text>
    </div>
    <span className={cls.paymentOption__radio} aria-hidden="true" />
  </button>
);

/* -------------------------------------------------------------------------- */
/* Badge convenience: sale payment method → chip                              */
/* -------------------------------------------------------------------------- */
interface PaymentBadgeProps { method: PaymentMethod }

export const PaymentBadge: FC<PaymentBadgeProps> = ({ method }) => {
  const variantMap = { cash: 'success', card: 'primary', lending: 'accent' } as const;
  const labelMap = {
    cash: STRINGS.payment.methodCash,
    card: STRINGS.payment.methodCard,
    lending: STRINGS.payment.methodLending,
  };
  return <Badge variant={variantMap[method]}>{labelMap[method]}</Badge>;
};

/* -------------------------------------------------------------------------- */
/* Pagination — reusable page nav with page-size selector                     */
/* -------------------------------------------------------------------------- */
interface PaginationProps {
  page: number;                       // 1-indexed
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const Pagination: FC<PaginationProps> = ({
  page, pageSize, totalItems, pageSizeOptions = [25, 50, 100], onPageChange, onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalItems);

  // Build a compact page list: 1 … prev current next … last
  const pageList = ((): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    const nums = Array.from(set).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | 'ellipsis')[] = [];
    for (let i = 0; i < nums.length; i++) {
      if (i > 0 && nums[i] - nums[i - 1] > 1) out.push('ellipsis');
      out.push(nums[i]);
    }
    return out;
  })();

  return (
    <div className={cls.pagination} role="navigation" aria-label="Pagination">
      <Text size="sm" tone="subtle">
        Showing <b>{from}</b>–<b>{to}</b> of <b>{totalItems}</b>
      </Text>

      <div className={cls.pagination__controls}>
        <label className={cls.pagination__sizeLabel}>
          <span className="visually-hidden">Rows per page</span>
          <select
            className={cls.pagination__size}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </label>

        <div className={cls.pagination__pages}>
          <button
            type="button"
            className={cls.pagination__btn}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>

          {pageList.map((p, i) =>
            p === 'ellipsis'
              ? <span key={`e${i}`} className={cls.pagination__ellipsis} aria-hidden="true">…</span>
              : (
                <button
                  key={p}
                  type="button"
                  className={[cls.pagination__btn, p === currentPage && cls['pagination__btn--active']]
                    .filter(Boolean).join(' ')}
                  onClick={() => onPageChange(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </button>
              )
          )}

          <button
            type="button"
            className={cls.pagination__btn}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <Icon name="arrow" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* DateRangeFilter — Today | Week | Month | Quarter | All | Custom            */
/* -------------------------------------------------------------------------- */
export type DateRangeKey = 'today' | 'week' | 'month' | 'quarter' | 'all' | 'custom';

interface DateRangeFilterProps {
  value: DateRangeKey;
  onChange: (key: DateRangeKey) => void;
  customFrom?: string;                // ISO date "YYYY-MM-DD"
  customTo?: string;
  onCustomFromChange?: (v: string) => void;
  onCustomToChange?: (v: string) => void;
}

const DATE_RANGE_OPTIONS: readonly { key: DateRangeKey; label: string }[] = [
  { key: 'today',   label: 'Today'    },
  { key: 'week',    label: 'This week' },
  { key: 'month',   label: 'This month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'all',     label: 'All time' },
  { key: 'custom',  label: 'Custom' },
];

export const DateRangeFilter: FC<DateRangeFilterProps> = ({
  value, onChange, customFrom, customTo, onCustomFromChange, onCustomToChange,
}) => (
  <div className={cls.dateRange}>
    <div className={cls.dateRange__chips} role="radiogroup" aria-label="Date range">
      {DATE_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          className={[cls.dateRange__chip, value === opt.key && cls['dateRange__chip--active']]
            .filter(Boolean).join(' ')}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
    {value === 'custom' && (
      <div className={cls.dateRange__custom}>
        <label className={cls.dateRange__customLabel}>
          <span>From</span>
          <input
            type="date"
            value={customFrom ?? ''}
            onChange={(e) => onCustomFromChange?.(e.target.value)}
            className={cls.dateRange__date}
          />
        </label>
        <label className={cls.dateRange__customLabel}>
          <span>To</span>
          <input
            type="date"
            value={customTo ?? ''}
            onChange={(e) => onCustomToChange?.(e.target.value)}
            className={cls.dateRange__date}
          />
        </label>
      </div>
    )}
  </div>
);
