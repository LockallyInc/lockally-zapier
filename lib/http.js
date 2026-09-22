'use strict';

// Everything this integration knows about talking to Lockally: where the API
// is, how the key is presented, and how a refusal is turned into a sentence
// somebody can act on.
//
// Zapier shows the thrown message to the person building the Zap, usually
// without any of our context around it, so each message has to say what
// happened, where, and what to do next, on its own.

const API_BASE = process.env.LOCKALLY_API_BASE || 'https://api.lockally.com';

/**
 * Attach the key, and only ever to Lockally.
 *
 * This integration also fetches files that a Zap hands it, from whatever host
 * they live on. Those requests go through here too, so the check on the URL is
 * what keeps the customer's API key from being sent to a third party.
 */
const addApiKey = (request, z, bundle) => {
  request.headers = request.headers || {};
  const url = request.url || '';
  if (url.startsWith(API_BASE) && bundle.authData && bundle.authData.api_key) {
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
    request.headers['User-Agent'] = 'Lockally-Zapier';
  }
  return request;
};

/** The scope each of our calls needs, by path, for the 403 message. */
const scopeHint = (url = '') => {
  if (url.includes('/v1/send')) return 'send:write';
  if (url.includes('/v1/webhooks')) return 'webhooks:write';
  if (url.includes('/v1/events')) return 'webhooks:read';
  if (url.includes('/v1/inboxes') || url.includes('/v1/threads')) return 'inboxes:read';
  if (url.includes('/v1/suppressions')) return 'suppressions:write';
  if (url.includes('/v1/messages')) return 'send:read';
  if (url.includes('/v1/templates')) return 'templates:read';
  return null;
};

/**
 * Lockally answers with RFC 9457 problem details: a title and a detail that is
 * already written for a person. We pass those through rather than inventing
 * our own wording, and add what Zapier's user can do about it.
 */
const handleErrors = (response, z) => {
  if (response.status < 400) return response;
  // A call that asked to read the status itself, such as a search that treats
  // "not found" as an empty result rather than a failure. It raises what it
  // does not want to handle by calling raise() below.
  if (response.skipThrowForStatus) return response;
  return raise(response, z);
};

/** Turn a refused response into the sentence a person should read. */
const raise = (response, z) => {
  let problem = {};
  try {
    problem = z.JSON.parse(response.content) || {};
  } catch (err) {
    problem = {};
  }
  const title = problem.title || `HTTP ${response.status}`;
  const detail = problem.detail || '';
  const said = detail ? `${title}. ${detail}` : title;
  const url = (response.request && response.request.url) || '';

  if (response.status === 401) {
    throw new z.errors.RefreshAuthError(
      `Lockally did not accept this API key. ${detail || 'Create a new key in the Lockally console under API keys, then reconnect.'}`
    );
  }
  if (response.status === 403 || response.status === 402) {
    // Two very different refusals share these statuses: the plan does not
    // include the feature, or the key may not do this.
    const scope = scopeHint(url);
    if (problem.reason === 'plan' || /plan/i.test(title)) {
      throw new z.errors.Error(
        `${said} Open Billing in the Lockally console to change plan, then try again.`,
        'PlanRequired',
        response.status
      );
    }
    throw new z.errors.Error(
      scope
        ? `${said} This key needs the ${scope} scope. Edit the key in the Lockally console under API keys, or create one with that scope, then reconnect this Lockally account in Zapier.`
        : said,
      'Forbidden',
      response.status
    );
  }
  if (response.status === 429) {
    throw new z.errors.ThrottledError(said, 60);
  }
  if (response.status >= 500) {
    throw new z.errors.Error(
      `Lockally had a problem answering: ${said} Zapier will try again.`,
      'ServerError',
      response.status
    );
  }
  throw new z.errors.Error(said, 'BadRequest', response.status);
};

module.exports = { API_BASE, addApiKey, handleErrors, raise, scopeHint };
