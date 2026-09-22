'use strict';

const crypto = require('crypto');

// Shared work for the actions that send mail.

/**
 * Addresses, however the Zap supplied them.
 *
 * A Zapier list field arrives as an array, but people also paste
 * "a@x.com, b@y.com" into one box, and a mapped field can arrive as a single
 * string. All three mean the same thing.
 */
const asList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  const parts = Array.isArray(value) ? value : String(value).split(/[,\n;]+/);
  return parts
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
};

/**
 * Lockally requires an Idempotency-Key on every send, and replays the first
 * answer for 24 hours if the same key comes back.
 *
 * A fresh key per run is deliberate. The alternative, deriving it from the
 * message, would mean a Zap that legitimately sends the same message twice in
 * a day silently sends it once, and the person would see a success both times.
 * Replaying a step from Zapier's own history is somebody asking for it to be
 * sent again, so it should be.
 */
const idempotencyKey = () => crypto.randomUUID();

/** Zapier gives a file as a URL to fetch. Lockally wants it base64 encoded. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const attachmentFrom = async (z, file) => {
  if (!file) return null;
  const url = String(file).trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new z.errors.Error(
      `That attachment is not something this step can fetch: ${url.slice(0, 60)}. Map a file field from an earlier step, or give a direct https link.`,
      'BadRequest',
      400
    );
  }

  const response = await z.request({ url, raw: true });
  const buffer = await response.buffer();
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new z.errors.Error(
      `That attachment is ${(buffer.length / 1024 / 1024).toFixed(1)} MB. Lockally accepts up to 10 MB per attachment; send a link to the file instead.`,
      'BadRequest',
      400
    );
  }

  // The filename the file itself claims, falling back to the URL and then to
  // something plain, because a nameless attachment is confusing to receive.
  const disposition = response.headers.get('content-disposition') || '';
  const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const fromUrl = decodeURIComponent((url.split('?')[0].split('/').pop() || '').trim());
  const filename = (named && named[1]) || fromUrl || 'attachment';

  return {
    filename,
    content_type: (response.headers.get('content-type') || 'application/octet-stream').split(';')[0],
    content_base64: buffer.toString('base64'),
  };
};

const attachmentsFrom = async (z, files) => {
  const list = asList(files);
  if (list.length === 0) return undefined;
  const out = [];
  for (const file of list) {
    const attachment = await attachmentFrom(z, file);
    if (attachment) out.push(attachment);
  }
  return out.length ? out : undefined;
};

/**
 * A checkbox, whatever form it arrives in.
 *
 * This integration turns Zapier's input cleaning off, so a checkbox can arrive
 * as the string "false", which is perfectly truthy in JavaScript and has
 * caught people out in every language that has the problem.
 */
const truthy = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return false;
  return ['true', 'yes', '1', 'on'].includes(String(value).trim().toLowerCase());
};

/** Drop the keys Lockally would rather not see at all than see empty. */
const compact = (obj) => {
  const out = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return;
    out[key] = value;
  });
  return out;
};

module.exports = { asList, truthy, idempotencyKey, attachmentsFrom, compact, MAX_ATTACHMENT_BYTES };
