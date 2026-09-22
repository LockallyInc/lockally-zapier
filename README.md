# Lockally for Zapier

The Lockally integration for [Zapier](https://zapier.com): send email from your
own domain as a step in any Zap, and start Zaps from mail that arrives or from
what happens to mail you sent.

Built on the [Zapier Platform CLI](https://docs.zapier.com/platform/build-cli/overview).

## What it does

**Triggers** (instant, over webhooks)

| Trigger | When it fires |
|---|---|
| New Email Received | Mail arrives in a Lockally mailbox. Pick one mailbox or take them all. Optionally fetches the full body. |
| Email Delivered | An email you sent is accepted by the recipient's server. |
| Email Bounced | An email you sent bounces, with the reason the receiving server gave. |
| Spam Complaint | Somebody marks your mail as spam and their provider reports it. |

**Actions**

| Action | What it does |
|---|---|
| Send Email | Sends from one of your verified addresses, with attachments and optional scheduling. |
| Send Email From Template | Sends a saved Lockally template and fills in its placeholders. |
| Reply to an Email Thread | Replies inside an existing conversation, so it stays one thread. |
| Add to Suppression List | Stops Lockally sending to an address. |
| Remove From Suppression List | Lets Lockally send to it again. |

**Searches**

| Search | What it answers |
|---|---|
| Find a Sent Message | Where did that email get to: queued, delivered, bounced, complaint. |
| Find a Suppression | Is this address on the suppression list, and why. |

## Connecting

Zapier asks for a Lockally API key. Create one in the Lockally console under
**API keys**; it begins with `lk_live_`.

Give the key only what you need:

| You want to | Permissions |
|---|---|
| Send email | `send:write` |
| Send a template | `send:write`, `templates:read` for the dropdown |
| Start Zaps from Lockally events | `webhooks:write` and `webhooks:read` |
| Trigger on mail arriving, or reply to a thread | `inboxes:read`, plus `inboxes:write` to reply |
| Manage the suppression list | `suppressions:write`, and `suppressions:read` to look one up |
| See where a sent message got to | `send:read` |

**Mailboxes are granted separately.** A key can be limited to particular
mailboxes on its own page in the console. The Mailbox dropdown then offers
exactly those, and a trigger that asks for another one is refused rather than
quietly receiving nothing. A key with no mailbox grants at all cannot use the
New Email Received trigger; grant it the mailbox it should watch.

Triggers are built on Lockally webhooks, which are part of the paid plans. The
sending actions work on any plan that has API access. When a plan is the
obstacle the step says so and points at Billing.

## How the triggers work

Turning a Zap on creates a Lockally webhook pointed at that Zap; turning the
Zap off deletes it. Nothing is left behind on either side.

While you are building, Zapier shows a sample from `GET /v1/events`, Lockally's
7-day log of everything that happened. The webhook and the log carry exactly
the same envelope, so what you build against is what your Zap will receive. Each
event has an id, which Zapier deduplicates on, so an event seen both ways is
handled once.

## Development

```bash
npm install
npm test                 # unit tests, no network: the API is mocked with nock
npm run validate         # schema and publishing checks
npm run push             # upload a version to the Zapier account
```

The command the Zapier CLI installs is called `zapier-platform`, not `zapier`,
from version 19 onwards. Anything the Zapier documentation writes as
`zapier <command>` is `npx zapier-platform <command>` here, or `npm run zapier
-- <command>`. Signing in is `npx zapier-platform login`.

`LOCKALLY_API_BASE` overrides the API host, for testing against a staging
environment.

The layout follows the Zapier convention: `triggers/`, `creates/` and
`searches/` hold one file per visible thing, `lib/` holds what they share, and
`index.js` names them all.

## Support

Questions about the integration or about Lockally: support@lockally.com.
Developer documentation: <https://developers.lockally.com>.

## Licence

MIT, see [LICENSE](LICENSE).
