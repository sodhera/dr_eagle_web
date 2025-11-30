import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeChangeSet, shouldNotify } from './domain';
import { NormalizedItem, Snapshot, Tracker } from './types';

describe('Tracking Domain Logic', () => {
    describe('computeChangeSet', () => {
        it('should detect added items', () => {
            const oldSnapshot = null;
            const newItems: NormalizedItem[] = [{ id: '1', timestamp: 100, data: { val: 1 }, fingerprint: 'abc' }];

            const changes = computeChangeSet(oldSnapshot, newItems);
            assert.strictEqual(changes.length, 1);
            assert.strictEqual(changes[0].type, 'added');
            assert.strictEqual(changes[0].itemId, '1');
        });

        it('should detect modified items', () => {
            const item1: NormalizedItem = { id: '1', timestamp: 100, data: { val: 1 }, fingerprint: 'abc' };
            const oldSnapshot: Snapshot = { trackerId: 't1', timestamp: 100, items: [item1], fingerprint: 'abc' };

            const item1Mod: NormalizedItem = { id: '1', timestamp: 200, data: { val: 2 }, fingerprint: 'def' };
            const newItems = [item1Mod];

            const changes = computeChangeSet(oldSnapshot, newItems);
            assert.strictEqual(changes.length, 1);
            assert.strictEqual(changes[0].type, 'modified');
            assert.strictEqual(changes[0].itemId, '1');
            assert.deepStrictEqual(changes[0].diff, { val: { oldValue: 1, newValue: 2 } });
        });

        it('should detect removed items', () => {
            const item1: NormalizedItem = { id: '1', timestamp: 100, data: { val: 1 }, fingerprint: 'abc' };
            const oldSnapshot: Snapshot = { trackerId: 't1', timestamp: 100, items: [item1], fingerprint: 'abc' };

            const newItems: NormalizedItem[] = [];

            const changes = computeChangeSet(oldSnapshot, newItems);
            assert.strictEqual(changes.length, 1);
            assert.strictEqual(changes[0].type, 'removed');
            assert.strictEqual(changes[0].itemId, '1');
        });
    });

    describe('shouldNotify', () => {
        const baseTracker: Tracker = {
            id: 't1', ownerId: 'u1', visibility: 'personal', target: { type: 'httpSource', url: '' },
            mode: 'regular', analysis: { type: 'computational', thresholdConfig: {}, pythonTemplateId: '' },
            schedule: { type: 'interval', value: '3600' }, notification: { channels: [] },
            status: 'active', createdAt: 0, updatedAt: 0
        };

        it('should always notify for regular trackers', () => {
            const tracker = { ...baseTracker, mode: 'regular' as const };
            assert.strictEqual(shouldNotify(tracker, [], false), true);
        });

        it('should notify for irregular trackers only if triggered', () => {
            const tracker = { ...baseTracker, mode: 'irregular' as const };
            assert.strictEqual(shouldNotify(tracker, [], false), false);
            assert.strictEqual(shouldNotify(tracker, [], true), true);
        });
    });
});
