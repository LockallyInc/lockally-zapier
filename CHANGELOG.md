# Changelog

## 1.0.0 (unreleased)

First version, for Zapier's review.

- Connect with a Lockally API key. The connection is labelled with the account
  name and the key's label, and says at connect time what the key cannot do.
- Instant triggers: New Email Received (per mailbox, optional full body), Email
  Delivered, Email Bounced, Spam Complaint. Each has the polling fallback
  Zapier requires, reading the 7-day event log, in the same envelopes the
  webhooks send.
- Actions: Send Email, Send Email From Template, Reply to an Email Thread, Add
  to Suppression List, Remove From Suppression List.
- Searches: Find a Sent Message, Find a Suppression.
- The Email Delivered sample and output fields match what Lockally actually
  sends (recipient, SMTP code and response, receiving server), found by
  Zapier's comparison with a live task. SMTP codes are typed as text.
- Built on zapier-platform-core 19.3.0.
