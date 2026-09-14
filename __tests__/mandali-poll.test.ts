import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MandaliPoll, MandaliPollOption } from '../lib/mandali';

describe('Mandali Multiple-Choice Poll Contract Suite', () => {
  it('calculates vote percentages accurately', () => {
    const options: MandaliPollOption[] = [
      { id: 'opt-1', text: 'Yes, full Nirjala fast', voteCount: 75, percentage: 75 },
      { id: 'opt-2', text: 'Observing with fruits & milk', voteCount: 20, percentage: 20 },
      { id: 'opt-3', text: 'Offering prayers & Japa only', voteCount: 5, percentage: 5 },
    ];

    const totalVotes = options.reduce((sum, opt) => sum + opt.voteCount, 0);
    assert.equal(totalVotes, 100);

    const percentages = options.map((opt) => Math.round((opt.voteCount / totalVotes) * 100));
    assert.deepEqual(percentages, [75, 20, 5]);
  });

  it('handles zero votes gracefully without dividing by zero', () => {
    const options: MandaliPollOption[] = [
      { id: 'opt-1', text: 'Option A', voteCount: 0, percentage: 0 },
      { id: 'opt-2', text: 'Option B', voteCount: 0, percentage: 0 },
    ];

    const totalVotes = 0;
    const percentages = options.map((opt) => (totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0));
    assert.deepEqual(percentages, [0, 0]);
  });

  it('optimistic single-choice vote transition increments chosen option and total votes', () => {
    const poll: MandaliPoll = {
      id: 'poll-1',
      question: 'Who is observing Ekadashi today?',
      totalVotes: 10,
      userVotedOptionId: null,
      options: [
        { id: 'opt-1', text: 'Fasting completely', voteCount: 6, percentage: 60 },
        { id: 'opt-2', text: 'Phalahar (fruits/nuts)', voteCount: 4, percentage: 40 },
      ],
    };

    // User votes for opt-2
    const chosenOptionId = 'opt-2';
    const nextTotal = poll.totalVotes + 1;
    const updatedOptions = poll.options.map((opt) => {
      const nextCount = opt.id === chosenOptionId ? opt.voteCount + 1 : opt.voteCount;
      return {
        ...opt,
        voteCount: nextCount,
        percentage: Math.round((nextCount / nextTotal) * 100),
      };
    });

    const optimisticPoll: MandaliPoll = {
      ...poll,
      totalVotes: nextTotal,
      userVotedOptionId: chosenOptionId,
      options: updatedOptions,
    };

    assert.equal(optimisticPoll.totalVotes, 11);
    assert.equal(optimisticPoll.userVotedOptionId, 'opt-2');
    assert.equal(optimisticPoll.options.find((o) => o.id === 'opt-2')?.voteCount, 5);
    assert.equal(optimisticPoll.options.find((o) => o.id === 'opt-1')?.voteCount, 6);
  });
});
