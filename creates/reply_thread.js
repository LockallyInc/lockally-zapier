'use strict';

const { API_BASE } = require('../lib/http');
const { asList, compact, idempotencyKey } = require('../lib/send');

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const threadId = String(input.thread_id || '').trim();
  if (!threadId) {
    throw new z.errors.Error(
      'This step has no conversation to reply to. Map the Thread ID from a "New Email Received" trigger.',
      'BadRequest',
      400
    );
  }
  if (!input.text && !input.html) {
    throw new z.errors.Error('This step has no reply to send. Fill in the message.', 'BadRequest', 400);
  }

  // Recipients and subject are left out on purpose when they are empty:
  // Lockally then replies to the people already in the conversation, with the
  // right subject and the headers that keep it one thread.
  const body = compact({
    to: asList(input.to),
    cc: asList(input.cc),
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  const response = await z.request({
    url: `${API_BASE}/v1/threads/${threadId}/reply`,
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body,
  });
  return z.JSON.parse(response.content);
};

module.exports = {
  key: 'reply_thread',
  noun: 'Reply',
  display: {
    label: 'Reply to an Email Thread',
    description:
      'Replies inside an existing conversation, so it stays one thread in the recipient’s mail app rather than arriving as a new message.',
  },
  operation: {
    inputFields: [
      {
        key: 'thread_id',
        label: 'Thread ID',
        type: 'string',
        required: true,
        helpText: 'From a "New Email Received" trigger. Needs the `inboxes:write` permission and a grant for that mailbox.',
      },
      {
        key: 'text',
        label: 'Reply (plain text)',
        type: 'text',
        required: false,
        helpText: 'Fill in this, the HTML version, or both.',
      },
      { key: 'html', label: 'Reply (HTML)', type: 'text', required: false },
      {
        key: 'to',
        label: 'To',
        type: 'string',
        list: true,
        required: false,
        helpText: 'Leave empty to reply to the people already in the conversation.',
      },
      { key: 'cc', label: 'CC', type: 'string', list: true, required: false },
      {
        key: 'subject',
        label: 'Subject',
        type: 'string',
        required: false,
        helpText: 'Leave empty to keep the conversation’s own subject.',
      },
    ],
    perform,
    sample: {
      id: 'c9a1f0de-6b32-4b58-9a77-5f0b1d2e3c44',
      message_id: '<7f2c@lockally.com>',
      status: 'queued',
      thread_id: '0651e295-acaa-4397-a30b-b3309bff0a6a',
    },
    outputFields: [
      { key: 'id', label: 'Lockally message id' },
      { key: 'message_id', label: 'Internet message ID' },
      { key: 'status', label: 'Status' },
      { key: 'thread_id', label: 'Thread ID' },
    ],
  },
};
