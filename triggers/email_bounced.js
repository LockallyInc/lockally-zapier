'use strict';

const { buildDeliveryTrigger } = require('../lib/deliveryTrigger');

module.exports = buildDeliveryTrigger({
  key: 'email_bounced',
  event: 'delivery.bounced',
  noun: 'Bounce',
  label: 'Email Bounced',
  description: 'Triggers when an email you sent through Lockally bounces, with the reason the receiving server gave.',
  sampleData: {
    message_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    rfc_message_id: '7f2c@lockally.com',
    recipient: 'wrong-address@example.com',
    smtp_code: '5.1.1',
    smtp_response: '550 5.1.1 The email account that you tried to reach does not exist.',
    remote_host: 'mx.example.com',
  },
  extraOutputFields: [
    { key: 'bounce_reason', label: 'Bounce reason' },
    { key: 'smtp_code', label: 'SMTP status code' },
    { key: 'smtp_response', label: 'What the receiving server said' },
    { key: 'remote_host', label: 'Receiving server' },
  ],
});
