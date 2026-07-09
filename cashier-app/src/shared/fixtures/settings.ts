// FIXTURE - default StoreSettings. Scrap when the real backend is live.

// Used by SettingsContext as: (1) initial when localStorage empty, (2) fallback for reset button.

// When the backend arrives, the reset button should either be deleted
// or wired to a real endpoint that returns the tenant's actual defaults.
import type { StoreSettings } from '@shared/domain/types';
import { BRAND } from '@shared/brand';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: `${BRAND.name} Corner Store`,
  address: '123 Market Street, Springfield, IL 62701',
  phone: '+1 (555) 123-4567',
  gstin: '',
  taxRate: 0.0825,
  currency: 'USD',
  receiptFooter: 'Thank you for shopping with us. Returns accepted within 30 days.',
};
