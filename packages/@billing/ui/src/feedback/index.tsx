// Feedback components — transient and blocking user feedback.

// ToastStack - fixed-corner overlay subscribed to ToastContext. TTL auto-dismiss;
// role="alert"/"status" for screen readers.

// ConfirmDialog - blocking yes/no modal built on shared Modal atom. Danger variant for destructive actions.
import { type FC } from 'react';
import cls from './feedback.module.css';
import { Icon, IconButton, Text, Button } from '../atoms';
import { Modal } from '../organisms';
import { STRINGS } from '@billing/shared/domain/strings';
import { useToast, type Toast } from '@billing/shared/store/ToastContext';

// ToastStack
const iconFor = (kind: Toast['kind']): 'check' | 'close' | 'zap' =>
  kind === 'success' ? 'check' : kind === 'error' ? 'close' : 'zap';

export const ToastStack: FC = () => {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div
      className={cls.toastStack}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[cls.toast, cls[`toast--${t.kind}`]].join(' ')}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          <span
            className={[cls.toast__icon, cls[`toast__icon--${t.kind}`]].join(' ')}
            aria-hidden="true"
          >
            <Icon name={iconFor(t.kind)} size={14} />
          </span>
          <div className={cls.toast__body}>
            <div className={cls.toast__msg}>{t.message}</div>
          </div>
          <button
            type="button"
            className={cls.toast__close}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

// ConfirmDialog
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  title, message,
  confirmLabel = STRINGS.common.confirm,
  cancelLabel = STRINGS.common.cancel,
  danger, onConfirm, onCancel,
}) => (
  <Modal
    title={title}
    onClose={onCancel}
    closeLabel={STRINGS.ariaLabels.closeModal}
    footer={
      <>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <Text>{message}</Text>
  </Modal>
);

// Re-export IconButton so pages don't need to reach into atoms for it.
export { IconButton };
