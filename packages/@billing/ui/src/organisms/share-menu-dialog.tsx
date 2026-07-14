// ShareMenuDialog - organism that renders a QR + copy-link + WhatsApp share
// modal for a public menu URL. Reusable for any 'share this link' surface;
// callers today: outlet-settings admin page. Callers tomorrow: 'share this
// cart' from the storefront, 'share this receipt' from Cashier, etc.
//
// Design notes:
//   * Uses the existing Modal organism (portal + backdrop + focus trap).
//   * QR code is rendered client-side via `qrcode` npm package as SVG
//     string; no external network call, works offline in the local demo.
//   * WhatsApp share opens `wa.me` universal link so it works on desktop
//     web + iOS + Android without an app-scheme detection.
//   * Copy button uses navigator.clipboard with a document.execCommand
//     fallback for older browsers.

import { useEffect, useMemo, useState, type FC } from 'react';
import QRCode from 'qrcode';
import { Button, Icon, Text } from '@billing/ui/atoms';
import { Modal } from './index';

export interface ShareMenuDialogProps {
  readonly title: string;              // "Share Spice Route - Koramangala menu"
  readonly subtitle?: string;          // e.g. "Anyone with the link can view"
  readonly url: string;                // Fully-qualified URL to share
  readonly whatsappMessage?: string;   // Message body for the wa.me link
  readonly onClose: () => void;
  readonly footerNote?: string;        // Small helper below the actions
}

const buildWhatsAppHref = (msg: string, url: string): string => {
  const body = `${msg}\n${url}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

export const ShareMenuDialog: FC<ShareMenuDialogProps> = ({
  title, subtitle, url, whatsappMessage = 'Check out our menu:',
  onClose, footerNote,
}) => {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Regenerate QR whenever the URL changes.
  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 260,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((svg) => { if (!cancelled) setQrSvg(svg); })
      .catch(() => { if (!cancelled) setQrSvg(''); });
    return () => { cancelled = true; };
  }, [url]);

  const waHref = useMemo(() => buildWhatsAppHref(whatsappMessage, url), [whatsappMessage, url]);

  const onCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const onDownloadPng = () => {
    // Render SVG -> canvas -> PNG so users can print / drop into slides.
    const img = new Image();
    const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const size = 640;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'menu-qr.png';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      }, 'image/png');
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  };

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      closeLabel="Close"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Done</Button>
          <Button variant="primary" leadingIcon="check" onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
        {/* Left: the URL + action buttons */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{
            border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13, wordBreak: 'break-all', background: '#f9fafb',
          }}>
            {url}
          </div>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '10px 14px', borderRadius: 8, textDecoration: 'none',
              background: '#25D366', color: '#ffffff', fontWeight: 700, fontSize: 14,
            }}
          >
            <Icon name="phone" size={16} /> Share on WhatsApp
          </a>

          <Button variant="secondary" leadingIcon="print" onClick={onDownloadPng}>
            Download QR (PNG)
          </Button>

          {footerNote && (
            <div style={{ marginTop: 4 }}>
              <Text size="xs" tone="muted">{footerNote}</Text>
            </div>
          )}
        </div>

        {/* Right: the QR code preview */}
        <div style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: 12, display: 'grid', placeItems: 'center', minHeight: 260,
        }}>
          {qrSvg
            ? <div aria-label="QR code for menu link" style={{ width: 240, height: 240 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
            : <Text size="sm" tone="muted">Generating QR&hellip;</Text>}
        </div>
      </div>
    </Modal>
  );
};
