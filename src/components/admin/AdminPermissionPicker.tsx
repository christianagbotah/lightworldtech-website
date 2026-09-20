'use client';

import { ADMIN_PERMISSION_DEFINITIONS, type AdminPermission } from '@/lib/admin-permissions';

export default function AdminPermissionPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (permissions: AdminPermission[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);

  const toggle = (permission: AdminPermission, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(permission);
    else next.delete(permission);

    onChange(
      ADMIN_PERMISSION_DEFINITIONS
        .map((item) => item.key)
        .filter((item) => next.has(item)),
    );
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ADMIN_PERMISSION_DEFINITIONS.map((permission) => {
        const checked = selected.has(permission.key);
        return (
          <label
            key={permission.key}
            className={[
              'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
              checked ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-border',
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/50',
            ].join(' ')}
          >
            <input
              type="checkbox"
              className="mt-1 size-4 accent-amber-600"
              checked={checked}
              disabled={disabled}
              onChange={(event) => toggle(permission.key, event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">{permission.label}</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {permission.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
