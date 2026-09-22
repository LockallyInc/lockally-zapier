'use strict';

// One shape for an event, whichever way it arrived.
//
// Zapier requires an instant trigger to also offer a polling fallback that
// returns "identical" objects, because the sample somebody sees while building
// a Zap comes from the poll while the live data comes from the webhook. If the
// two differ, fields silently go missing the moment the Zap runs for real.
//
// Both paths therefore go through flatten() below: the webhook body and a row
// from GET /v1/events are the same envelope, byte for byte, so the same
// function can be the only thing that decides what a trigger returns.

/**
 * Turn a Lockally event envelope into the flat object a Zap step works with.
 *
 * `id` stays the envelope id, which is what Zapier deduplicates on, so an
 * event that arrives by webhook and is then seen again by the poll is not
 * processed twice.
 */
const flatten = (envelope) => {
  if (!envelope || typeof envelope !== 'object') return null;
  const data = envelope.data || {};
  return {
    id: envelope.id,
    event: envelope.type,
    // Unix seconds on the wire; an ISO 8601 string is what Zapier's date
    // fields and filters understand.
    occurred_at: envelope.created ? new Date(envelope.created * 1000).toISOString() : undefined,
    ...data,
  };
};

/** The webhook half of an instant trigger. */
const fromWebhook = (z, bundle) => {
  const flat = flatten(bundle.cleanedRequest);
  return flat ? [flat] : [];
};

/**
 * The polling half. Reads the event log, which keeps 7 days of exactly the
 * envelopes the webhook sends.
 */
const listEvents = async (z, bundle, type, extraParams = {}) => {
  const { API_BASE } = require('./http');
  const response = await z.request({
    url: `${API_BASE}/v1/events`,
    params: { type, limit: 25, ...extraParams },
  });
  const body = z.JSON.parse(response.content);
  return (body.data || []).map(flatten).filter(Boolean);
};

module.exports = { flatten, fromWebhook, listEvents };
