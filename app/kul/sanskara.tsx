import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { FEATURE_COLORS, COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { supabase } from '@/lib/supabase';
import { fetchKulSnapshot, type KulSnapshot } from '@/lib/kul';
import {
  fetchSanskaraOverview,
  fetchSanskaraAccess,
  acceptHandoverCode,
  executeSanskaraWrite,
  describeSanskaraFailure,
  SanskaraConsentRequiredError,
  type SanskaraOverview,
  type SanskaraRecord,
  type SanskaraDependent,
  type SanskaraSharedRecord,
  type SanskaraAccess,
} from '@/lib/sanskara';
import { SanskaraTree } from '@/components/sanskara/SanskaraTree';
import { SanskaraNodeSheet } from '@/components/sanskara/SanskaraNodeSheet';
import { AddChildSheet } from '@/components/sanskara/AddChildSheet';
import { SharingSheet } from '@/components/sanskara/SharingSheet';
import { SanskaraHandoverModal } from '@/components/sanskara/SanskaraHandoverModal';
import { SanskaraHandoverBanner } from '@/components/sanskara/SanskaraHandoverBanner';
import { SanskaraEarlyHandover } from '@/components/sanskara/SanskaraEarlyHandover';
import { SanskaraManagers } from '@/components/sanskara/SanskaraManagers';
import { SanskaraDataSheet } from '@/components/sanskara/SanskaraDataSheet';
import { handoverStage, type HandoverStage } from '@/lib/sanskaraHandover';
import {
  SANSKARA_CATALOG,
  SANSKARA_CATALOG_SOURCE_NOTE,
  SANSKARA_CATALOG_REVIEWED_BY,
  SANSKARA_CATALOG_REVIEWED_DATE,
  type SanskaraCatalogEntry,
} from '@/lib/sanskaraCatalog';

type ActiveSubject =
  | { kind: 'me' }
  | { kind: 'dependent'; dependent: SanskaraDependent }
  | { kind: 'shared' };

export default function SanskaraScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [kulSnapshot, setKulSnapshot] = useState<KulSnapshot | null>(null);
  const [overview, setOverview] = useState<SanskaraOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [consentRequired, setConsentRequired] = useState(false);

  const [activeTab, setActiveTab] = useState<'me' | string>('me');

  // Modals & Sheets
  const [selectedRecord, setSelectedRecord] = useState<SanskaraRecord | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [sharingRecordId, setSharingRecordId] = useState<string | null>(null);
  const [accessList, setAccessList] = useState<SanskaraAccess[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);

  // New Milestone modal
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState<string | null>(null);
  const [savingMilestone, setSavingMilestone] = useState(false);
  // Catalog picker inside the New Milestone modal: 'list' (browse the 16
  // samskaras) -> 'detail' (experience card for one) -> 'form' (the title +
  // date + submit step, shared by both a catalog pick and "write your own").
  const [milestoneStep, setMilestoneStep] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedCatalogEntry, setSelectedCatalogEntry] = useState<SanskaraCatalogEntry | null>(null);

  // "Your Sanskāra data": download a copy, delete a timeline. Closed whenever the identity changes.
  const [showData, setShowData] = useState(false);

  // Handover modal
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [handoverMode, setHandoverMode] = useState<'start' | 'accept'>('accept');
  const [handoverDependent, setHandoverDependent] = useState<SanskaraDependent | null>(null);

  // The identity this screen is showing, and the newest load. A response is published only if it is still the newest
  // load for the identity that is still signed in (AGENTS 22: a late response must not overwrite newer state).
  const identityRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);

  // Initial user fetch, and every later change of identity: the previous person's records never stay on screen.
  useEffect(() => {
    let mounted = true;
    const adopt = (id: string | null) => {
      if (!mounted || identityRef.current === id) return;
      identityRef.current = id;
      loadSeqRef.current += 1;
      setOverview(null);
      setKulSnapshot(null);
      setShowData(false);
      setCurrentUserId(id);
      if (!id) setLoading(false);
    };
    void supabase.auth.getUser().then(({ data }) => adopt(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => adopt(session?.user?.id ?? null));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadData = useCallback(
    async (userId: string, isRefresh = false) => {
      const seq = ++loadSeqRef.current;
      const isCurrent = () => seq === loadSeqRef.current && identityRef.current === userId;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorText(null);
      setConsentRequired(false);

      try {
        const [overviewData, kulData] = await Promise.all([
          fetchSanskaraOverview(userId, isRefresh),
          fetchKulSnapshot(userId).catch(() => null),
        ]);

        if (!isCurrent()) return;
        setOverview(overviewData);
        if (kulData) setKulSnapshot(kulData);
      } catch (err: any) {
        if (!isCurrent()) return;
        if (err instanceof SanskaraConsentRequiredError) {
          setConsentRequired(true);
        } else {
          setErrorText(describeSanskaraFailure(err, 'Unable to load sacred milestones. Please try again.'));
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (currentUserId) {
      void loadData(currentUserId);
    }
  }, [currentUserId, loadData]);

  // Active Subject computation
  const activeSubject = useMemo<ActiveSubject>(() => {
    if (activeTab === 'me') return { kind: 'me' };
    if (activeTab === 'shared') return { kind: 'shared' };
    const dep = overview?.dependents.find((d) => d.id === activeTab);
    if (dep) return { kind: 'dependent', dependent: dep };
    return { kind: 'me' };
  }, [activeTab, overview]);

  // Active records for current tree
  const activeRecords = useMemo<SanskaraRecord[]>(() => {
    if (!overview) return [];
    if (activeSubject.kind === 'me') {
      return overview.timeline.records;
    }
    if (activeSubject.kind === 'dependent') {
      return activeSubject.dependent.records;
    }
    return [];
  }, [overview, activeSubject]);

  const activeSubjectId = useMemo<string>(() => {
    if (!overview) return '';
    if (activeSubject.kind === 'me') return overview.timeline.subject_id;
    if (activeSubject.kind === 'dependent') return activeSubject.dependent.id;
    return '';
  }, [overview, activeSubject]);

  const canEditCurrentTree = useMemo<boolean>(() => {
    if (activeSubject.kind === 'me') return true;
    if (activeSubject.kind === 'dependent') return activeSubject.dependent.can_edit;
    return false;
  }, [activeSubject]);

  // Where the active child is in the hand-over at 18, from the birth date the server sent. The server still decides what is
  // allowed; this only says so in time and keeps the start button to the days on which start_claim can succeed.
  const activeHandover = useMemo<HandoverStage>(
    () => (activeSubject.kind === 'dependent' ? handoverStage(activeSubject.dependent.birth_date) : { stage: 'minor' }),
    [activeSubject],
  );

  // Fetch access list when sharing is opened
  const handleOpenSharing = useCallback(
    async (recordId: string | null = null) => {
      if (!currentUserId || !activeSubjectId) return;
      setSharingRecordId(recordId);
      setShowSharing(true);
      setLoadingAccess(true);
      try {
        const list = await fetchSanskaraAccess(currentUserId, activeSubjectId);
        setAccessList(list);
      } catch {
        setAccessList([]);
      } finally {
        setLoadingAccess(false);
      }
    },
    [currentUserId, activeSubjectId],
  );

  // Reset the catalog picker to its start every time the modal is (re)opened,
  // so a previous pick doesn't linger into the next "Plant Milestone".
  useEffect(() => {
    if (showAddMilestone) {
      setMilestoneStep('list');
      setSelectedCatalogEntry(null);
    }
  }, [showAddMilestone]);

  const handleChooseCatalogEntry = useCallback((entry: SanskaraCatalogEntry) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedCatalogEntry(entry);
    setMilestoneStep('detail');
  }, []);

  const handleUseCatalogEntry = useCallback(() => {
    if (!selectedCatalogEntry) return;
    // Still a free-typed custom_title under the hood (sanskara_rites has no
    // per-samskara rite_key yet — see lib/sanskaraCatalog.ts); the catalog
    // only supplies a well-sourced starting title instead of a blank field.
    const title = `${selectedCatalogEntry.nameTransliteration} (${selectedCatalogEntry.nameEnglish})`;
    setNewMilestoneTitle(title.length > 60 ? selectedCatalogEntry.nameTransliteration : title);
    setMilestoneStep('form');
  }, [selectedCatalogEntry]);

  const handleWriteOwnMilestone = useCallback(() => {
    setSelectedCatalogEntry(null);
    setNewMilestoneTitle('');
    setMilestoneStep('form');
  }, []);

  // Milestone Mutations
  const handleCreateMilestone = useCallback(async () => {
    if (!currentUserId || !activeSubjectId) return;
    const title = newMilestoneTitle.trim();
    if (!title) {
      Alert.alert('Required', 'Please enter a title for this sacred milestone.');
      return;
    }
    setSavingMilestone(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await executeSanskaraWrite(currentUserId, 'create-record', {
        subjectId: activeSubjectId,
        riteKey: 'custom',
        customTitle: title,
        plannedDate: newMilestoneDate || null,
      });
      setShowAddMilestone(false);
      setNewMilestoneTitle('');
      setNewMilestoneDate(null);
      setSelectedCatalogEntry(null);
      setMilestoneStep('list');
      void loadData(currentUserId, true);
    } catch (e: any) {
      Alert.alert('Could Not Save', describeSanskaraFailure(e, 'Could not create milestone.'));
    } finally {
      setSavingMilestone(false);
    }
  }, [currentUserId, activeSubjectId, newMilestoneTitle, newMilestoneDate, loadData]);

  const handleSaveRecord = useCallback(
    async (params: { customTitle?: string | null; plannedDate?: string | null; expectedVersion: number }) => {
      if (!currentUserId || !selectedRecord) return;
      await executeSanskaraWrite(currentUserId, 'update-record', {
        recordId: selectedRecord.id,
        customTitle: params.customTitle,
        plannedDate: params.plannedDate,
        expectedVersion: params.expectedVersion,
      });
      void loadData(currentUserId, true);
    },
    [currentUserId, selectedRecord, loadData],
  );

  const handleSavePrivate = useCallback(
    async (params: { notes?: string | null; location?: string | null; performedBy?: string | null; expectedDueDate?: string | null; expectedVersion: number }) => {
      if (!currentUserId || !selectedRecord) return;
      await executeSanskaraWrite(currentUserId, 'save-private', {
        recordId: selectedRecord.id,
        notes: params.notes,
        location: params.location,
        performedBy: params.performedBy,
        expectedDueDate: params.expectedDueDate,
        expectedVersion: params.expectedVersion,
      });
      void loadData(currentUserId, true);
    },
    [currentUserId, selectedRecord, loadData],
  );

  const handleSetCompletion = useCallback(
    async (params: { completedDate: string | null; expectedVersion: number }) => {
      if (!currentUserId || !selectedRecord) return;
      await executeSanskaraWrite(currentUserId, 'set-completion', {
        recordId: selectedRecord.id,
        completedDate: params.completedDate,
        expectedVersion: params.expectedVersion,
      });
      void loadData(currentUserId, true);
    },
    [currentUserId, selectedRecord, loadData],
  );

  const handleDeleteRecord = useCallback(async () => {
    if (!currentUserId || !selectedRecord) return;
    await executeSanskaraWrite(currentUserId, 'delete-record', {
      recordId: selectedRecord.id,
    });
    setSelectedRecord(null);
    void loadData(currentUserId, true);
  }, [currentUserId, selectedRecord, loadData]);

  // Dependent creation
  const handleCreateDependent = useCallback(
    async (params: { name: string; birthDate: string; kulFamilyMemberId?: string | null }) => {
      if (!currentUserId) return;
      const res = await executeSanskaraWrite(currentUserId, 'create-dependent', {
        name: params.name,
        birthDate: params.birthDate,
        kulFamilyMemberId: params.kulFamilyMemberId,
      });
      await loadData(currentUserId, true);
      if (res.id) {
        setActiveTab(res.id);
      }
    },
    [currentUserId, loadData],
  );

  // Sharing actions
  const handleGrantView = useCallback(
    async (params: { subjectId: string; recordId: string | null; granteeId: string }) => {
      if (!currentUserId) return;
      await executeSanskaraWrite(currentUserId, 'grant-view', {
        subjectId: params.subjectId,
        recordId: params.recordId,
        granteeId: params.granteeId,
      });
      const list = await fetchSanskaraAccess(currentUserId, params.subjectId);
      setAccessList(list);
    },
    [currentUserId],
  );

  const handleRevokeGrant = useCallback(
    async (grantId: string) => {
      if (!currentUserId || !activeSubjectId) return;
      await executeSanskaraWrite(currentUserId, 'revoke-grant', {
        grantId,
      });
      const list = await fetchSanskaraAccess(currentUserId, activeSubjectId);
      setAccessList(list);
    },
    [currentUserId, activeSubjectId],
  );

  // A timeline was deleted from the data sheet (or found already gone). Leave a tab that no longer exists and reload.
  const handleDataChanged = useCallback(
    (deletedId: string | null) => {
      if (deletedId) setActiveTab((tab) => (tab === deletedId ? 'me' : tab));
      if (currentUserId) void loadData(currentUserId, true);
    },
    [currentUserId, loadData],
  );

  // Handover actions
  const handleStartClaim = useCallback(
    async (subjectId: string) => {
      if (!currentUserId) throw new Error('Not authenticated');
      return executeSanskaraWrite(currentUserId, 'start-claim', { subjectId });
    },
    [currentUserId],
  );

  const handleAcceptClaim = useCallback(
    async (token: string) => {
      if (!currentUserId) throw new Error('Not authenticated');
      const res = await acceptHandoverCode(currentUserId, token);
      // Only a hand-over at 18 puts records on this timeline now; an early hand-over waits for the parent's confirmation.
      if (res.kind === 'claim') void loadData(currentUserId, true);
      return res;
    },
    [currentUserId, loadData],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <PressableSurface
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={18} color={theme.text} />
        </PressableSurface>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>संस्कार · Sanskāra</Text>
          <Text style={[styles.screenSubtitle, { color: theme.dim }]}>Sacred Life Milestones</Text>
        </View>

        <View style={styles.topActionRow}>
          <PressableSurface
            onPress={() => setShowData(true)}
            hitSlop={8}
            style={[styles.iconAction, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
            accessibilityLabel="Your Sanskāra data: download a copy or delete"
          >
            <Feather name="database" size={16} color={theme.brand} />
          </PressableSurface>
          <PressableSurface
            onPress={() => {
              setHandoverMode('accept');
              setHandoverModalVisible(true);
            }}
            hitSlop={8}
            style={[styles.iconAction, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
            accessibilityLabel="Claim code"
          >
            <Feather name="key" size={16} color={theme.brand} />
          </PressableSurface>
        </View>
      </View>

      {/* Subject Chips Row */}
      {overview ? (
        <View style={[styles.chipsContainer, { borderBottomColor: theme.borderSoft }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {/* 1. Me Chip */}
            <Pressable
              onPress={() => setActiveTab('me')}
              style={[
                styles.chip,
                {
                  backgroundColor: activeTab === 'me' ? theme.brandSoft : theme.cardSoft,
                  borderColor: activeTab === 'me' ? theme.brand : theme.borderSoft,
                },
              ]}
            >
              <Feather name="user" size={13} color={activeTab === 'me' ? theme.brand : theme.dim} />
              <Text style={[styles.chipText, { color: activeTab === 'me' ? theme.brand : theme.text }]}>
                Me
              </Text>
              <View style={[styles.chipBadge, { backgroundColor: theme.card }]}>
                <Text style={[styles.chipBadgeText, { color: theme.dim }]}>
                  {overview.timeline.records.length}
                </Text>
              </View>
            </Pressable>

            {/* 2. Dependent Chips */}
            {overview.dependents.map((dep) => {
              const isSelected = activeTab === dep.id;
              return (
                <Pressable
                  key={dep.id}
                  onPress={() => setActiveTab(dep.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.brandSoft : theme.cardSoft,
                      borderColor: isSelected ? theme.brand : theme.borderSoft,
                    },
                  ]}
                >
                  <Feather name="heart" size={13} color={isSelected ? theme.brand : theme.dim} />
                  <Text style={[styles.chipText, { color: isSelected ? theme.brand : theme.text }]}>
                    {dep.display_name}
                  </Text>
                  <View style={[styles.chipBadge, { backgroundColor: theme.card }]}>
                    <Text style={[styles.chipBadgeText, { color: theme.dim }]}>
                      {dep.records.length}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {/* 3. Add Child Action */}
            <Pressable
              onPress={() => setShowAddChild(true)}
              style={[styles.chipAction, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
            >
              <Feather name="plus" size={13} color={theme.brand} />
              <Text style={[styles.chipActionText, { color: theme.brand }]}>Child</Text>
            </Pressable>

            {/* 4. Shared with Me Chip */}
            <Pressable
              onPress={() => setActiveTab('shared')}
              style={[
                styles.chip,
                {
                  backgroundColor: activeTab === 'shared' ? theme.brandSoft : theme.cardSoft,
                  borderColor: activeTab === 'shared' ? theme.brand : theme.borderSoft,
                },
              ]}
            >
              <Feather name="users" size={13} color={activeTab === 'shared' ? theme.brand : theme.dim} />
              <Text style={[styles.chipText, { color: activeTab === 'shared' ? theme.brand : theme.text }]}>
                Shared
              </Text>
              {overview.shared.length > 0 ? (
                <View style={[styles.chipBadge, { backgroundColor: theme.brandSoft }]}>
                  <Text style={[styles.chipBadgeText, { color: theme.brand }]}>
                    {overview.shared.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
          <Text style={[styles.loadingText, { color: theme.dim }]}>Growing sacred tree...</Text>
        </View>
      ) : consentRequired ? (
        <View style={styles.centerContainer}>
          <View style={[styles.consentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="shield" size={32} color={theme.brand} />
            <Text style={[styles.consentTitle, { color: theme.text }]}>Religious-Data Consent Needed</Text>
            <Text style={[styles.consentDesc, { color: theme.dim }]}>
              The Sanskāra tracker preserves private spiritual milestones and family dates. To use this sacred sanctuary, please grant religious-data consent in your privacy settings.
            </Text>
            <PressableSurface
              onPress={() => router.push('/settings')}
              style={[styles.primaryButton, { backgroundColor: theme.brand }]}
            >
              <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>Open Privacy Settings</Text>
            </PressableSurface>
            <PressableSurface
              onPress={() => setShowData(true)}
              style={[styles.primaryButton, { backgroundColor: theme.cardSoft, borderColor: theme.border, borderWidth: 1 }]}
            >
              <Text style={[styles.primaryButtonText, { color: theme.text }]}>Download or delete my data</Text>
            </PressableSurface>
          </View>
        </View>
      ) : errorText ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={32} color={COLORS.danger} />
          <Text style={[styles.errorHeading, { color: theme.text }]}>Unable to Connect</Text>
          <Text style={[styles.errorDetail, { color: theme.dim }]}>{errorText}</Text>
          {currentUserId ? (
            <PressableSurface
              onPress={() => loadData(currentUserId, true)}
              style={[styles.primaryButton, { backgroundColor: theme.brand, marginTop: 16 }]}
            >
              <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>Try Again</Text>
            </PressableSurface>
          ) : null}
        </View>
      ) : activeSubject.kind === 'shared' ? (
        /* Shared With Me List */
        <ScrollView contentContainerStyle={styles.sharedListContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.sharedHeaderBox, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
            <Feather name="share-2" size={16} color={theme.brand} />
            <Text style={[styles.sharedHeaderText, { color: theme.dim }]}>
              Milestones shared with you by family circle members in your Kutumb.
            </Text>
          </View>

          {overview?.shared.length === 0 ? (
            <View style={styles.emptyShared}>
              <Feather name="inbox" size={36} color={theme.dim} />
              <Text style={[styles.emptySharedTitle, { color: theme.text }]}>No Shared Milestones</Text>
              <Text style={[styles.emptySharedDesc, { color: theme.dim }]}>
                When members of your Kutumb choose to share a milestone with you, it will appear here.
              </Text>
            </View>
          ) : (
            overview?.shared.map((item) => (
              <Card key={item.record_id} style={{ padding: 16, marginBottom: 12 }}>
                <View style={styles.sharedItemHeader}>
                  <View style={styles.sharedTitleCol}>
                    <Text style={[styles.sharedMilestoneTitle, { color: theme.text }]}>
                      {item.custom_title || 'Sacred Milestone'}
                    </Text>
                    <Text style={[styles.sharedByText, { color: theme.brand }]}>
                      Shared by {item.shared_by.full_name || item.shared_by.username || 'Kutumb Member'}
                      {item.subject.label ? ` · For ${item.subject.label}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.sharedStatusBadge,
                      {
                        backgroundColor: item.completed ? COLORS.sanskaraCompletedBg : theme.brandSoft,
                        borderColor: item.completed ? COLORS.success : theme.borderSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sharedStatusText,
                        { color: item.completed ? COLORS.success : theme.brand },
                      ]}
                    >
                      {item.completed ? 'Completed' : 'Planned'}
                    </Text>
                  </View>
                </View>

                {item.planned_date || item.completed_date ? (
                  <View style={styles.sharedDatesRow}>
                    {item.planned_date ? (
                      <Text style={[styles.sharedDateText, { color: theme.dim }]}>
                        Planned: {item.planned_date}
                      </Text>
                    ) : null}
                    {item.completed_date ? (
                      <Text style={[styles.sharedDateText, { color: COLORS.success }]}>
                        Completed: {item.completed_date}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      ) : (
        /* Living Tree Canvas View */
        <View style={styles.canvasContainer}>
          {activeSubject.kind === 'dependent' ? (
            <SanskaraHandoverBanner
              key={activeSubject.dependent.id}
              dependentName={activeSubject.dependent.display_name}
              stage={activeHandover}
              onStart={() => {
                setHandoverDependent(activeSubject.dependent);
                setHandoverMode('start');
                setHandoverModalVisible(true);
              }}
            />
          ) : null}
          {activeSubject.kind === 'dependent' && activeSubject.dependent.can_manage && currentUserId
            && (activeHandover.stage === 'minor' || activeHandover.stage === 'approaching') ? (
            <SanskaraManagers
              key={`managers:${currentUserId}:${activeSubject.dependent.id}`}
              userId={currentUserId}
              subjectId={activeSubject.dependent.id}
              dependentName={activeSubject.dependent.display_name}
              onSteppedDown={() => {
                setActiveTab('me');
                void loadData(currentUserId, true);
              }}
            />
          ) : null}
          {activeSubject.kind === 'dependent' && activeSubject.dependent.can_manage && currentUserId
            && (activeHandover.stage === 'minor' || activeHandover.stage === 'approaching') ? (
            <SanskaraEarlyHandover
              key={`${currentUserId}:${activeSubject.dependent.id}`}
              userId={currentUserId}
              subjectId={activeSubject.dependent.id}
              dependentName={activeSubject.dependent.display_name}
              onHandedOver={() => {
                setActiveTab('me');
                void loadData(currentUserId, true);
              }}
            />
          ) : null}
          <SanskaraTree
            subjectKey={activeSubjectId}
            records={activeRecords}
            editable={canEditCurrentTree}
            selectedId={selectedRecord?.id}
            onSelect={(rec) => setSelectedRecord(rec)}
            onAdd={(plannedDate) => {
              if (canEditCurrentTree) {
                setNewMilestoneDate(plannedDate || null);
                setShowAddMilestone(true);
              }
            }}
          />

          {/* Floating Action Buttons */}
          <View style={[styles.floatingActionRow, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {canEditCurrentTree ? (
              <PressableSurface
                onPress={() => {
                  setNewMilestoneDate(null);
                  setShowAddMilestone(true);
                }}
                style={[styles.floatingCta, { backgroundColor: theme.brand, boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light }]}
              >
                <Feather name="plus" size={16} color={theme.textOnBrand} />
                <Text style={[styles.floatingCtaText, { color: theme.textOnBrand }]}>Plant Milestone</Text>
              </PressableSurface>
            ) : null}

            {activeSubject.kind === 'dependent' && activeHandover.stage === 'open' ? (
              <PressableSurface
                onPress={() => {
                  setHandoverDependent(activeSubject.dependent);
                  setHandoverMode('start');
                  setHandoverModalVisible(true);
                }}
                style={[styles.floatingSecondaryCta, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Feather name="share-2" size={14} color={theme.brand} />
                <Text style={[styles.floatingSecondaryText, { color: theme.brand }]}>Hand over</Text>
              </PressableSurface>
            ) : null}
          </View>
        </View>
      )}

      {/* Milestone Details & Actions Sheet */}
      <SanskaraNodeSheet
        record={selectedRecord}
        subjectId={activeSubjectId}
        visible={!!selectedRecord}
        editable={canEditCurrentTree}
        isManagedChild={activeSubject.kind === 'dependent'}
        onClose={() => setSelectedRecord(null)}
        onSaveRecord={handleSaveRecord}
        onSavePrivate={handleSavePrivate}
        onSetCompletion={handleSetCompletion}
        onDeleteRecord={handleDeleteRecord}
        onOpenSharing={() => handleOpenSharing(selectedRecord?.id ?? null)}
      />

      {/* Add Child Sheet */}
      <AddChildSheet
        visible={showAddChild}
        kulFamilyMembers={kulSnapshot?.familyMembers ?? []}
        onClose={() => setShowAddChild(false)}
        onSubmit={handleCreateDependent}
      />

      {/* Sharing Sheet */}
      <SharingSheet
        visible={showSharing}
        subjectId={activeSubjectId}
        recordId={sharingRecordId}
        recordTitle={selectedRecord?.custom_title}
        kulMembers={kulSnapshot?.members ?? []}
        currentUserId={currentUserId ?? ''}
        accessList={accessList}
        loadingAccess={loadingAccess}
        onClose={() => setShowSharing(false)}
        onGrantView={handleGrantView}
        onRevokeGrant={handleRevokeGrant}
      />

      {/* Your Sanskāra data: works without religious-data consent (AGENTS 25) */}
      <SanskaraDataSheet
        visible={showData}
        userId={currentUserId}
        onClose={() => setShowData(false)}
        onChanged={handleDataChanged}
      />

      {/* Handover Modal */}
      <SanskaraHandoverModal
        visible={handoverModalVisible}
        mode={handoverMode}
        subjectId={handoverDependent?.id}
        dependentName={handoverDependent?.display_name}
        userId={currentUserId ?? undefined}
        onClose={() => setHandoverModalVisible(false)}
        onStartClaim={handleStartClaim}
        onAcceptClaim={handleAcceptClaim}
      />

      {/* Add Milestone Modal */}
      <Modal visible={showAddMilestone} transparent animationType="slide" onRequestClose={() => setShowAddMilestone(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMilestone(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handleBarContainer}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {milestoneStep !== 'list' ? (
                  <Pressable
                    onPress={() => setMilestoneStep('list')}
                    hitSlop={12}
                    style={styles.modalBackButton}
                    accessibilityLabel="Back to the milestone list"
                  >
                    <Feather name="chevron-left" size={20} color={theme.text} />
                  </Pressable>
                ) : null}
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  {milestoneStep === 'list'
                    ? 'Choose a Sacred Milestone'
                    : milestoneStep === 'detail'
                      ? selectedCatalogEntry?.nameEnglish ?? 'Sacred Milestone'
                      : 'Plant Sacred Milestone'}
                </Text>
              </View>
              <Pressable onPress={() => setShowAddMilestone(false)} hitSlop={12}>
                <Feather name="x" size={18} color={theme.text} />
              </Pressable>
            </View>

            {milestoneStep === 'list' ? (
              <ScrollView style={styles.milestoneListScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.milestoneListIntro, { color: theme.dim }]}>
                  The sixteen traditional samskaras, in order — or write your own.
                </Text>
                {SANSKARA_CATALOG.map((entry) => (
                  <PressableSurface
                    key={entry.key}
                    haptic="selection"
                    onPress={() => handleChooseCatalogEntry(entry)}
                    style={[styles.catalogRow, { borderColor: theme.borderSoft, backgroundColor: theme.cardSoft }]}
                  >
                    <View style={styles.catalogRowText}>
                      <Text style={[styles.catalogRowTitle, { color: theme.text }]}>{entry.nameTransliteration}</Text>
                      <Text style={[styles.catalogRowStage, { color: theme.dim }]} numberOfLines={1}>
                        {entry.nameEnglish} · {entry.lifeStage}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={theme.dim} />
                  </PressableSurface>
                ))}

                <PressableSurface
                  haptic="selection"
                  onPress={handleWriteOwnMilestone}
                  style={[styles.catalogRow, styles.catalogRowCustom, { borderColor: theme.border }]}
                >
                  <View style={styles.catalogRowText}>
                    <Text style={[styles.catalogRowTitle, { color: theme.brand }]}>Write your own</Text>
                    <Text style={[styles.catalogRowStage, { color: theme.dim }]}>For any other milestone, in any tradition</Text>
                  </View>
                  <Feather name="edit-3" size={16} color={theme.brand} />
                </PressableSurface>
              </ScrollView>
            ) : milestoneStep === 'detail' && selectedCatalogEntry ? (
              <ScrollView style={styles.milestoneListScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.experienceCard}>
                  <Text style={[styles.experienceSanskrit, { color: theme.text }]}>{selectedCatalogEntry.nameSanskrit}</Text>
                  <Text style={[styles.experienceTransliteration, { color: theme.dim }]}>
                    {selectedCatalogEntry.nameTransliteration} · {selectedCatalogEntry.nameEnglish}
                  </Text>

                  <View style={styles.experienceStageRow}>
                    <Feather name="clock" size={14} color={theme.brand} />
                    <Text style={[styles.experienceStageText, { color: theme.text }]}>{selectedCatalogEntry.lifeStage}</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.dim }]}>PURPOSE</Text>
                    <Text style={[styles.experienceBody, { color: theme.text }]}>{selectedCatalogEntry.purpose}</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.dim }]}>VALUES THIS CULTIVATES</Text>
                    <View style={styles.valuesRow}>
                      {selectedCatalogEntry.values.map((value) => (
                        <View key={value} style={[styles.valueChip, { backgroundColor: theme.brandSoft, borderColor: theme.borderSoft }]}>
                          <Text style={[styles.valueChipText, { color: theme.brand }]}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.reviewNotice, { borderColor: theme.borderSoft, backgroundColor: theme.cardSoft }]}>
                    <Feather
                      name={selectedCatalogEntry.reviewStatus === 'approved' ? 'check-circle' : 'info'}
                      size={13}
                      color={selectedCatalogEntry.reviewStatus === 'approved' ? theme.brand : theme.dim}
                    />
                    <Text style={[styles.reviewNoticeText, { color: theme.dim }]}>
                      {selectedCatalogEntry.reviewStatus === 'approved'
                        ? `Reviewed by ${SANSKARA_CATALOG_REVIEWED_BY} · ${SANSKARA_CATALOG_REVIEWED_DATE}. `
                        : "Not yet reviewed by Shoonaya's council. "}
                      {SANSKARA_CATALOG_SOURCE_NOTE}
                    </Text>
                  </View>

                  <PressableSurface
                    onPress={handleUseCatalogEntry}
                    style={[styles.primaryButton, { backgroundColor: theme.brand, marginTop: 4 }]}
                  >
                    <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>Use This Milestone</Text>
                  </PressableSurface>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.dim }]}>Milestone Title *</Text>
                  <TextInput
                    value={newMilestoneTitle}
                    onChangeText={setNewMilestoneTitle}
                    placeholder="e.g. Annaprashana, Upanayana, Vivaha"
                    placeholderTextColor={theme.dim}
                    maxLength={60}
                    style={[styles.textInput, { color: theme.text, backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <DatePickerField
                    label="Planned Date (Optional)"
                    value={newMilestoneDate}
                    onChangeDate={(iso) => setNewMilestoneDate(iso)}
                    placeholder="Select planned date"
                    modalTitle="Select Milestone Date"
                  />
                </View>

                <PressableSurface
                  onPress={handleCreateMilestone}
                  disabled={savingMilestone}
                  style={[styles.primaryButton, { backgroundColor: theme.brand, marginTop: 12 }]}
                >
                  {savingMilestone ? (
                    <ActivityIndicator size="small" color={theme.textOnBrand} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>Plant Milestone 🌱</Text>
                  )}
                </PressableSurface>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
  },
  screenSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginTop: 1,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  chipBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
  },
  chipAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chipActionText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    marginTop: 12,
  },
  consentCard: {
    padding: 24,
    borderRadius: RADII.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  consentTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    textAlign: 'center',
  },
  consentDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorHeading: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    marginTop: 12,
  },
  errorDetail: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  primaryButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingActionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  floatingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    minHeight: MIN_TOUCH_TARGET,
  },
  floatingCtaText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  floatingSecondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
  },
  floatingSecondaryText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  sharedListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sharedHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  sharedHeaderText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyShared: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptySharedTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 16,
  },
  emptySharedDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
  },
  sharedItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sharedTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  sharedMilestoneTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 16,
  },
  sharedByText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    marginTop: 2,
  },
  sharedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  sharedStatusText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
  sharedDatesRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: FEATURE_COLORS.sanskara.sharedDatesRowTopBorder,
  },
  sharedDateText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.deepModalScrim,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
  },
  modalBackButton: {
    marginLeft: -6,
    padding: 4,
  },
  modalTitle: {
    flexShrink: 1,
    fontFamily: FONTS.serifBold,
    fontSize: 18,
  },
  modalBody: {
    paddingHorizontal: 20,
    gap: 16,
  },
  milestoneListScroll: {
    maxHeight: 520,
  },
  milestoneListIntro: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginBottom: 2,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: MIN_TOUCH_TARGET,
  },
  catalogRowCustom: {
    marginTop: 2,
    borderStyle: 'dashed',
  },
  catalogRowText: {
    flex: 1,
  },
  catalogRowTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  catalogRowStage: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginTop: 2,
  },
  experienceCard: {
    gap: 14,
    paddingBottom: 8,
  },
  experienceSanskrit: {
    fontFamily: FONTS.serif,
    fontSize: 30,
    lineHeight: 40,
  },
  experienceTransliteration: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    marginTop: -8,
  },
  experienceStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  experienceStageText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
  },
  experienceBody: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  valuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  valueChip: {
    borderWidth: 1,
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  valueChipText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: RADII.sm,
    padding: 10,
  },
  reviewNoticeText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.sans,
  },
});
