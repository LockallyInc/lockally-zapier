'use strict';

// Subscribing and unsubscribing a Zap's webhook.
//
// Turning a Zap on creates a Lockally webhook pointed at the URL Zapier gives
// us; turning it off deletes it. Nothing is left behind on either side, which
// matters because a subscription that outlives its Zap goes on sending mail
// details to an endpoint nobody reads.

const { API_BASE } = require('./http');

/**
 * @param events which Lockally events this Zap wants.
 * @param mailboxesFrom optional: reads the chosen mailbox out of inputData, for
 *        the triggers that are about one mailbox.
 */
const subscribe = (events, mailboxesFrom) => async (z, bundle) => {
  const body = { url: bundle.targetUrl, events };

  if (mailboxesFrom) {
    const chosen = mailboxesFrom(bundle);
    // Naming no mailbox means "every mailbox this key can see": with a key
    // that has mailbox grants, Lockally fills in exactly those and says so in
    // the response. A key with no grants is refused, and the message from the
    // API explains how to grant them.
    if (chosen) body.mailboxes = [chosen];
  }

  const response = await z.request({
    url: `${API_BASE}/v1/webhooks`,
    method: 'POST',
    body,
  });
  return z.JSON.parse(response.content);
};

const unsubscribe = async (z, bundle) => {
  const id = bundle.subscribeData && bundle.subscribeData.id;
  if (!id) return {};
  const response = await z.request({
    url: `${API_BASE}/v1/webhooks/${id}`,
    method: 'DELETE',
    // A subscription that is already gone is the state we wanted. Failing here
    // would leave the person unable to turn their own Zap off.
    skipThrowForStatus: true,
  });
  return response.status === 404 ? {} : {};
};

module.exports = { subscribe, unsubscribe };
