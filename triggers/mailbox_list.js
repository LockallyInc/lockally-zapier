'use strict';

const { API_BASE } = require('../lib/http');

// Fills the Mailbox dropdown. Hidden from the trigger list: nobody starts a
// Zap with it.
//
// It lists the mailboxes this key may actually see, which for a key with
// mailbox grants is exactly those it is granted. That is deliberate: the
// dropdown should not offer a mailbox that the trigger would then be refused.
const perform = async (z, bundle) => {
  const response = await z.request({ url: `${API_BASE}/v1/inboxes` });
  const body = z.JSON.parse(response.content);
  return (body.inboxes || []).map((inbox) => ({
    // The address is the value a trigger passes to Lockally, so it is the id.
    id: inbox.email,
    email: inbox.email,
    mailbox_id: inbox.id,
    thread_count: inbox.thread_count,
    last_message_at: inbox.last_message_at,
  }));
};

module.exports = {
  key: 'mailboxList',
  noun: 'Mailbox',
  display: {
    label: 'Mailbox list',
    description: 'Lists the mailboxes this API key can see.',
    hidden: true,
  },
  operation: {
    perform,
    sample: {
      id: 'sales@yourdomain.com',
      email: 'sales@yourdomain.com',
      mailbox_id: '2f1c9e00-3d5a-4a2f-9f4a-9f0d3b1c77aa',
      thread_count: 12,
      last_message_at: '2026-09-22T10:04:11Z',
    },
  },
};
