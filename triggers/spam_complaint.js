'use strict';

const { buildDeliveryTrigger } = require('../lib/deliveryTrigger');

module.exports = buildDeliveryTrigger({
  key: 'spam_complaint',
  event: 'delivery.complaint',
  noun: 'Complaint',
  label: 'Spam Complaint',
  description:
    'Triggers when a recipient marks an email you sent as spam and their provider reports it. Lockally adds them to your suppression list automatically.',
  // Only the keys every complaint carries. A complaint from a provider's
  // feedback loop also has feedback_type, reported_domain and source_ip, but a
  // simulated one (POST /v1/sandbox/messages/{id}/simulate) does not, and
  // Zapier compares this sample with real tasks.
  sampleData: {
    message_id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
    rfc_message_id: '<c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44@example.com>',
    recipient: 'someone@example.org',
  },
  extraOutputFields: [
    { key: 'feedback_type', label: 'Complaint type' },
    { key: 'reported_domain', label: 'Reported domain' },
    { key: 'source_ip', label: 'Source IP' },
  ],
});
