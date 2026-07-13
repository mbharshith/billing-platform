// Phase 10 - Marketing (WhatsApp, SMS, Segments, Campaigns).
// Zero backend integration - this is pure schema + admin UI. When Meta/Twilio
// keys land, the sending logic drops into the Campaign's status transition.

import type { FC } from 'react';
import { CrudPage, boolField, numField, selectField, textField, textareaField } from '@billing/ui/admin';
import { useTable } from '@billing/shared/hooks/useTable';
import { fmtDate } from '@billing/shared/domain/format';
import type {
  WhatsAppTemplate, CustomerSegment, MarketingCampaign,
} from '@billing/shared/domain/tmbill-extras';

export const WATemplatesPage: FC = () => {
  const api = useTable<WhatsAppTemplate>('waTemplates');
  return (
    <CrudPage<WhatsAppTemplate>
      title="WhatsApp Templates"
      subtitle="Approved message templates ({{name}}, {{amount}} placeholders)."
      breadcrumb={['Marketing', 'WhatsApp Templates']}
      api={api}
      searchPlaceholder="Search by name..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({
        name: '', category: 'promotional', language: 'en',
        body: '', variables: [], approved: false, active: true,
      })}
      fields={[
        textField('name',     'Template Name', true),
        selectField('category', 'Category', [
          { value: 'transactional', label: 'Transactional (bill, OTP)' },
          { value: 'promotional',   label: 'Promotional (offers)' },
          { value: 'utility',       label: 'Utility (updates)' },
        ]),
        selectField('language', 'Language', [
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'Hindi' },
          { value: 'kn', label: 'Kannada' },
        ]),
        textareaField('body',    'Message body'),
        boolField('approved', 'Approved by Meta'),
        boolField('active',   'Active'),
      ]}
      columns={[
        { key: 'name', label: 'Name',   sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'cat',  label: 'Category', render: (r) => r.category },
        { key: 'lang', label: 'Lang',   render: (r) => r.language },
        { key: 'preview', label: 'Preview',
          render: (r) => r.body.length > 60 ? r.body.slice(0, 60) + '...' : r.body },
        { key: 'appr', label: 'Approved', render: (r) => r.approved ? 'Yes' : 'No' },
      ]}
    />
  );
};

export const SegmentsPage: FC = () => {
  const api = useTable<CustomerSegment>('segments');
  return (
    <CrudPage<CustomerSegment>
      title="Customer Segments"
      subtitle="Rule-based cohorts for campaign targeting."
      breadcrumb={['CRM', 'Segments']}
      api={api}
      searchPlaceholder="Search segments..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({
        name: '', rule: '', memberCount: 0,
        refreshedAt: new Date().toISOString(), active: true,
      })}
      fields={[
        textField('name',         'Segment Name', true),
        textareaField('rule',        'Rule (DSL)'),
        numField('memberCount',  'Member Count'),
        boolField('active',       'Active'),
      ]}
      columns={[
        { key: 'name', label: 'Name', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'rule', label: 'Rule', render: (r) => r.rule },
        { key: 'mbrs', label: 'Members', sortValue: (r) => r.memberCount, render: (r) => String(r.memberCount) },
        { key: 'refr', label: 'Refreshed', render: (r) => fmtDate(r.refreshedAt) },
      ]}
    />
  );
};

export const CampaignsPage: FC = () => {
  const api = useTable<MarketingCampaign>('campaigns');
  const tpls = useTable<WhatsAppTemplate>('waTemplates');
  const segs = useTable<CustomerSegment>('segments');
  return (
    <CrudPage<MarketingCampaign>
      title="Campaigns"
      subtitle="Bulk WhatsApp / SMS / Email pushes with delivery + read metrics."
      breadcrumb={['Marketing', 'Campaigns']}
      api={api}
      searchPlaceholder="Search campaign..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({
        name: '', channel: 'whatsapp',
        templateId: tpls.rows[0]?.id ?? null,
        segmentId:  segs.rows[0]?.id ?? null,
        scheduledAt: new Date().toISOString(),
        sentCount: 0, deliveredCount: 0, readCount: 0, conversionCount: 0,
        status: 'draft',
      })}
      fields={[
        textField('name',       'Campaign Name', true),
        selectField('channel',    'Channel', [
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'sms',      label: 'SMS' },
          { value: 'email',    label: 'Email' },
        ]),
        selectField('templateId', 'Template',
          [{ value: '', label: '- none -' }, ...tpls.rows.map((t) => ({ value: t.id, label: t.name }))]),
        selectField('segmentId',  'Segment',
          [{ value: '', label: '- none -' }, ...segs.rows.map((s) => ({ value: s.id, label: s.name }))]),
        selectField('status',     'Status', [
          { value: 'draft',     label: 'Draft' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'sending',   label: 'Sending' },
          { value: 'complete',  label: 'Complete' },
          { value: 'failed',    label: 'Failed' },
        ]),
      ]}
      columns={[
        { key: 'name',   label: 'Name',      sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'ch',     label: 'Channel',   render: (r) => r.channel },
        { key: 'seg',    label: 'Segment',
          render: (r) => r.segmentId ? (segs.rows.find((s) => s.id === r.segmentId)?.name ?? '-') : '-' },
        { key: 'sched',  label: 'Scheduled', sortValue: (r) => r.scheduledAt, render: (r) => fmtDate(r.scheduledAt) },
        { key: 'sent',   label: 'Sent',      render: (r) => String(r.sentCount) },
        { key: 'deliv',  label: 'Delivered', render: (r) => String(r.deliveredCount) },
        { key: 'read',   label: 'Read',      render: (r) => String(r.readCount) },
        { key: 'conv',   label: 'Conv',      render: (r) => String(r.conversionCount) },
        { key: 'status', label: 'Status',    render: (r) => r.status },
      ]}
    />
  );
};
