'use strict';

// The platform version is read from the library itself rather than written
// down twice: Zapier refuses a build whose declared version does not match.
const { version: platformVersion } = require('zapier-platform-core');
const { version } = require('./package.json');

const authentication = require('./authentication');
const { addApiKey, handleErrors } = require('./lib/http');

const mailboxList = require('./triggers/mailbox_list');
const templateList = require('./triggers/template_list');
const newEmail = require('./triggers/new_email');
const emailDelivered = require('./triggers/email_delivered');
const emailBounced = require('./triggers/email_bounced');
const spamComplaint = require('./triggers/spam_complaint');

const sendEmail = require('./creates/send_email');
const sendTemplate = require('./creates/send_template');
const replyThread = require('./creates/reply_thread');
const addSuppression = require('./creates/add_suppression');
const removeSuppression = require('./creates/remove_suppression');

const findMessage = require('./searches/find_message');
const findSuppression = require('./searches/find_suppression');

module.exports = {
  version,
  platformVersion,

  authentication,

  // Zapier's input cleaning is off, so what a Zap typed is what this code
  // receives. It makes the behaviour predictable; lib/send.js does the
  // trimming and the checkbox reading instead.
  flags: { cleanInputData: false },

  beforeRequest: [addApiKey],
  afterResponse: [handleErrors],

  triggers: {
    [newEmail.key]: newEmail,
    [emailDelivered.key]: emailDelivered,
    [emailBounced.key]: emailBounced,
    [spamComplaint.key]: spamComplaint,
    [mailboxList.key]: mailboxList,
    [templateList.key]: templateList,
  },

  creates: {
    [sendEmail.key]: sendEmail,
    [sendTemplate.key]: sendTemplate,
    [replyThread.key]: replyThread,
    [addSuppression.key]: addSuppression,
    [removeSuppression.key]: removeSuppression,
  },

  searches: {
    [findMessage.key]: findMessage,
    [findSuppression.key]: findSuppression,
  },
};
