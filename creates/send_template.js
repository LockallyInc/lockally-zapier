'use strict';

const { API_BASE } = require('../lib/http');
const { asList, attachmentsFrom, compact, idempotencyKey, truthy } = require('../lib/send');

const perform = async (z, bundle) => {
  const input = bundle.inputData;

  const to = asList(input.to);
  if (to.length === 0) {
    throw new z.errors.Error('This step has no recipient. Fill in To.', 'BadRequest', 400);
  }
  if (!input.template_id) {
    throw new z.errors.Error('This step has no template. Choose one from the Template list.', 'BadRequest', 400);
  }

  // Zapier's dict field arrives as a plain object of strings, which is exactly
  // what the template substitution wants.
  const variables = input.variables && typeof input.variables === 'object' ? input.variables : {};

  const body = compact({
    from: String(input.from || '').trim(),
    to,
    cc: asList(input.cc),
    bcc: asList(input.bcc),
    template_id: input.template_id,
    variables,
    send_at: input.send_at,
    unsubscribe: truthy(input.unsubscribe),
    attachments: await attachmentsFrom(z, input.attachments),
  });

  const response = await z.request({
    url: `${API_BASE}/v1/send`,
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body,
  });
  return z.JSON.parse(response.content);
};

module.exports = {
  key: 'send_template',
  noun: 'Email',
  display: {
    label: 'Send Email From Template',
    description:
      'Sends one of your saved Lockally templates, filling in its placeholders. The subject and wording live in Lockally, so they can be changed without touching the Zap.',
  },
  operation: {
    inputFields: [
      {
        key: 'from',
        label: 'From',
        type: 'string',
        required: true,
        helpText: 'An address on a domain you have verified in Lockally.',
      },
      { key: 'to', label: 'To', type: 'string', list: true, required: true },
      { key: 'cc', label: 'CC', type: 'string', list: true, required: false },
      { key: 'bcc', label: 'BCC', type: 'string', list: true, required: false },
      {
        key: 'template_id',
        label: 'Template',
        type: 'string',
        required: true,
        dynamic: 'templateList.id.name',
        helpText: 'Templates are managed in the Lockally console. Needs the `templates:read` permission to list them here.',
      },
      {
        key: 'variables',
        label: 'Template values',
        dict: true,
        required: false,
        helpText:
          'One row per placeholder in the template. A template that says `{{first_name}}` takes a row with the name `first_name`.',
      },
      {
        key: 'attachments',
        label: 'Attachments',
        type: 'file',
        list: true,
        required: false,
        helpText: 'Up to 10 MB each.',
      },
      {
        key: 'send_at',
        label: 'Send at',
        type: 'datetime',
        required: false,
        helpText: 'Leave empty to send now. Up to 30 days ahead.',
      },
      {
        key: 'unsubscribe',
        label: 'Marketing or opt-in email',
        type: 'boolean',
        required: false,
        default: 'false',
        helpText:
          'Turn on for mail people signed up for. Lockally then adds a one-click unsubscribe header and skips anyone who unsubscribed.',
      },
    ],
    perform,
    sample: {
      id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
      message_id: '<7f2c@lockally.com>',
      status: 'queued',
    },
    outputFields: [
      { key: 'id', label: 'Lockally message id' },
      { key: 'message_id', label: 'Internet message ID' },
      { key: 'status', label: 'Status' },
      { key: 'warning', label: 'Warning' },
    ],
  },
};
