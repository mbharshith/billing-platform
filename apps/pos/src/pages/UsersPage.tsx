// UsersPage — staff management for the admin of a single tenant. Scoped to currentStoreId.
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Select, Text } from '@billing/ui/atoms';
import { Modal } from '@billing/ui/organisms';
import { ConfirmDialog } from '@billing/ui/feedback';
import { DataTable } from '@billing/ui/molecules';
import { PageHeader } from '../RegisterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { fmtDate } from '@billing/shared/domain/format';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useToast } from '@billing/shared/store/ToastContext';
import { useUsers } from '@billing/shared/store/UsersContext';
import type { User, UserRole } from '@billing/shared/domain/types';

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
  const { slug = '' } = useParams<{ slug: string }>();
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
        breadcrumbs={[
          { label: STRINGS.nav.dashboard, href: `/${slug}/admin` },
          { label: STRINGS.users.pageTitle },
        ]}
        actions={
          <Button variant="primary" leadingIcon="plus" onClick={openCreate}>
            {STRINGS.users.addNew}
          </Button>
        }
      />

      <DataTable
        data={sorted}
        getKey={(u) => u.id}
        getRowMuted={(u) => !u.active}
        hidePagination
        emptyIcon="user"
        emptyTitle={STRINGS.users.empty}
        columns={[
          {
            key: 'name',
            label: STRINGS.users.columnName,
            sortValue: (u) => u.name,
            render: (u) => (
              <div className={cls.stackedCell}>
                <Text weight="semibold" size="sm">{u.name}</Text>
                <Text size="xs" tone="subtle">{STRINGS.users.joinedOn(fmtDate(u.createdAt))}</Text>
              </div>
            ),
          },
          {
            key: 'username',
            label: STRINGS.users.columnUsername,
            render: (u) => <Text size="sm">{u.username}</Text>,
          },
          {
            key: 'role',
            label: STRINGS.users.columnRole,
            render: (u) => (
              <Badge variant={roleBadgeVariant(u.role)}>{roleLabel(u.role)}</Badge>
            ),
          },
          {
            key: 'status',
            label: STRINGS.users.columnStatus,
            render: (u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <>
                  <Badge variant={u.active ? 'success' : 'danger'}>
                    {u.active ? STRINGS.users.active : STRINGS.users.inactive}
                  </Badge>
                  {isSelf && <Text size="xs" tone="subtle"> (you)</Text>}
                </>
              );
            },
          },
          {
            key: 'actions',
            label: STRINGS.users.columnActions,
            actions: true,
            render: (u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <>
                  <Button variant="secondary" size="sm" leadingIcon="edit" onClick={() => openEdit(u)}>
                    {STRINGS.users.edit}
                  </Button>
                  <Button
                    variant={u.active ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => void handleToggle(u)}
                    disabled={isSelf && u.active}
                  >
                    {u.active ? STRINGS.users.deactivate : STRINGS.users.activate}
                  </Button>
                </>
              );
            },
          },
        ]}
      />

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
