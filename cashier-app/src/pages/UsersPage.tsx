/**
 * UsersPage — staff management (admin only).
 * List + inline modal form for create/edit.
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Select, Text } from '../components/atoms';
import { Modal } from '../components/organisms';
import { ConfirmDialog } from '../components/feedback';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { fmtDate } from '../domain/format';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { useUsers } from '../store/UsersContext';
import type { User, UserRole } from '../domain/types';

interface UserFormState {
  id: string | null;
  name: string;
  username: string;
  password: string;
  role: UserRole;
}
const emptyForm = (): UserFormState =>
  ({ id: null, name: '', username: '', password: '', role: 'cashier' });

export const UsersPage: FC = () => {
  const { users, create, update, setActive } = useUsers();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<UserFormState | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<User | null>(null);

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  const openCreate = () => setForm(emptyForm());
  const openEdit = (u: User) => setForm({
    id: u.id, name: u.name, username: u.username, password: '', role: u.role,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.id === null) {
      const res = create({
        name: form.name, username: form.username,
        password: form.password, role: form.role,
      });
      if (!res.ok) {
        toast.error(res.error === 'duplicate' ? STRINGS.users.duplicateUser : STRINGS.users.weakPassword);
        return;
      }
      toast.success(`Invited ${res.user.name}.`);
    } else {
      if (form.password && form.password.length < 8) {
        toast.error(STRINGS.users.weakPassword);
        return;
      }
      const patch: Partial<Pick<User, 'name' | 'role' | 'password'>> = form.password
        ? { name: form.name, role: form.role, password: form.password }
        : { name: form.name, role: form.role };
      update(form.id, patch);
      toast.success('User updated.');
    }
    setForm(null);
  };

  const handleToggle = (u: User) => {
    if (u.id === currentUser?.id) {
      toast.error(STRINGS.users.cannotDeactivateSelf);
      return;
    }
    if (u.active) setConfirmingDeactivate(u);
    else {
      setActive(u.id, true);
      toast.success(`${u.name} reactivated.`);
    }
  };

  const doDeactivate = () => {
    if (!confirmingDeactivate) return;
    setActive(confirmingDeactivate.id, false);
    toast.success(`${confirmingDeactivate.name} deactivated.`);
    setConfirmingDeactivate(null);
  };

  return (
    <>
      <PageHeader
        title={STRINGS.users.pageTitle}
        subtitle={STRINGS.users.pageSubtitle}
        actions={<Button variant="primary" leadingIcon="plus" onClick={openCreate}>{STRINGS.users.addNew}</Button>}
      />

      <div className={cls.card}>
        {sorted.length === 0 ? (
          <div className={cls.cardBody}><Text tone="subtle" center>{STRINGS.users.empty}</Text></div>
        ) : (
          <div className={cls.tableWrap}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th>{STRINGS.users.columnName}</th>
                  <th>{STRINGS.users.columnUsername}</th>
                  <th>{STRINGS.users.columnRole}</th>
                  <th>{STRINGS.users.columnStatus}</th>
                  <th className="actions">{STRINGS.users.columnActions}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className={!u.active ? cls.mutedRow : undefined}>
                      <td>
                        <Text weight="semibold" size="sm">{u.name}</Text>
                        <Text size="xs" tone="subtle">joined {fmtDate(u.createdAt)}</Text>
                      </td>
                      <td><Text size="sm">{u.username}</Text></td>
                      <td><Badge variant={u.role === 'admin' ? 'primary' : 'neutral'}>{u.role}</Badge></td>
                      <td>
                        <Badge variant={u.active ? 'success' : 'danger'}>
                          {u.active ? STRINGS.users.active : STRINGS.users.inactive}
                        </Badge>
                        {isSelf && <Text size="xs" tone="subtle"> (you)</Text>}
                      </td>
                      <td className="actions">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>{STRINGS.users.edit}</Button>
                        <Button
                          variant={u.active ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggle(u)}
                          disabled={isSelf && u.active}
                        >
                          {u.active ? STRINGS.users.deactivate : STRINGS.users.activate}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <Modal
          title={form.id === null ? STRINGS.users.createHeading : STRINGS.users.editHeading}
          onClose={() => setForm(null)}
          closeLabel={STRINGS.ariaLabels.closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>{STRINGS.common.cancel}</Button>
              <Button variant="primary" onClick={handleSubmit} leadingIcon="check">
                {STRINGS.users.save}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={cls.formGrid}>
            <Field label={STRINGS.users.fieldName} htmlFor="u-name" required>
              <Input id="u-name" required autoFocus value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={STRINGS.users.fieldUsername} htmlFor="u-user" required>
              <Input id="u-user" required autoComplete="off" value={form.username}
                     disabled={form.id !== null}
                     onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field
              label={STRINGS.users.fieldPassword}
              htmlFor="u-pass"
              required={form.id === null}
              hint={form.id !== null ? 'Leave blank to keep the current password.' : 'Minimum 8 characters.'}
            >
              <Input id="u-pass" type="password" autoComplete="new-password"
                     value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label={STRINGS.users.fieldRole} htmlFor="u-role" required>
              <Select id="u-role" value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="cashier">{STRINGS.users.roleCashier}</option>
                <option value="admin">{STRINGS.users.roleAdmin}</option>
              </Select>
            </Field>
            {/* Hidden submit so <Enter> in inputs submits the form. */}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}

      {confirmingDeactivate && (
        <ConfirmDialog
          title="Deactivate user?"
          message={`${confirmingDeactivate.name} will no longer be able to sign in. You can reactivate them later.`}
          confirmLabel={STRINGS.users.deactivate}
          danger
          onConfirm={doDeactivate}
          onCancel={() => setConfirmingDeactivate(null)}
        />
      )}
    </>
  );
};
