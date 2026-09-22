'use strict';

const { API_BASE } = require('../lib/http');

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/v1/suppressions`,
    method: 'POST',
    body: {
      email: String(bundle.inputData.email || '').trim(),
      reason: bundle.inputData.reason || 'manual',
    },
  });
  return z.JSON.parse(response.content);
};

module.exports = {
  key: 'add_suppression',
  noun: 'Suppression',
  display: {
    label: 'Add to Suppression List',
    description: 'Stops Lockally sending to an address. Use it when somebody asks to be taken off a list.',
  },
  operation: {
    inputFields: [
      { key: 'email', label: 'Email address', type: 'string', required: true },
      {
        key: 'reason',
        label: 'Reason',
        type: 'string',
        required: false,
        default: 'manual',
        choices: {
          manual: 'Added by hand',
          unsubscribe: 'They unsubscribed',
          complaint: 'They marked mail as spam',
          bounce: 'Mail to them bounced',
        },
        helpText:
          'A complaint or a bounce blocks every message to that address. An unsubscribe, or adding it by hand, blocks marketing and opt-in mail while letting transactional mail such as a receipt through.',
      },
    ],
    perform,
    sample: { email: 'someone@example.com', reason: 'unsubscribe', source: 'api' },
    outputFields: [
      { key: 'email', label: 'Email address' },
      { key: 'reason', label: 'Reason' },
      { key: 'source', label: 'Added by' },
    ],
  },
};
