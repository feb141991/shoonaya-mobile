import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { WhyTodayModal, type WhyTodayObservance } from '@/components/calendar/WhyTodayModal';

// Origin 2026-11-26: Raksha Bandhan on a Fallback-B year (2029) is Day 1, but Rakhi is tied only after
// Bhadra ends. The sheet also showed blank "Calculation factors" cards, because the API sends reasons
// as { code, text } and the sheet read { label, description }.
const rakhi2029: WhyTodayObservance = {
  date: '2029-08-23',
  slug: 'raksha-bandhan',
  display_name: 'Raksha Bandhan',
  emoji: '🧿',
  status: 'resolved',
  diagnostics: ['raksha_bandhan_after_bhadra'],
  reasons: [{
    code: 'raksha_bandhan_check',
    text: "Raksha Bandhan resolves to 2029-08-23 via 'after_bhadra': MATCHED on 2029-08-23.",
    details: { branch: 'after_bhadra', ritualWindowStartUtc: '2029-08-23T13:31:37.982Z' },
  }],
  location: { tz: 'Asia/Kolkata' },
};

describe('Why today sheet', () => {
  it('says when Rakhi may be tied, from the engine time, in the observance timezone', async () => {
    await render(<WhyTodayModal visible observance={rakhi2029} onClose={jest.fn()} timeZone="Europe/London" />);
    expect(screen.getByText(/^Tie Rakhi after 7:01\s?pm IST, when Bhadra ends\.$/i)).toBeTruthy();
  });

  it('shows the calculation reason text the API sends', async () => {
    await render(<WhyTodayModal visible observance={rakhi2029} onClose={jest.fn()} />);
    expect(screen.getByText('Raksha bandhan check')).toBeTruthy();
    expect(screen.getByText(/resolves to 2029-08-23 via 'after_bhadra'/)).toBeTruthy();
  });

  it('shows no ritual line when the festival has no Bhadra window', async () => {
    await render(<WhyTodayModal visible observance={{ ...rakhi2029, diagnostics: ['raksha_bandhan_udaya_three_muhurta'] }} onClose={jest.fn()} />);
    expect(screen.queryByText(/Tie Rakhi/)).toBeNull();
  });
});
