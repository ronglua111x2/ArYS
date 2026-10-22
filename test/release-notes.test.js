import { describe, it, expect } from 'vitest';
import { changelogSection } from '../scripts/release-notes.mjs';

const text = `# Changelog

## [Unreleased]

## [1.1.0] - 2026-01-02

### Added

- New thing.

## [1.0.0] - 2026-01-01

First.
`;

describe('changelogSection', () => {
  it('returns the body of one version, without its heading', () => {
    expect(changelogSection(text, '1.1.0')).toBe('### Added\n\n- New thing.');
    expect(changelogSection(text, '1.0.0')).toBe('First.');
  });

  it('returns null for a version that is not listed', () => {
    expect(changelogSection(text, '2.0.0')).toBeNull();
  });
});
