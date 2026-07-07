/**
 * Molecules — reusable compositions of atoms.
 * Each molecule is a small, purposeful UI unit.
 */
import type { ChangeEvent, FC, ReactNode } from 'react';
import cls from './molecules.module.css';
import { Badge, Field, Icon, IconButton, Input, Text, type IconName } from '../atoms';
import type { BadgeTone, PaymentMethod, Product, SaleLine } from '../../domain/types';
import { STRINGS } from '../../domain/strings';
import { formatPhone, money, monogramFor } from '../../domain/format';

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
}) => (
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
}) => (
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

/* -------------------------------------------------------------------------- */
/* StatCard                                                                   */
/* -------------------------------------------------------------------------- */
type StatTone = 'primary' | 'accent' | 'success' | 'danger';

interface StatCardProps {
  label: string;
  value: string;
  icon: IconName;
  tone?: StatTone;
  hint?: string;
}

export const StatCard: FC<StatCardProps> = ({ label, value, icon, tone = 'primary', hint }) => (
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
    <Text size="3xl" weight="heavy">{value}</Text>
    {hint && <Text size="xs" tone="subtle">{hint}</Text>}
  </div>
);

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
