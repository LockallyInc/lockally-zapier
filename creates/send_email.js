'use strict';

const { API_BASE } = require('../lib/http');
const { asList, attachmentsFrom, compact, idempotencyKey, truthy } = require('../lib/send');

const perform = async (z, bundle) => {
  const input = bundle.inputData;

  // Checked before anything is built, so a step that cannot work says why
  // rather than reaching the API and coming back with its wording.
  const to = asList(input.to);
  if (to.length === 0) {
    throw new z.errors.Error('This step has no recipient. Fill in To.', 'BadRequest', 400);
  }
  if (!input.text && !input.html) {
    throw new z.errors.Error(
      'This step has no message. Fill in the plain text body, the HTML body, or both.',
      'BadRequest',
      400
    );
  }

  const body = compact({
    from: String(input.from || '').trim(),
    to,
    cc: asList(input.cc),
    bcc: asList(input.bcc),
    subject: input.subject,
    text: input.text,
    html: input.html,
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
  key: 'send_email',
  noun: 'Email',
  display: {
    label: 'Send Email',
    description: 'Sends an email from one of your own Lockally addresses.',
  },
  operation: {
    inputFields: [
      {
        key: 'from',
        label: 'From',
        type: 'string',
        required: true,
        helpText:
          'An address on a domain you have verified in Lockally, such as `hello@yourdomain.com`. Sending from an address Lockally does not own is refused.',
      },
      { key: 'to', label: 'To', type: 'string', list: true, required: true },
      { key: 'cc', label: 'CC', type: 'string', list: true, required: false },
      { key: 'bcc', label: 'BCC', type: 'string', list: true, required: false },
      { key: 'subject', label: 'Subject', type: 'string', required: false },
      {
        key: 'text',
        label: 'Body (plain text)',
        type: 'text',
        required: false,
        helpText: 'Fill in this, the HTML body, or both. Sending both lets each mail app show the one it prefers.',
      },
      { key: 'html', label: 'Body (HTML)', type: 'text', required: false },
      {
        key: 'attachments',
        label: 'Attachments',
        type: 'file',
        list: true,
        required: false,
        helpText: 'Up to 10 MB each. Map a file from an earlier step, or give a direct link.',
      },
      {
        key: 'send_at',
        label: 'Send at',
        type: 'datetime',
        required: false,
        helpText: 'Leave empty to send now. A time in the future, up to 30 days ahead, schedules it.',
      },
      {
        key: 'unsubscribe',
        label: 'Marketing or opt-in email',
        type: 'boolean',
        required: false,
        default: 'false',
        helpText:
          'Turn on for mail people signed up for, such as a newsletter. Lockally then adds a one-click unsubscribe header and skips anyone who unsubscribed. Leave off for transactional mail, such as a receipt.',
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
