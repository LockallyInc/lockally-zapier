'use strict';

const { API_BASE, raise } = require('../lib/http');

const perform = async (z, bundle) => {
  const id = String(bundle.inputData.id || '').trim();
  if (!id) return [];

  const response = await z.request({
    url: `${API_BASE}/v1/messages/${encodeURIComponent(id)}`,
    skipThrowForStatus: true,
  });
  // A search finds nothing by returning nothing. Failing here would stop a Zap
  // that is asking a reasonable question about a message that is not there.
  if (response.status === 404 || response.status === 400) return [];
  if (response.status >= 400) raise(response, z);
  return [z.JSON.parse(response.content)];
};

module.exports = {
  key: 'find_message',
  noun: 'Message',
  display: {
    label: 'Find a Sent Message',
    description:
      'Looks up an email you sent through Lockally and reports where it got to: queued, delivered, bounced, or a spam complaint.',
  },
  operation: {
    inputFields: [
      {
        key: 'id',
        label: 'Lockally message id',
        type: 'string',
        required: true,
        helpText: 'The id a "Send Email" step returned. Needs the `send:read` permission.',
      },
    ],
    perform,
    sample: {
      id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
      message_id: '<7f2c@lockally.com>',
      sender: 'hello@yourdomain.com',
      recipients: ['customer@example.com'],
      subject: 'Your order is on its way',
      status: 'delivered',
      queued_at: '2026-09-22T10:00:00Z',
      updated_at: '2026-09-22T10:00:07Z',
    },
    outputFields: [
      { key: 'id', label: 'Lockally message id' },
      { key: 'message_id', label: 'Internet message ID' },
      { key: 'sender', label: 'From' },
      { key: 'recipients', label: 'Recipients', list: true },
      { key: 'subject', label: 'Subject' },
      { key: 'status', label: 'Status' },
      { key: 'bounce_reason', label: 'Bounce reason' },
      { key: 'queued_at', label: 'Queued at', type: 'datetime' },
      { key: 'updated_at', label: 'Last updated', type: 'datetime' },
    ],
  },
};
