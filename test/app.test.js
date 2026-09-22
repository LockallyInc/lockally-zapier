'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);

const API = 'https://api.lockally.com';
const authData = { api_key: 'lk_live_test_secret' };

afterEach(() => nock.cleanAll());

describe('connecting', () => {
  it('labels the connection with the account and the key', async () => {
    nock(API)
      .get('/v1/auth/whoami')
      .matchHeader('authorization', 'Bearer lk_live_test_secret')
      .reply(200, {
        tenant: { slug: 'acme', name: 'Acme Co', plan: 'pro' },
        scopes: ['send:write', 'webhooks:read', 'webhooks:write'],
        auth: 'api_key',
        key: { id: 'k1', label: 'Zapier' },
      });

    const result = await appTester(App.authentication.test, { authData });
    expect(result.tenant_name).toBe('Acme Co');
    expect(result.key_label).toBe('Zapier');
    // The connection says what this key cannot do, so it is not discovered
    // one Zap at a time.
    expect(result.missing_for).toContain('inboxes:read');
  });

  it('refuses a key that can do none of this, and names the permissions', async () => {
    nock(API).get('/v1/auth/whoami').reply(200, {
      tenant: { slug: 'acme', name: 'Acme Co', plan: 'free' },
      scopes: ['domains:read'],
      auth: 'api_key',
      key: { id: 'k1', label: 'Read only' },
    });

    await expect(appTester(App.authentication.test, { authData })).rejects.toThrow(/send:write/);
  });

  it('says what to do when the key is not accepted', async () => {
    nock(API).get('/v1/auth/whoami').reply(401, { title: 'Invalid API key', detail: 'That key does not exist.' });
    await expect(appTester(App.authentication.test, { authData })).rejects.toThrow(/does not exist/);
  });
});

describe('New Email Received', () => {
  const trigger = App.triggers.new_email.operation;

  it('subscribes to the chosen mailbox only', async () => {
    let sent;
    nock(API)
      .post('/v1/webhooks', (body) => {
        sent = body;
        return true;
      })
      .reply(201, { id: 'wh_1', url: 'https://hooks.zapier.test/1', events: ['message.received'] });

    const result = await appTester(trigger.performSubscribe, {
      authData,
      inputData: { mailbox: 'sales@acme.test' },
      targetUrl: 'https://hooks.zapier.test/1',
    });

    expect(sent.events).toEqual(['message.received']);
    expect(sent.mailboxes).toEqual(['sales@acme.test']);
    expect(sent.url).toBe('https://hooks.zapier.test/1');
    expect(result.id).toBe('wh_1');
  });

  it('asks for every mailbox the key can see when none is chosen', async () => {
    let sent;
    nock(API)
      .post('/v1/webhooks', (body) => {
        sent = body;
        return true;
      })
      .reply(201, { id: 'wh_2' });

    await appTester(trigger.performSubscribe, {
      authData,
      inputData: {},
      targetUrl: 'https://hooks.zapier.test/2',
    });
    expect(sent.mailboxes).toBeUndefined();
  });

  it('deletes the subscription when the Zap is turned off', async () => {
    const call = nock(API).delete('/v1/webhooks/wh_1').reply(204);
    await appTester(trigger.performUnsubscribe, { authData, subscribeData: { id: 'wh_1' } });
    expect(call.isDone()).toBe(true);
  });

  it('lets somebody turn a Zap off even if the subscription is already gone', async () => {
    nock(API).delete('/v1/webhooks/wh_gone').reply(404, { title: 'Webhook not found' });
    await expect(
      appTester(trigger.performUnsubscribe, { authData, subscribeData: { id: 'wh_gone' } })
    ).resolves.toBeDefined();
  });

  // The rule that makes an instant trigger usable: what the poll returns and
  // what the webhook delivers have to be the same object, or the sample
  // somebody builds against is not what their Zap receives.
  it('returns the same shape from the webhook and from the poll', async () => {
    const envelope = {
      id: 'evt_1',
      type: 'message.received',
      created: 1789234567,
      tenant_id: 't',
      data: { mailbox: 'sales@acme.test', subject: 'Hello', from: 'someone@example.test' },
    };

    const fromHook = await appTester(trigger.perform, { authData, inputData: {}, cleanedRequest: envelope });

    nock(API)
      .get('/v1/events')
      .query((q) => q.type === 'message.received')
      .reply(200, { data: [envelope] });
    const fromPoll = await appTester(trigger.performList, { authData, inputData: {} });

    expect(fromHook).toHaveLength(1);
    expect(fromPoll).toHaveLength(1);
    expect(fromHook[0]).toEqual(fromPoll[0]);
    expect(fromPoll[0].subject).toBe('Hello');
  });

  it('fetches the body only when asked, and carries on without it', async () => {
    const envelope = {
      id: 'evt_2',
      type: 'message.received',
      created: 1789234567,
      tenant_id: 't',
      data: { mailbox: 'sales@acme.test', thread_id: 'th_1', message_id: 'm_1', subject: 'Hi' },
    };

    nock(API).get('/v1/threads/th_1/messages/m_1').reply(200, { body: { text: 'the whole thing', html: '' } });
    const [withBody] = await appTester(trigger.perform, {
      authData,
      inputData: { include_body: 'true' },
      cleanedRequest: envelope,
    });
    expect(withBody.body_text).toBe('the whole thing');

    // A body that cannot be read must not lose the email itself.
    nock(API).get('/v1/threads/th_1/messages/m_1').reply(502, { title: 'Body fetch failed' });
    const [degraded] = await appTester(trigger.perform, {
      authData,
      inputData: { include_body: 'true' },
      cleanedRequest: envelope,
    });
    expect(degraded.subject).toBe('Hi');
    expect(degraded.body_unavailable).toMatch(/502/);
  });
});

