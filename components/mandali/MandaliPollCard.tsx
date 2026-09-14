import { memo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, RADII } from '@/lib/constants';
import type { MandaliPoll } from '@/lib/mandali';

export type MandaliPollCardProps = {
  poll: MandaliPoll;
  onVote: (pollId: string, optionId: string) => Promise<boolean | void>;
  dim: string;
  text: string;
  brand: string;
  cardBg: string;
  border: string;
  isDark: boolean;
};

export const MandaliPollCard = memo(function MandaliPollCard({
  poll,
  onVote,
  dim,
  text,
  brand,
  cardBg,
  border,
  isDark,
}: MandaliPollCardProps) {
  const [submittingOptionId, setSubmittingOptionId] = useState<string | null>(null);
  const [localPoll, setLocalPoll] = useState<MandaliPoll>(poll);

  // Sync with prop updates when poll id or total votes changes from external refresh
  const currentPoll = localPoll.id === poll.id ? localPoll : poll;

  const hasVoted = Boolean(currentPoll.userVotedOptionId);
  const totalVotes = currentPoll.totalVotes;

  const handleSelectOption = async (optionId: string) => {
    if (hasVoted || submittingOptionId) return;

    // Optimistic calculation
    const previousState = { ...currentPoll };
    const nextTotal = currentPoll.totalVotes + 1;
    const updatedOptions = currentPoll.options.map((opt) => {
      const nextCount = opt.id === optionId ? opt.voteCount + 1 : opt.voteCount;
      const nextPercentage = nextTotal > 0 ? Math.round((nextCount / nextTotal) * 100) : 0;
      return {
        ...opt,
        voteCount: nextCount,
        percentage: nextPercentage,
      };
    });

    const optimisticPoll: MandaliPoll = {
      ...currentPoll,
      totalVotes: nextTotal,
      userVotedOptionId: optionId,
      options: updatedOptions,
    };

    setLocalPoll(optimisticPoll);
    setSubmittingOptionId(optionId);

    try {
      const result = await onVote(currentPoll.id, optionId);
      if (result === false) {
        // Revert on explicit failure signal
        setLocalPoll(previousState);
      }
    } catch {
      setLocalPoll(previousState);
    } finally {
      setSubmittingOptionId(null);
    }
  };

  return (
    <View
      style={{
        borderRadius: RADII.md,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        borderColor: border,
        borderWidth: 1,
        padding: 12,
        gap: 9,
      }}
    >
      {/* Poll Header / Question if present */}
      {currentPoll.question ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Feather name="bar-chart-2" size={13} color={brand} />
          <Text
            style={{
              fontFamily: FONTS.sansSemiBold,
              fontSize: 12.5,
              color: text,
              flex: 1,
            }}
            numberOfLines={2}
          >
            {currentPoll.question}
          </Text>
        </View>
      ) : null}

      {/* Poll Options */}
      <View style={{ gap: 7 }}>
        {currentPoll.options.map((option) => {
          const isSelected = currentPoll.userVotedOptionId === option.id;
          const isSubmittingThis = submittingOptionId === option.id;
          const percentage =
            totalVotes > 0
              ? option.percentage ?? Math.round((option.voteCount / totalVotes) * 100)
              : 0;

          return (
            <PressableSurface
              key={option.id}
              haptic="selection"
              accessibilityLabel={`${option.text}${hasVoted ? `, ${percentage}%, ${option.voteCount} votes` : ''}`}
              disabled={hasVoted || submittingOptionId != null}
              onPress={() => void handleSelectOption(option.id)}
              style={{
                position: 'relative',
                minHeight: 44,
                borderRadius: RADII.sm,
                borderWidth: 1,
                borderColor: isSelected ? brand : border,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.65)',
                overflow: 'hidden',
                justifyContent: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              {/* Result Bar Fill */}
              {hasVoted ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${percentage}%`,
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(197, 160, 89, 0.22)'
                        : 'rgba(197, 160, 89, 0.16)'
                      : isDark
                        ? 'rgba(255, 255, 255, 0.07)'
                        : 'rgba(0, 0, 0, 0.05)',
                  }}
                />
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  zIndex: 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                  {hasVoted ? (
                    isSelected ? (
                      <Feather name="check-circle" size={15} color={brand} />
                    ) : (
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          borderWidth: 1,
                          borderColor: dim,
                          opacity: 0.5,
                        }}
                      />
                    )
                  ) : isSubmittingThis ? (
                    <ActivityIndicator size="small" color={brand} />
                  ) : (
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: brand,
                      }}
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sans,
                      fontSize: 13,
                      color: text,
                      flex: 1,
                    }}
                    numberOfLines={2}
                  >
                    {option.text}
                  </Text>
                </View>

                {hasVoted ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 12,
                        color: isSelected ? brand : text,
                      }}
                    >
                      {percentage}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </PressableSurface>
          );
        })}
      </View>

      {/* Footer Info */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 2,
          paddingHorizontal: 2,
        }}
      >
        <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim }}>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          {hasVoted ? ' · You voted' : ' · Tap an option to vote'}
        </Text>
      </View>
    </View>
  );
});
