'use strict';

const { asList, truthy, compact } = require('../lib/send');
const { flatten } = require('../lib/events');

describe('asList', () => {
  it('takes a Zapier list, a pasted string, or one address', () => {
    expect(asList(['a@x.test', 'b@x.test'])).toEqual(['a@x.test', 'b@x.test']);
    expect(asList('a@x.test, b@x.test')).toEqual(['a@x.test', 'b@x.test']);
    expect(asList('a@x.test\nb@x.test;c@x.test')).toEqual(['a@x.test', 'b@x.test', 'c@x.test']);
    expect(asList(' one@x.test ')).toEqual(['one@x.test']);
  });

  it('is empty when the field is', () => {
    expect(asList('')).toEqual([]);
    expect(asList(undefined)).toEqual([]);
    // A list field with a blank row is the commonest way this happens.
    expect(asList(['a@x.test', '', '  '])).toEqual(['a@x.test']);
  });
});

describe('truthy', () => {
  // The bug this exists to prevent: input cleaning is off, so an unticked
  // checkbox arrives as the string "false", and every such string is truthy.
  it('reads an unticked checkbox as off, however it arrives', () => {
    expect(truthy('false')).toBe(false);
    expect(truthy(false)).toBe(false);
    expect(truthy('')).toBe(false);
    expect(truthy(undefined)).toBe(false);
  });

  it('reads a ticked one as on', () => {
    expect(truthy('true')).toBe(true);
    expect(truthy(true)).toBe(true);
    expect(truthy('yes')).toBe(true);
    expect(truthy('1')).toBe(true);
  });
});

describe('compact', () => {
  it('leaves out what the API would rather not receive empty', () => {
    expect(compact({ a: 1, b: '', c: [], d: null, e: {}, f: 'keep' })).toEqual({ a: 1, f: 'keep' });
  });
});

describe('flatten', () => {
  const envelope = {
    id: 'evt_1',
    type: 'message.received',
    created: 1789234567,
    tenant_id: 't',
    data: { mailbox: 'sales@x.test', subject: 'Hello' },
  };

  it('keeps the event id, which is what Zapier deduplicates on', () => {
    expect(flatten(envelope).id).toBe('evt_1');
  });

  it('turns unix seconds into a date Zapier understands', () => {
    expect(flatten(envelope).occurred_at).toBe(new Date(1789234567000).toISOString());
  });

  it('lifts the event data to the top level', () => {
    const flat = flatten(envelope);
    expect(flat.mailbox).toBe('sales@x.test');
    expect(flat.subject).toBe('Hello');
    expect(flat.event).toBe('message.received');
  });

  it('survives a body that is not an event', () => {
    expect(flatten(null)).toBeNull();
    expect(flatten('nonsense')).toBeNull();
  });
});
