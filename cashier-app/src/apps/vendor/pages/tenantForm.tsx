// Shared UI for Create + Edit tenant modals. Layout only - state stays in parent modals.
import type { FC, ReactNode } from 'react';
import { Field, Icon, Input, Select, Text } from '@shared/atoms';
import cls from './tenantForm.module.css';

// --- Currency options shipped with the app -------------------------------
export const CURRENCY_PRESETS = [
  { code: 'INR', label: '\u20B9 Indian Rupee',  tax: 0.18 },
  { code: 'USD', label: '$ US Dollar',           tax: 0.0825 },
  { code: 'EUR', label: '\u20AC Euro',           tax: 0.20 },
  { code: 'GBP', label: '\u00A3 British Pound',  tax: 0.20 },
  { code: 'AED', label: 'AED UAE Dirham',        tax: 0.05 },
] as const;

export const CURRENCY_CODES = CURRENCY_PRESETS.map((c) => c.code);

// --- Layout wrapper: the form itself -------------------------------------
export const TenantForm: FC<{ onSubmit: (e: React.FormEvent) => void; children: ReactNode }> = ({
  onSubmit, children,
}) => <form onSubmit={onSubmit} noValidate className={cls.form}>{children}</form>;

export const TenantFormDivider: FC = () => <hr className={cls.divider} />;

// Two-column field layout shared by both modals (used inside sections).
export const TenantTwoCol: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={cls.twoCol}>{children}</div>
);

// A section with the standard bold-uppercase heading + optional caption.
export const TenantSection: FC<{
  heading: string; caption?: string; children: ReactNode;
}> = ({ heading, caption, children }) => (
  <section>
    <Text as="h3" size="sm" weight="bold" upper tone="subtle">{heading}</Text>
    {caption && <Text size="xs" tone="subtle">{caption}</Text>}
    {children}
  </section>
);

// --- Store-details section (identical in both modals) --------------------
// Every field is fully controlled by the parent - no local state.
interface StoreFieldsProps {
  idPrefix: string;
  name: string;         onName: (v: string) => void;
  city: string;         onCity: (v: string) => void;
  phone: string;        onPhone: (v: string) => void;
  address: string;      onAddress: (v: string) => void;
  currency: string;     onCurrency: (v: string) => void;
  taxRate: string;      onTaxRate: (v: string) => void;
  errors: Partial<Record<'name' | 'city' | 'phone' | 'address' | 'currency' | 'taxRate', string>>;
  currencyOptions?: readonly { code: string; label: string }[];
  taxHint?: string;
  autoFocusName?: boolean;
  namePlaceholder?: string;
  cityPlaceholder?: string;
  addressPlaceholder?: string;
  phonePlaceholder?: string;
}

export const TenantStoreFields: FC<StoreFieldsProps> = ({
  idPrefix: p, name, onName, city, onCity, phone, onPhone,
  address, onAddress, currency, onCurrency, taxRate, onTaxRate,
  errors, currencyOptions, taxHint, autoFocusName,
  namePlaceholder, cityPlaceholder, addressPlaceholder, phonePlaceholder,
}) => (
  <TenantSection heading="Store details">
    <TenantTwoCol>
      <Field label="Store name" required htmlFor={`${p}-name`} error={errors.name}>
        <Input id={`${p}-name`} leadingIcon="store"
          value={name} onChange={(e) => onName(e.target.value)}
          placeholder={namePlaceholder} autoFocus={autoFocusName} invalid={!!errors.name} />
      </Field>
      <Field label="City" required htmlFor={`${p}-city`} error={errors.city}>
        <Input id={`${p}-city`}
          value={city} onChange={(e) => onCity(e.target.value)}
          placeholder={cityPlaceholder} invalid={!!errors.city} />
      </Field>
    </TenantTwoCol>

    <Field label="Full address" required htmlFor={`${p}-addr`} error={errors.address}>
      <Input id={`${p}-addr`}
        value={address} onChange={(e) => onAddress(e.target.value)}
        placeholder={addressPlaceholder} invalid={!!errors.address} />
    </Field>

    <TenantTwoCol>
      <Field label="Phone" htmlFor={`${p}-phone`} hint="Optional">
        <Input id={`${p}-phone`} leadingIcon="phone"
          value={phone} onChange={(e) => onPhone(e.target.value)}
          placeholder={phonePlaceholder} />
      </Field>
      <Field label="Currency" required htmlFor={`${p}-currency`}>
        <Select id={`${p}-currency`} value={currency}
          onChange={(e) => onCurrency(e.target.value)}>
          {(currencyOptions ?? CURRENCY_PRESETS).map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </Select>
      </Field>
    </TenantTwoCol>

    <Field label="Tax rate (%)" required htmlFor={`${p}-tax`}
      error={errors.taxRate} hint={taxHint}>
      <Input id={`${p}-tax`} type="number" step="0.01" min="0" max="100"
        value={taxRate} onChange={(e) => onTaxRate(e.target.value)}
        invalid={!!errors.taxRate} />
    </Field>
  </TenantSection>
);

// --- Preview strip (identical in both modals) ----------------------------
export const TenantPreview: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={cls.preview}>
    <Icon name="shield" size={14} />
    <Text size="xs" tone="subtle">{children}</Text>
  </div>
);

// --- Checkbox row (used only by Edit modal, but shares the visual family)
export const TenantCheckboxRow: FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className={cls.checkboxRow}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <Text size="sm">{label}</Text>
  </label>
);
