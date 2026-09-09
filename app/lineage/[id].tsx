import React, { useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LineageGraphCanvas } from '@/components/lineage/LineageGraphCanvas';
import { LineageNodeSheet } from '@/components/lineage/LineageNodeSheet';
import { getLineageById, LineageNode } from '@/lib/lineage-data';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';

export default function LineageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const lineage = getLineageById(typeof id === 'string' ? id : 'advaita-shankara');
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleNodeSelect = (node: LineageNode) => {
    setSelectedNode(node);
    setSheetVisible(true);
  };

  const handleShare = async () => {
    if (!lineage) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `${lineage.title} — Shoonaya Parampara`,
        message: `Explore the sacred spiritual lineage of ${lineage.title} (${lineage.sanskritTitle}) on Shoonaya: The Spiritual Practice App.`,
      });
    } catch {
      // User cancelled share
    }
  };

  if (!lineage) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <View style={styles.headerRow}>
          <BackButton fallbackHref="/(tabs)/pathshala" handleHardwareBack />
        </View>
        <EmptyState
          title="Lineage Not Found"
          subtitle="The requested sacred lineage could not be located."
          ctaLabel="Return to Pathshala"
          onCta={() => router.replace('/(tabs)/pathshala')}
        />
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={[styles.headerRow, { borderBottomColor: theme.borderSoft }]}>
          <BackButton fallbackHref="/(tabs)/pathshala" handleHardwareBack />
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {lineage.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.brand }]} numberOfLines={1}>
              {lineage.sanskritTitle}
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            hitSlop={12}
            style={[styles.actionIconBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
            accessibilityLabel="Share Lineage"
          >
            <Feather name="share-2" size={17} color={theme.text} />
          </Pressable>
        </View>

        {/* Informational Guidance Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: theme.borderSoft }]}>
          <Feather name="info" size={14} color={theme.brand} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
            Pinch to zoom and drag to explore. Tap any sacred master or peetham for teachings and stotras.
          </Text>
        </View>

        {/* Interactive SVG Canvas */}
        <View style={styles.canvasContainer}>
          <LineageGraphCanvas
            lineage={lineage}
            selectedNodeId={selectedNode?.id}
            onSelectNode={handleNodeSelect}
          />
        </View>

        {/* Detail Bottom Sheet */}
        <LineageNodeSheet
          node={selectedNode}
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    marginTop: 1,
    textAlign: 'center',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    lineHeight: 16,
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});
