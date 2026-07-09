/**
 * UsersPage — staff management for the Admin of a single tenant.
 *
 * Every user shown here belongs to THIS tenant. Admin can:
 *   - invite new admins (co-owners) or cashiers to their store
 *   - edit name/role/password of anyone in their store
 *   - deactivate anyone except themselves
 *
 * Cross-tenant users are never visible or mutable — enforced by scoping the
 * list to `currentStoreId` and the UsersContext create() call always writing
 * `storeId = current tenant`.
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Select, Text } from '@shared/atoms';
import { Modal } from '@shared/organisms';
import { ConfirmDialog } from '@shared/feedback';
import { PageHeader } from '@apps/counter/CounterShell';
import { STRINGS } from '@shared/domain/strings';
import { fmtDate } from '@shared/domain/format';
import { useAuth } from '@shared/store/AuthContext';
import { useToast } from '@shared/store/ToastContext';
import { useUsers } from '@shared/store/UsersContext';
import type { User, UserRole } from '@shared/domain/types';

interface UserFormState {
  id: string | null;
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export const UsersPage: FC = () => {
  const { users, create, update, setActive } = useUsers();
  const { currentUser, currentStoreId } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<UserFormState | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<User | null>(null);

  const emptyForm = (): UserFormState => ({
    id: null, name: '', username: '', password: '', role: 'cashier',
  });

  // Tenant isolation — only see users in this tenant.
  const scopedUsers = useMemo(
    () => users.filter((u) => u.storeId === currentStoreId),
    [users, currentStoreId],
  );

  const sorted = useMemo(
    () => [...scopedUsers].sort((a, b) => a.name.localeCompare(b.name)),
    [scopedUsers],
  );

  const openCreate = () => setForm(emptyForm());
  const openEdit = (u: User) => setForm({
    id: u.id, name: u.name, username: u.username, password: '', role: u.role,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !currentStoreId) return;
    if (form.id === null) {
      const res = await create({
        name: form.name, username: form.username,
        password: form.password, role: form.role,
        storeId: currentStoreId,  // always this tenant, never other
      });
      if (!res.ok) {
        toast.error(
          res.error === 'duplicate' ? STRINGS.users.duplicateUser : STRINGS.users.weakPassword,
        );
        return;
      }
      toast.success(STRINGS.users.invited(res.user.name));
    } else {
      if (form.password && form.password.length < 8) {
        toast.error(STRINGS.users.weakPassword);
        return;
      }
      const patch: Partial<Pick<User, 'name' | 'role' | 'password'>> = form.password
        ? { name: form.name, role: form.role, password: form.password }
        : { name: form.name, role: form.role };
      await update(form.id, patch);
      toast.success(STRINGS.users.updated);
    }
    setForm(null);
  };

  const handleToggle = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast.error(STRINGS.users.cannotDeactivateSelf);
      return;
    }
    if (u.active) setConfirmingDeactivate(u);
    else {
      await setActive(u.id, true);
      toast.success(STRINGS.users.reactivated(u.name));
    }
  };

  const doDeactivate = async () => {
    if (!confirmingDeactivate) return;
    await setActive(confirmingDeactivate.id, false);
    toast.success(STRINGS.users.deactivated(confirmingDeactivate.name));
    setConfirmingDeactivate(null);
  };

  const roleBadgeVariant = (r: UserRole): 'primary' | 'neutral' =>
    r === 'admin' ? 'primary' : 'neutral';

  const roleLabel = (r: UserRole): string =>
    r === 'admin' ? STRINGS.users.roleAdmin : STRINGS.users.roleCashier;

  return (
    <>
      <PageHeader
        title={STRINGS.users.pageTitle}
        subtitle="Everyone here works at this tenant. Add admins (co-owners) or cashiers."
        actions={
          <Button variant="primary" leadingIcon="plus" onClick={openCreate}>
            {STRINGS.users.addNew}
          </Button>
        }
      />

      <div className={cls.card}>
        {sorted.length === 0 ? (
          <div className={cls.cardBody}>
            <Text tone="subtle" center>{STRINGS.users.empty}</Text>
          </div>
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
                        <div className={cls.stackedCell}>
                          <Text weight="semibold" size="sm">{u.name}</Text>
                          <Text size="xs" tone="subtle">
                            {STRINGS.users.joinedOn(fmtDate(u.createdAt))}
                          </Text>
                        </div>
                      </td>
                      <td><Text size="sm">{u.username}</Text></td>
                      <td><Badge variant={roleBadgeVariant(u.role)}>{roleLabel(u.role)}</Badge></td>
                      <td>
                        <Badge variant={u.active ? 'success' : 'danger'}>
                          {u.active ? STRINGS.users.active : STRINGS.users.inactive}
                        </Badge>
                        {isSelf && <Text size="xs" tone="subtle"> (you)</Text>}
                      </td>
                      <td className="actions">
                        <Button variant="secondary" size="sm" leadingIcon="edit" onClick={() => openEdit(u)}>
                          {STRINGS.users.edit}
                        </Button>
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
              hint={form.id !== null ? STRINGS.users.passwordHintEdit : STRINGS.users.passwordHintNew}
            >
              <Input id="u-pass" type="password" autoComplete="new-password"
                     value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label={STRINGS.users.fieldRole} htmlFor="u-role" required>
              <Select
                id="u-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="cashier">{STRINGS.users.roleCashier}</option>
                <option value="admin">{STRINGS.users.roleAdmin} (co-owner)</option>
              </Select>
            </Field>
            {/* Hidden submit so <Enter> in inputs submits the form. */}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}

      {confirmingDeactivate && (
        <ConfirmDialog
          title={STRINGS.users.deactivateTitle}
          message={STRINGS.users.deactivateMessage(confirmingDeactivate.name)}
          confirmLabel={STRINGS.users.deactivate}
          danger
          onConfirm={doDeactivate}
          onCancel={() => setConfirmingDeactivate(null)}
        />
      )}
    </>
  );
};
