'use strict';

const { buildDeliveryTrigger } = require('../lib/deliveryTrigger');

module.exports = buildDeliveryTrigger({
  key: 'email_delivered',
  event: 'delivery.delivered',
  noun: 'Delivery',
  label: 'Email Delivered',
  description: "Triggers when an email you sent through Lockally is accepted by the recipient's mail server.",
  // remote_host is left out of the sample: a delivery simulated for an
  // lk_test_ message has no receiving server, and Zapier compares this sample
  // with real tasks. It stays an output field for real deliveries.
  sampleData: {
    message_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    rfc_message_id: '<c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44@lockally.com>',
    recipient: 'customer@example.com',
    smtp_code: '250',
    smtp_response: 'OK',
  },
  extraOutputFields: [
    { key: 'smtp_code', label: 'SMTP status code', type: 'string' },
    { key: 'smtp_response', label: 'What the receiving server said' },
    { key: 'remote_host', label: 'Receiving server' },
  ],
});
