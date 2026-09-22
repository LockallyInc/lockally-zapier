'use strict';

const { buildDeliveryTrigger } = require('../lib/deliveryTrigger');

module.exports = buildDeliveryTrigger({
  key: 'email_delivered',
  event: 'delivery.delivered',
  noun: 'Delivery',
  label: 'Email Delivered',
  description: "Triggers when an email you sent through Lockally is accepted by the recipient's mail server.",
  sampleData: {
    message_id: '<7f2c@lockally.com>',
    lockally_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    sender: 'hello@yourdomain.com',
    recipients: ['customer@example.com'],
    subject: 'Your order is on its way',
    status: 'delivered',
  },
  extraOutputFields: [
    { key: 'recipients', label: 'Recipients', list: true },
    { key: 'status', label: 'Status' },
    { key: 'lockally_id', label: 'Lockally message id' },
  ],
});
