'use strict';

const { flatten, fromWebhook, listEvents } = require('./events');
const { subscribe, unsubscribe } = require('./subscriptions');

// The three outbound-delivery triggers are the same trigger with a different
// event name, so they are built from one description rather than copied three
// times and then drifting apart.
//
// A note on the fields. Delivery events reach Lockally by two roads: the
// submission worker, which knows the message it sent, and the bounce and
// complaint collectors, which read a report from the receiving server. The two
// do not carry identical keys, so a Zap should map the ones it actually sees
// in its own test rather than assume every field below is always present.

const buildDeliveryTrigger = ({ key, event, label, description, noun, sampleData, extraOutputFields = [] }) => ({
  key,
  noun,
  display: { label, description },
  operation: {
    type: 'hook',
    performSubscribe: subscribe([event]),
    performUnsubscribe: unsubscribe,
    perform: async (z, bundle) => fromWebhook(z, bundle),
    performList: async (z, bundle) => listEvents(z, bundle, event),
    sample: flatten({
      id: 'evt_2a5f9c31-77b0-4e2a-8f61-0c9d2e4b7a15',
      type: event,
      created: 1789234567,
      tenant_id: '8c1d2f3a-55aa-4b6c-9d0e-1f2a3b4c5d6e',
      data: sampleData,
    }),
    outputFields: [
      { key: 'id', label: 'Event ID' },
      { key: 'occurred_at', label: 'Happened at', type: 'datetime' },
      { key: 'message_id', label: 'Message ID' },
      { key: 'rfc_message_id', label: 'Internet message ID' },
      { key: 'sender', label: 'From' },
      { key: 'subject', label: 'Subject' },
      { key: 'recipient', label: 'Recipient' },
      ...extraOutputFields,
    ],
  },
});

module.exports = { buildDeliveryTrigger };
