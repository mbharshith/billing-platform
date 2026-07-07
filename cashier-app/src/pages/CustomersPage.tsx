/**
 * CustomersPage — list, search, create.
 * Row click navigates to /customers/:id.
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Text, Textarea } from '../components/atoms';
import { Modal } from '../components/organisms';
import { MobileNumberField, SearchBar } from '../components/molecules';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { digitsOnly, fmtDate, formatPhone, money } from '../domain/format';
import { useCustomers } from '../store/CustomersContext';
import { useToast } from '../store/ToastContext';

interface FormState {
  name: string;
  mobile: string;
  email: string;
  notes: string;
}
const emptyForm = (): FormState => ({ name: '', mobile: '', email: '', notes: '' });

export const CustomersPage: FC = () => {
  const { customers, create } = useCustomers();
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [mobileError, setMobileError] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.mobile.includes(q));
  }, [customers, query]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const mobile = digitsOnly(form.mobile);
    if (mobile.length !== 10) {
      setMobileError(STRINGS.payment.mobileError);
      return;
    }
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const res = create({
      name: form.name,
      mobile,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (!res.ok) {
      toast.error(STRINGS.customers.duplicateMobile);
      return;
    }
    toast.success('Customer added.');
    setForm(null);
    navigate(`/customers/${res.customer.id}`);
  };

  return (
    <>
      <PageHeader
        title={STRINGS.customers.pageTitle}
        subtitle={STRINGS.customers.pageSubtitle}
        actions={<Button variant="primary" leadingIcon="plus" onClick={() => { setMobileError(undefined); setForm(emptyForm()); }}>{STRINGS.customers.addNew}</Button>}
      />

      <div className={cls.card}>
        <div className={cls.toolbar}>
          <div className={cls.toolbar__search}>
            <SearchBar value={query} onChange={setQuery}
                       placeholder={STRINGS.customers.searchPlaceholder}
                       clearLabel="Clear search" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={cls.cardBody}>
            <Text tone="subtle" center>
              {customers.length === 0 ? STRINGS.customers.empty : 'No customers match your search.'}
            </Text>
            {customers.length === 0 && <Text size="sm" tone="subtle" center>{STRINGS.customers.emptyHint}</Text>}
          </div>
        ) : (
          <div className={cls.tableWrap}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th>{STRINGS.customers.columnName}</th>
                  <th>{STRINGS.customers.columnMobile}</th>
                  <th>{STRINGS.customers.columnEmail}</th>
                  <th className="numeric">{STRINGS.customers.columnBalance}</th>
                  <th>{STRINGS.customers.columnSince}</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className={cls.clickable}
                      onClick={() => navigate(`/customers/${c.id}`)}>
                    <td><Text weight="semibold" size="sm">{c.name}</Text></td>
                    <td><Text size="sm">{formatPhone(c.mobile)}</Text></td>
                    <td><Text size="sm" tone={c.email ? 'default' : 'muted'}>{c.email ?? '—'}</Text></td>
                    <td className="numeric">
                      {c.lendingBalance > 0
                        ? <Badge variant="danger">{money(c.lendingBalance)}</Badge>
                        : <Badge variant="success">Clear</Badge>}
                    </td>
                    <td><Text size="sm" tone="subtle">{fmtDate(c.createdAt)}</Text></td>
                    <td className="actions">
                      <Button variant="ghost" size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}>
                        {STRINGS.customers.view}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <Modal
          title={STRINGS.customers.createHeading}
          onClose={() => setForm(null)}
          closeLabel={STRINGS.ariaLabels.closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>{STRINGS.common.cancel}</Button>
              <Button variant="primary" onClick={handleSubmit} leadingIcon="check">{STRINGS.customers.save}</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={cls.formGrid}>
            <Field label={STRINGS.customers.fieldName} htmlFor="c-name" required>
              <Input id="c-name" required autoFocus value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <MobileNumberField
              id="c-mobile"
              value={form.mobile}
              onChange={(v) => { setForm({ ...form, mobile: v }); setMobileError(undefined); }}
              error={mobileError}
              required
            />
            <Field label={STRINGS.customers.fieldEmail} htmlFor="c-email">
              <Input id="c-email" type="email" value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={STRINGS.customers.fieldNotes} htmlFor="c-notes">
              <Textarea id="c-notes" value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </>
  );
};