describe('Send Email', () => {
  const perform = App.creates.send_email.operation.perform;

  it('sends what the Zap filled in, with an idempotency key', async () => {
    let sent;
    let idempotency;
    nock(API)
      .post('/v1/send', (body) => {
        sent = body;
        return true;
      })
      .reply(function () {
        idempotency = this.req.getHeader('idempotency-key');
        return [202, { id: 'm1', message_id: '<a@lockally.com>', status: 'queued' }];
      });

    const result = await appTester(perform, {
      authData,
      inputData: {
        from: ' hello@acme.test ',
        to: 'one@example.test, two@example.test',
        subject: 'Hello',
        text: 'Body',
        unsubscribe: 'false',
      },
    });

    expect(sent.from).toBe('hello@acme.test');
    expect(sent.to).toEqual(['one@example.test', 'two@example.test']);
    // An unticked checkbox must not turn a receipt into marketing mail.
    expect(sent.unsubscribe).toBeFalsy();
    expect(idempotency).toBeTruthy();
    expect(result.status).toBe('queued');
  });

  it('says what is missing before calling the API', async () => {
    await expect(
      appTester(perform, { authData, inputData: { from: 'hello@acme.test', to: 'one@example.test' } })
    ).rejects.toThrow(/no message/i);

    await expect(
      appTester(perform, { authData, inputData: { from: 'hello@acme.test', text: 'Body' } })
    ).rejects.toThrow(/no recipient/i);
  });

  it('turns a refusal into something the person can act on', async () => {
    nock(API).post('/v1/send').reply(403, {
      title: 'Insufficient scope',
      detail: 'This endpoint requires scope: send:write',
    });

    await expect(
      appTester(perform, {
        authData,
        inputData: { from: 'hello@acme.test', to: 'one@example.test', text: 'Body' },
      })
    ).rejects.toThrow(/send:write scope/);
  });

  it('names the plan when the plan is the problem', async () => {
    nock(API).post('/v1/webhooks').reply(403, {
      title: 'Upgrade required',
      detail: 'Webhooks require a Starter, Pro, or Scale plan.',
      reason: 'plan',
    });

    await expect(
      appTester(App.triggers.email_bounced.operation.performSubscribe, {
        authData,
        inputData: {},
        targetUrl: 'https://hooks.zapier.test/3',
      })
    ).rejects.toThrow(/Billing/);
  });
});

describe('searches', () => {
  it('finds nothing rather than failing when an address is not suppressed', async () => {
    nock(API).get('/v1/suppressions/someone%40example.test').reply(404, { title: 'Not suppressed' });
    const result = await appTester(App.searches.find_suppression.operation.perform, {
      authData,
      inputData: { email: 'someone@example.test' },
    });
    expect(result).toEqual([]);
  });

  it('returns the message it found', async () => {
    nock(API).get('/v1/messages/m1').reply(200, { id: 'm1', status: 'delivered' });
    const result = await appTester(App.searches.find_message.operation.perform, {
      authData,
      inputData: { id: 'm1' },
    });
    expect(result[0].status).toBe('delivered');
  });
});

describe('the integration as a whole', () => {
  it('gives every instant trigger a polling fallback, which Zapier requires', () => {
    Object.values(App.triggers)
      .filter((t) => t.operation.type === 'hook')
      .forEach((t) => {
        expect(typeof t.operation.performList).toBe('function');
        expect(t.operation.sample).toBeTruthy();
      });
  });

  it('never sends the API key anywhere but Lockally', async () => {
    const { addApiKey } = require('../lib/http');
    const elsewhere = addApiKey({ url: 'https://files.zapier.test/attachment' }, null, { authData });
    expect(elsewhere.headers.Authorization).toBeUndefined();

    const ours = addApiKey({ url: `${API}/v1/send` }, null, { authData });
    expect(ours.headers.Authorization).toBe('Bearer lk_live_test_secret');
  });
});
