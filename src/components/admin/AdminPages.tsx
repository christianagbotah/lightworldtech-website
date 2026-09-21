'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AdminMediaField from '@/components/admin/AdminMediaField';
import { cmsGroups, type CmsField } from '@/lib/site-content';

type Values = Record<string, string>;

function defaultRaw(field: CmsField): string {
  if (field.type === 'stringList' || field.type === 'objectList') {
    return JSON.stringify(field.defaultValue);
  }
  return field.defaultValue;
}

function safeArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export default function AdminPages() {
  const [values, setValues] = useState<Values>({});
  const [activeGroup, setActiveGroup] = useState(cmsGroups[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(() => {
    const map: Values = {};
    cmsGroups.forEach((group) => group.fields.forEach((field) => {
      map[field.key] = defaultRaw(field);
    }));
    return map;
  }, []);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load page content');
        return response.json() as Promise<Values>;
      })
      .then((data) => setValues({ ...defaults, ...data }))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load page content'))
      .finally(() => setLoading(false));
  }, [defaults]);

  const group = cmsGroups.find((item) => item.id === activeGroup) || cmsGroups[0];

  const setValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const saveGroup = async () => {
    setSaving(true);
    try {
      const payload = group.fields.reduce<Values>((acc, field) => {
        acc[field.key] = values[field.key] ?? defaultRaw(field);
        return acc;
      }, {});

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Could not save page content');
      toast.success(group.title + ' saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save page content');
    } finally {
      setSaving(false);
    }
  };

  const stringItems = (field: Extract<CmsField, { type: 'stringList' }>) =>
    safeArray<string>(values[field.key], field.defaultValue);

  const objectItems = (field: Extract<CmsField, { type: 'objectList' }>) =>
    safeArray<Record<string, string>>(values[field.key], field.defaultValue);

  const updateStringList = (
    field: Extract<CmsField, { type: 'stringList' }>,
    next: string[],
  ) => setValue(field.key, JSON.stringify(next));

  const updateObjectList = (
    field: Extract<CmsField, { type: 'objectList' }>,
    next: Record<string, string>[],
  ) => setValue(field.key, JSON.stringify(next));

  const move = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Full-site CMS</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Page Content</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Edit the flagship website without touching code. Dedicated modules still manage services,
          portfolio projects, team members, blog posts, testimonials and FAQs.
        </p>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {cmsGroups.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveGroup(item.id)}
            className={
              activeGroup === item.id
                ? 'shrink-0 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white'
                : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground'
            }
          >
            {item.title}
          </button>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{group.title}</CardTitle>
          <CardDescription>{group.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {group.fields.map((field) => {
            if (field.type === 'stringList') {
              const items = stringItems(field);
              return (
                <div key={field.key} className="space-y-3 rounded-2xl border border-border/60 p-4">
                  <div>
                    <Label>{field.label}</Label>
                    {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
                  </div>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex min-w-0 flex-col gap-2 sm:flex-row">
                        <Input
                          value={item}
                          onChange={(event) => {
                            const next = [...items];
                            next[index] = event.target.value;
                            updateStringList(field, next);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateStringList(field, move(items, index, -1))}
                          disabled={index === 0}
                          aria-label="Move item up"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateStringList(field, move(items, index, 1))}
                          disabled={index === items.length - 1}
                          aria-label="Move item down"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateStringList(field, items.filter((_, i) => i !== index))}
                          aria-label="Remove item"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateStringList(field, [...items, ''])}
                  >
                    <Plus className="mr-2 size-4" /> Add item
                  </Button>
                </div>
              );
            }

            if (field.type === 'objectList') {
              const items = objectItems(field);
              return (
                <div key={field.key} className="space-y-3 rounded-2xl border border-border/60 p-4">
                  <div>
                    <Label>{field.label}</Label>
                    {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-muted-foreground">Item {index + 1}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateObjectList(field, move(items, index, -1))}
                              disabled={index === 0}
                              aria-label="Move item up"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateObjectList(field, move(items, index, 1))}
                              disabled={index === items.length - 1}
                              aria-label="Move item down"
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateObjectList(field, items.filter((_, i) => i !== index))}
                              aria-label="Remove item"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {field.fields.map((subField) => {
                            const isTextarea = subField.type === 'textarea';
                            return (
                              <div key={subField.key} className={isTextarea ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
                                <Label>{subField.label}</Label>
                                {isTextarea ? (
                                  <Textarea
                                    rows={3}
                                    value={item[subField.key] || ''}
                                    onChange={(event) => {
                                      const next = [...items];
                                      next[index] = { ...item, [subField.key]: event.target.value };
                                      updateObjectList(field, next);
                                    }}
                                  />
                                ) : (
                                  <Input
                                    type={subField.type === 'url' ? 'text' : 'text'}
                                    value={item[subField.key] || ''}
                                    onChange={(event) => {
                                      const next = [...items];
                                      next[index] = { ...item, [subField.key]: event.target.value };
                                      updateObjectList(field, next);
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const blank = field.fields.reduce<Record<string, string>>((acc, current) => {
                        acc[current.key] = '';
                        return acc;
                      }, {});
                      updateObjectList(field, [...items, blank]);
                    }}
                  >
                    <Plus className="mr-2 size-4" /> Add item
                  </Button>
                </div>
              );
            }

            if (field.type === 'image') {
              return (
                <AdminMediaField
                  key={field.key}
                  label={field.label}
                  value={values[field.key] ?? field.defaultValue}
                  onChange={(value) => setValue(field.key, value)}
                  help={field.help}
                />
              );
            }

            const textarea = field.type === 'textarea';
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
                {textarea ? (
                  <Textarea
                    id={field.key}
                    rows={4}
                    value={values[field.key] ?? field.defaultValue}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === 'email' ? 'email' : 'text'}
                    value={values[field.key] ?? field.defaultValue}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                )}
              </div>
            );
          })}

          <div className="sticky bottom-3 flex justify-end rounded-2xl border border-border/60 bg-background/90 p-3 backdrop-blur">
            <Button onClick={saveGroup} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save {group.title}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
