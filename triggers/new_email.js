'use strict';

const { API_BASE } = require('../lib/http');
const { flatten, fromWebhook, listEvents } = require('../lib/events');
const { truthy } = require('../lib/send');
const { subscribe, unsubscribe } = require('../lib/subscriptions');

const EVENT = 'message.received';

const chosenMailbox = (bundle) => (bundle.inputData || {}).mailbox || null;

/**
 * The body is not in the event, because an event is a summary. When somebody
 * asks for it we fetch the message itself, and if the body cannot be read we
 * say so in a field rather than failing the whole trigger: an email that
 * arrived is still worth acting on without its body.
 */
const withBody = async (z, item) => {
  if (!item.thread_id || !item.message_id) return item;
  const response = await z.request({
    url: `${API_BASE}/v1/threads/${item.thread_id}/messages/${item.message_id}`,
    skipThrowForStatus: true,
  });
  if (response.status >= 400) {
    return { ...item, body_unavailable: `Lockally could not return the body (HTTP ${response.status}).` };
  }
  const full = z.JSON.parse(response.content);
  const body = full.body || {};
  return {
    ...item,
    body_text: body.text || '',
    body_html: body.html || '',
    body_truncated: Boolean(body.truncated),
    body_unavailable: full.body_unavailable,
  };
};

const hydrate = async (z, bundle, items) => {
  if (!truthy((bundle.inputData || {}).include_body)) return items;
  return Promise.all(items.map((item) => withBody(z, item)));
};

const perform = async (z, bundle) => hydrate(z, bundle, fromWebhook(z, bundle));

const performList = async (z, bundle) => {
  const params = {};
  const mailbox = chosenMailbox(bundle);
  if (mailbox) params.mailbox = mailbox;
  return hydrate(z, bundle, await listEvents(z, bundle, EVENT, params));
};

module.exports = {
  key: 'new_email',
  noun: 'Email',
  display: {
    label: 'New Email Received',
    description: 'Triggers when an email arrives in a Lockally mailbox.',
  },
  operation: {
    type: 'hook',
    inputFields: [
      {
        key: 'mailbox',
        label: 'Mailbox',
        type: 'string',
        dynamic: 'mailboxList.id.email',
        required: false,
        helpText:
          'Leave empty for every mailbox this API key can see. If the key is limited to certain mailboxes, that is what "every" means here.',
      },
      {
        key: 'include_body',
        label: 'Include the full message body',
        type: 'boolean',
        required: false,
        default: 'false',
        helpText:
          'Fetches the message itself and adds its text and HTML. Off by default, because the trigger is faster without it and most Zaps only need the sender and subject. Needs the `inboxes:read` permission.',
      },
    ],
    performSubscribe: subscribe([EVENT], chosenMailbox),
    performUnsubscribe: unsubscribe,
    perform,
    performList,
    sample: flatten({
      id: 'evt_9b7c1e6a-2f44-4f8e-9a1d-4a8e1d7c0b32',
      type: EVENT,
      created: 1789234567,
      tenant_id: '8c1d2f3a-55aa-4b6c-9d0e-1f2a3b4c5d6e',
      data: {
        mailbox: 'sales@yourdomain.com',
        thread_id: '0651e295-acaa-4397-a30b-b3309bff0a6a',
        message_id: 'f7cc4b17-a74a-4f0d-9b7f-a5886dcb2d4f',
        rfc_message_id: 'abc123@sender.example.com',
        subject: 'Order #1042 refund request',
        from: 'customer@example.com',
        to: ['sales@yourdomain.com'],
        snippet: "Hi, I'd like to request a refund for...",
        has_attachments: false,
        received_at: '2026-09-22T10:04:11Z',
      },
    }),
    outputFields: [
      { key: 'id', label: 'Event ID' },
      { key: 'occurred_at', label: 'Received at', type: 'datetime' },
      { key: 'mailbox', label: 'Mailbox' },
      { key: 'from', label: 'From' },
      { key: 'subject', label: 'Subject' },
      { key: 'snippet', label: 'Snippet' },
      { key: 'has_attachments', label: 'Has attachments', type: 'boolean' },
      { key: 'thread_id', label: 'Thread ID' },
      { key: 'message_id', label: 'Message ID' },
      { key: 'rfc_message_id', label: 'Internet message ID' },
      { key: 'body_text', label: 'Body (text)' },
      { key: 'body_html', label: 'Body (HTML)' },
    ],
  },
};
