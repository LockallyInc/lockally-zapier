'use strict';

const { API_BASE } = require('../lib/http');

// Fills the Template dropdown on "Send Email from Template". Hidden, as above.
const perform = async (z, bundle) => {
  const response = await z.request({ url: `${API_BASE}/v1/templates` });
  const body = z.JSON.parse(response.content);
  return (body.data || []).map((tmpl) => ({
    id: tmpl.id,
    name: tmpl.name,
    subject: tmpl.subject,
  }));
};

module.exports = {
  key: 'templateList',
  noun: 'Template',
  display: {
    label: 'Template list',
    description: 'Lists the email templates on this account.',
    hidden: true,
  },
  operation: {
    perform,
    sample: {
      id: '7b1e6b2c-40f1-4a7c-9a0e-3a5a1c2d4e6f',
      name: 'Order confirmation',
      subject: 'Your order {{order_number}}',
    },
  },
};
