import { describe, it, expect } from 'vitest';
import {
  BLOCK_PAGE,
  conditionKey,
  describeEntries,
  entryKind,
  entryToCondition,
  isDnrCondition,
  makeRule,
} from '../extension/lib/rules.js';

describe('entryToCondition', () => {
  it('turns sites and patterns into DNR conditions', () => {
    expect(entryToCondition('site.test').condition).toEqual({
      urlFilter: '||site.test^',
      isUrlFilterCaseSensitive: false,
      resourceTypes: ['main_frame'],
    });
    expect(entryToCondition('*keyw').condition.urlFilter).toBe('keyw');
    expect(entryToCondition('regex:^https://a\\.test/').condition.regexFilter).toBe(
      '^https://a\\.test/',
    );
  });

  it('turns browser pages into worker conditions', () => {
    expect(entryToCondition('edge://settings/profiles/').condition).toEqual({
      internal: 'edge://settings/profiles',
    });
    expect(entryToCondition('chrome://flags').condition).toEqual({ internal: 'edge://flags' });
    expect(isDnrCondition(entryToCondition('edge://flags').condition)).toBe(false);
    expect(isDnrCondition(entryToCondition('site.test').condition)).toBe(true);
  });

  it.each([
    ['*a', 'too short'],
    ['*abc', 'keyword too short'],
    ['ab', 'too short'],
    ['*.test', 'too broad'],
    ['regex:.*', 'too broad'],
    ['regex:(?=x)site', 'lookaround'],
    ['regex:(unclosed', 'invalid regex'],
    ['two words', 'invalid'],
    ['edge://', 'incomplete'],
  ])('rejects %j', (entry, reason) => {
    const r = entryToCondition(entry);
    expect('error' in r && r.error).toContain(reason);
  });
});

describe('rules', () => {
  it('only ever creates redirect rules to the block page', () => {
    const rule = makeRule(3, entryToCondition('a.test').condition);
    expect(rule.action).toEqual({ type: 'redirect', redirect: { extensionPath: BLOCK_PAGE } });
    expect(rule.id).toBe(3);
  });

  it('keys equivalent spellings the same way', () => {
    const key = (e) => conditionKey(entryToCondition(e).condition);
    expect(key('www.A.test')).toBe(key('a.test'));
    expect(key('chrome://flags')).toBe(key('edge://flags/'));
  });
});

describe('entryKind / describeEntries', () => {
  it('classifies entries', () => {
    expect(entryKind('site.test')).toBe('site');
    expect(entryKind('*keyw')).toBe('pattern');
    expect(entryKind('edge://flags')).toBe('system');
    expect(entryKind('regex:a\\.test')).toBe('regex');
  });

  it('describes entries and drops equivalent duplicates', () => {
    const list = describeEntries(['a.test', 'www.a.test', 'edge://flags', '*a']);
    expect(list.map((i) => [i.entry, i.kind, Boolean(i.error)])).toEqual([
      ['a.test', 'site', false],
      ['edge://flags', 'system', false],
      ['*a', 'pattern', true],
    ]);
  });
});
