'use strict';

const { API_BASE, raise } = require('../lib/http');

const perform = async (z, bundle) => {
  const email = String(bundle.inputData.email || '').trim();
  if (!email) return [];

  const response = await z.request({
    url: `${API_BASE}/v1/suppressions/${encodeURIComponent(email)}`,
    skipThrowForStatus: true,
  });
  // Not on the list is the ordinary answer, not a failure. A Zap can branch on
  // whether this step found anything.
  if (response.status === 404) return [];
  if (response.status >= 400) raise(response, z);
  return [z.JSON.parse(response.content)];
};

module.exports = {
  key: 'find_suppression',
  noun: 'Suppression',
  display: {
    label: 'Find a Suppression',
    description:
      'Checks whether an address is on your suppression list, and why. Finds nothing if the address is free to receive mail.',
  },
  operation: {
    inputFields: [{ key: 'email', label: 'Email address', type: 'string', required: true }],
    perform,
    sample: {
      email: 'someone@example.com',
      reason: 'complaint',
      source: 'fbl',
      created_at: '2026-09-01T08:15:00Z',
    },
    outputFields: [
      { key: 'email', label: 'Email address' },
      { key: 'reason', label: 'Reason' },
      { key: 'source', label: 'Added by' },
      { key: 'created_at', label: 'Added at', type: 'datetime' },
    ],
  },
};
