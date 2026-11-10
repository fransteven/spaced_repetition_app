'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { Surface } from '@/components/primitives/surface';
import { SectionHeading } from '@/components/primitives/section-heading';
import { FilterChip } from '@/components/primitives/filter-chip';
import { CreateApiTokenSchema, type CreateApiTokenValues } from '@/lib/validations';
import type { ApiTokenSummary } from '@/lib/services/api-token-service';
import { createApiTokenAction, revokeApiTokenAction } from '@/app/actions/mind-map-actions';

interface AiAssistantsManagerProps {
  initialTokens: ApiTokenSummary[];
  /** Base MCP endpoint, e.g. https://app.example.com/api/mcp */
  mcpUrl: string;
}

type Client = 'claude' | 'claude-code' | 'chatgpt';

const CLIENT_LABELS: Record<Client, string> = {
  claude: 'Claude app',
  'claude-code': 'Claude Code',
  chatgpt: 'ChatGPT',
};

export function AiAssistantsManager({ initialTokens, mcpUrl }: AiAssistantsManagerProps): React.JSX.Element {
  const [tokens, setTokens] = useState(initialTokens);
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null);
  const [client, setClient] = useState<Client>('claude');
  const [revoking, setRevoking] = useState<ApiTokenSummary | null>(null);
  const isLocal = /\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(mcpUrl);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateApiTokenValues>({ resolver: zodResolver(CreateApiTokenSchema), defaultValues: { name: '' } });

  const onSubmit = async (values: CreateApiTokenValues): Promise<void> => {
    const result = await createApiTokenAction(values);
    if (result.error || !result.data) {
      toast.error(result.error?.message ?? 'Could not create the connection');
      return;
    }
    const { token, record } = result.data;
    setTokens((current) => [record, ...current]);
    setCreated({ token, name: record.name });
    reset();
  };

  const revoke = async (token: ApiTokenSummary): Promise<void> => {
    const result = await revokeApiTokenAction(token.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setTokens((current) => current.filter((item) => item.id !== token.id));
    setRevoking(null);
    toast.success(`"${token.name}" can no longer reach your account`);
  };

  const connectorUrl = created ? `${mcpUrl}/${created.token}` : `${mcpUrl}/<your-token>`;
  const token = created?.token ?? '<your-token>';

  return (
    <section id="ai-assistants" className="scroll-mt-28">
      <SectionHeading
        title="AI assistants"
        description="Let Claude or ChatGPT save mind maps straight into NeuroCards through MCP. Each connection gets its own token; revoke it at any time."
      />

      <div className="space-y-4 sm:space-y-6">
        <Surface tone="card" className="p-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="api-token-name">New connection</Label>
              <Input id="api-token-name" placeholder="e.g. Claude on my laptop" aria-invalid={Boolean(errors.name)} {...register('name')} />
              {errors.name && <p className="text-body-sm text-destructive">{errors.name.message}</p>}
            </div>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              <KeyRound data-icon="inline-start" />
              {isSubmitting ? 'Creating…' : 'Create connection'}
            </Button>
          </form>

          {created && (
            <div className="mt-5 animate-pop-in space-y-3 rounded-xl bg-surface-container-low p-4 sm:p-5">
              <p className="flex items-start gap-2 text-body-sm font-semibold text-on-surface">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-tertiary" />
                Copy it now: “{created.name}” will not be shown again. Anyone with this URL can edit your mind maps.
              </p>
              <CopyField label="Connector URL (Claude app, ChatGPT)" value={connectorUrl} />
              <CopyField label="Token only (Authorization: Bearer …)" value={created.token} />
            </div>
          )}
        </Surface>

        <Surface tone="panel" className="p-5 sm:p-6">
          <h3 className="mb-4 text-headline-sm text-on-surface">How to connect</h3>
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="AI assistant">
            {(Object.keys(CLIENT_LABELS) as Client[]).map((key) => (
              <FilterChip key={key} role="tab" aria-selected={client === key} active={client === key} onClick={() => setClient(key)}>
                {CLIENT_LABELS[key]}
              </FilterChip>
            ))}
          </div>

          {client === 'claude' && (
            <Steps
              items={[
                'Open claude.ai (or Claude Desktop) → Settings → Connectors → Add custom connector.',
                <>Name it “NeuroCards” and paste the connector URL. Leave the OAuth fields empty.</>,
                'In a chat, enable NeuroCards in the tools menu and ask: “Make a mind map of … and save it to NeuroCards”.',
              ]}
            />
          )}
          {client === 'claude-code' && (
            <div className="space-y-3">
              <p className="text-body-md text-on-surface-variant">Run once in a terminal:</p>
              <CopyField
                label="Command"
                value={`claude mcp add --transport http neurocards ${mcpUrl} --header "Authorization: Bearer ${token}"`}
              />
            </div>
          )}
          {client === 'chatgpt' && (
            <Steps
              items={[
                'In ChatGPT open Settings → Apps & Connectors → Advanced settings and turn on Developer mode.',
                'Back in Apps & Connectors choose Create, name it “NeuroCards”, paste the connector URL and pick “No authentication”.',
                'In a chat, add NeuroCards from the + menu (Developer mode) and ask for a mind map. Approve the save when asked.',
              ]}
            />
          )}

          {!created && (
            <p className="mt-4 text-body-sm text-on-surface-variant">
              Create a connection above to fill in your URL. Endpoint: <code className="break-all">{mcpUrl}</code>
            </p>
          )}
          {isLocal && (
            <p className="mt-3 text-body-sm text-on-surface-variant">
              This is a local address. Claude Code can use it, but claude.ai and ChatGPT need your deployed HTTPS URL.
            </p>
          )}
        </Surface>

        {tokens.length > 0 && (
          <Surface tone="card" className="p-5 sm:p-6">
            <h3 className="mb-4 text-headline-sm text-on-surface">Active connections</h3>
            <ul className="space-y-3">
              {tokens.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-body-md font-semibold text-on-surface">{item.name}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      <code>{item.token_prefix}…</code> · created {formatDistanceToNow(item.created_at, { addSuffix: true })} ·{' '}
                      {item.last_used_at ? `used ${formatDistanceToNow(item.last_used_at, { addSuffix: true })}` : 'never used'}
                    </p>
                  </div>
                  <Button type="button" variant="destructive" size="lg" onClick={() => setRevoking(item)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </div>

      <Dialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Revoke connection</DialogTitle>
            <DialogDescription>
              <strong>{revoking?.name}</strong> will stop working immediately. Mind maps it created stay in your account.
            </DialogDescription>
            <div className="flex items-center justify-end gap-3">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="button" variant="destructive" onClick={() => revoking && void revoke(revoking)}>
                Revoke
              </Button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }): React.JSX.Element {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-body-md text-on-surface">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-md tabular text-primary">
            {index + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function CopyField({ label, value }: { label: string; value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to the clipboard');
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2 rounded-lg bg-card p-1 pl-3">
        <code className="min-w-0 flex-1 truncate text-body-sm text-on-surface" title={value}>
          {value}
        </code>
        <Button type="button" variant="ghost" size="icon-lg" aria-label={`Copy ${label}`} onClick={() => void copy()}>
          {copied ? <Check className="text-primary" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}
