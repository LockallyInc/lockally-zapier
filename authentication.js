'use strict';

const { API_BASE } = require('./lib/http');

// What each part of this integration needs the key to be allowed to do. Shown
// when a key is too narrow, so somebody finds out while connecting rather than
// halfway through building a Zap.
const SCOPE_USES = [
  ['send:write', 'send email'],
  ['webhooks:write', 'start Zaps from Lockally events'],
  ['webhooks:read', 'show sample events while you build'],
  ['inboxes:read', 'read mailboxes and threads'],
  ['suppressions:write', 'add and remove suppressions'],
];

const test = async (z, bundle) => {
  const response = await z.request({ url: `${API_BASE}/v1/auth/whoami` });
  const who = z.JSON.parse(response.content);

  if (who.auth !== 'api_key') {
    throw new z.errors.Error(
      'That is not a Lockally API key. Create one in the Lockally console under API keys; it begins with lk_live_.',
      'AuthenticationError',
      401
    );
  }

  const scopes = who.scopes || [];
  const missing = SCOPE_USES.filter(([scope]) => !scopes.includes(scope));
  // A key with none of them can do nothing here, so say so now. A key with
  // some of them is fine: plenty of people only want to send, and the message
  // when they reach for something else names the exact scope.
  if (missing.length === SCOPE_USES.length) {
    throw new z.errors.Error(
      `This key has none of the permissions Lockally for Zapier uses (${SCOPE_USES.map(([s]) => s).join(', ')}). Edit it in the Lockally console under API keys and add the ones you need.`,
      'AuthenticationError',
      403
    );
  }

  return {
    tenant_slug: who.tenant.slug,
    tenant_name: who.tenant.name || who.tenant.slug,
    plan: who.tenant.plan,
    key_label: (who.key && who.key.label) || 'API key',
    scopes,
    // Listed so the connection itself says what this key cannot do, rather
    // than the person meeting it one Zap at a time.
    missing_for: missing.map(([scope, use]) => `${use} (${scope})`).join(', '),
  };
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      helpText:
        'From the Lockally console: **API keys**, then **Create key**. It starts with `lk_live_`. Give it the permissions you need: `send:write` to send, `webhooks:read` and `webhooks:write` to start Zaps from Lockally events, `inboxes:read` to read mailboxes, `suppressions:write` for the suppression list. To start Zaps from mail arriving in a mailbox, grant the key that mailbox on the key’s own page. Full details: https://developers.lockally.com/getting-started/authentication/',
    },
  ],
  test,
  connectionLabel: '{{tenant_name}} ({{key_label}})',
};
