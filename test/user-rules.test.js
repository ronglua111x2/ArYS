import { describe, it, expect } from 'vitest';
import { planAdditions } from '../extension/lib/user-rules.js';

describe('planAdditions', () => {
  it('splits input into additions, duplicates and rejections', () => {
    const existing = [{ urlFilter: '||old.test^' }];
    const plan = planAdditions(
      'new.test\nold.test\n\n*a\nnew.test',
      '^https://re\\.test/\n.*',
      existing,
    );
    expect(plan.add.map((a) => a.input)).toEqual(['new.test', 'regex:^https://re\\.test/']);
    expect(plan.duplicates).toEqual(['old.test', 'new.test']);
    expect(plan.rejected.map((r) => r.input)).toEqual(['*a', 'regex:.*']);
  });
});
