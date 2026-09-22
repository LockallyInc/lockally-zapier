'use strict';

const { buildDeliveryTrigger } = require('../lib/deliveryTrigger');

module.exports = buildDeliveryTrigger({
  key: 'spam_complaint',
  event: 'delivery.complaint',
  noun: 'Complaint',
  label: 'Spam Complaint',
  description:
    'Triggers when a recipient marks an email you sent as spam and their provider reports it. Lockally adds them to your suppression list automatically.',
  sampleData: {
    message_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    rfc_message_id: '7f2c@lockally.com',
    recipient: 'someone@example.com',
    feedback_type: 'abuse',
    reported_domain: 'example.com',
    source_ip: '203.0.113.10',
  },
  extraOutputFields: [
    { key: 'feedback_type', label: 'Complaint type' },
    { key: 'reported_domain', label: 'Reported domain' },
    { key: 'source_ip', label: 'Source IP' },
  ],
});
