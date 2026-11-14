'use strict';

const { buildDeliveryTrigger } = require('../lib/deliveryTrigger');

module.exports = buildDeliveryTrigger({
  key: 'email_bounced',
  event: 'delivery.bounced',
  noun: 'Bounce',
  label: 'Email Bounced',
  description: 'Triggers when an email you sent through Lockally bounces, with the reason the receiving server gave.',
  // The keys every bounce carries. A bounce the receiving server refuses while
  // we are still connected comes from the submission worker and has exactly
  // these; one reported later by a bounce message (DSN) adds recipient,
  // smtp_code, smtp_response and remote_host. Zapier compares this sample with
  // real tasks, so it must not show keys a bounce can lack.
  sampleData: {
    message_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    lockally_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    rfc_message_id: '<c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44@example.com>',
    sender: 'billing@example.com',
    subject: 'Your invoice',
    recipients: ['wrong-address@example.org'],
    status: 'bounced',
    bounce_reason: '550 5.1.1 The email account that you tried to reach does not exist.',
  },
  extraOutputFields: [
    { key: 'recipients', label: 'Recipients', list: true },
    { key: 'status', label: 'Status' },
    { key: 'bounce_reason', label: 'Bounce reason' },
    { key: 'smtp_code', label: 'SMTP status code', type: 'string' },
    { key: 'smtp_response', label: 'What the receiving server said' },
    { key: 'remote_host', label: 'Receiving server' },
  ],
});
