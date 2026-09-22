'use strict';

const { API_BASE, raise } = require('../lib/http');

const perform = async (z, bundle) => {
  const email = String(bundle.inputData.email || '').trim();
  const response = await z.request({
    url: `${API_BASE}/v1/suppressions/${encodeURIComponent(email)}`,
    method: 'DELETE',
    // An address that was not on the list is the state this step wanted, so it
    // is reported as such rather than failing the Zap.
    skipThrowForStatus: true,
  });
  if (response.status === 404) {
    return { email, removed: false, detail: 'That address was not on the suppression list.' };
  }
  if (response.status >= 400) raise(response, z);
  return { email, removed: true };
};

module.exports = {
  key: 'remove_suppression',
  noun: 'Suppression',
  display: {
    label: 'Remove From Suppression List',
    description: 'Lets Lockally send to an address again. Only do this when the person has asked to hear from you.',
  },
  operation: {
    inputFields: [{ key: 'email', label: 'Email address', type: 'string', required: true }],
    perform,
    sample: { email: 'someone@example.com', removed: true },
    outputFields: [
      { key: 'email', label: 'Email address' },
      { key: 'removed', label: 'Was removed', type: 'boolean' },
      { key: 'detail', label: 'Detail' },
    ],
  },
};
