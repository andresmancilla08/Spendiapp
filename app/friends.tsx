// app/friends.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  useFriends, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, cancelFriendRequest, removeFriend,
} from '../hooks/useFriends';
import { getUserProfile, searchUserByUserName } from '../hooks/useUserProfile';
import { UserProfile, Friendship } from '../types/friend';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import AppDialog from '../components/AppDialog';
import { Fonts } from '../config/fonts';

type Tab = 'friends' | 'requests';

type Colors = ReturnType<typeof useTheme>['colors'];
type TFunc = ReturnType<typeof useTranslation>['t'];

interface FriendsTabProps {
  friends: Friendship[];
  uid: string;
  profileCache: Record<string, UserProfile>;
  actionLoading: string | null;
  onRemove: (f: Friendship) => void;
  colors: Colors;
  t: TFunc;
}

interface RequestsTabProps {
  incoming: Friendship[];
  outgoing: Friendship[];
  uid: string;
  profileCache: Record<string, UserProfile>;
  actionLoading: string | null;
  onAccept: (f: Friendship) => Promise<void>;
  onReject: (f: Friendship) => Promise<void>;
  onCancel: (f: Friendship) => Promise<void>;
  colors: Colors;
  t: TFunc;
}

// ── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({ name, colors }: { name?: string; colors: Colors }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
    : '';
  return (
    <View style={[avatarStyles.wrap, { backgroundColor: colors.primaryLight }]}>
      {initials ? (
        <Text style={[avatarStyles.initials, { color: colors.primary }]}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={18} color={colors.primary} />
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function FriendsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const uid = user?.uid ?? '';

  const { acceptedFriends, incomingRequests, outgoingRequests, loading } = useFriends(uid);

  const [tab, setTab] = useState<Tab>('friends');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null | 'not_found'>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getUserProfile(uid).then((p) => { if (!cancelled) setMyProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [uid]);

  const [removeDialog, setRemoveDialog] = useState<{ visible: boolean; friendship: Friendship | null }>({
    visible: false, friendship: null,
  });

  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const loadingUids = useRef<Set<string>>(new Set());

  const loadProfile = useCallback(async (targetUid: string) => {
    if (loadingUids.current.has(targetUid)) return;
    loadingUids.current.add(targetUid);
    const profile = await getUserProfile(targetUid);
    if (profile) {
      setProfileCache((prev) => ({ ...prev, [targetUid]: profile }));
    }
  }, []);

  useEffect(() => {
    [...acceptedFriends, ...incomingRequests, ...outgoingRequests].forEach((f) => {
      const otherUid = f.fromId === uid ? f.toId : f.fromId;
      loadProfile(otherUid);
    });
  }, [acceptedFriends, incomingRequests, outgoingRequests, uid, loadProfile]);

  const handleSearch = async () => {
    const trimmed = searchText.trim().replace(/^@/, '');
    if (!trimmed) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const found = await searchUserByUserName(trimmed);
      setSearchResult(found ?? 'not_found');
    } catch {
      setSearchResult('not_found');
    } finally {
      setSearching(false);
    }
  };

  const getFriendshipStatus = (targetUid: string) => {
    const all = [...acceptedFriends, ...incomingRequests, ...outgoingRequests];
    return all.find((f) => f.fromId === targetUid || f.toId === targetUid) ?? null;
  };

  const handleSendRequest = async (target: UserProfile) => {
    if (!myProfile) return;
    setActionLoading(target.uid);
    try {
      await sendFriendRequest(uid, target.uid, {
        userName: myProfile.userName,
        displayName: myProfile.displayName,
      });
      showToast(t('friends.toasts.requestSent', { userName: target.userName }), 'success');
      setSearchResult(null);
      setSearchText('');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (f: Friendship) => {
    if (!myProfile) return;
    setActionLoading(f.id);
    try {
      await acceptFriendRequest(f.id, uid, {
        userName: myProfile.userName,
        displayName: myProfile.displayName,
      }, f.fromId);
      showToast(t('friends.toasts.accepted'), 'success');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (f: Friendship) => {
    setActionLoading(f.id);
    try {
      await rejectFriendRequest(f.id);
      showToast(t('friends.toasts.rejected'), 'info');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (f: Friendship) => {
    setActionLoading(f.id);
    try {
      await cancelFriendRequest(f.id);
      showToast(t('friends.toasts.requestCancelled'), 'info');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async () => {
    if (!removeDialog.friendship) return;
    setActionLoading(removeDialog.friendship.id);
    setRemoveDialog({ visible: false, friendship: null });
    try {
      await removeFriend(removeDialog.friendship.id);
      showToast(t('friends.toasts.removed'), 'success');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const requestBadge = incomingRequests.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppHeader showBack showNotifications={false} />
        <PageTitle title={t('friends.title')} description={t('friends.pageDesc')} />

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(['friends', 'requests'] as Tab[]).map((t_) => {
            const isActive = tab === t_;
            return (
              <TouchableOpacity
                key={t_}
                style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
                onPress={() => setTab(t_)}
                activeOpacity={0.8}
              >
                <View style={styles.tabLabelRow}>
                  <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                    {t_ === 'friends' ? t('friends.tabs.friends') : t('friends.tabs.requests')}
                  </Text>
                  {t_ === 'requests' && requestBadge > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
                      <Text style={styles.tabBadgeText}>{requestBadge}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Search bar */}
          <View style={[styles.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('friends.search.placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={(v) => { const s = v.replace(/^@/, ''); setSearchText(s); if (!s.trim()) setSearchResult(null); }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <TouchableOpacity
                onPress={handleSearch}
                activeOpacity={0.7}
                style={[styles.searchBtnWrap, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.searchBtnText}>{t('friends.search.button')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search result */}
          {searchResult && (
            <View style={[styles.searchResultCard, { backgroundColor: colors.surface }]}>
              {searchResult === 'not_found' ? (
                <View style={styles.notFoundRow}>
                  <View style={[styles.notFoundIconWrap, { backgroundColor: colors.errorLight }]}>
                    <Ionicons name="person-remove-outline" size={18} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>
                      {t('friends.search.notFound', { userName: searchText.trim() })}
                    </Text>
                    <Text style={[styles.notFoundSub, { color: colors.textTertiary }]}>
                      {t('friends.search.notFoundSub')}
                    </Text>
                  </View>
                </View>
              ) : searchResult.uid === uid ? null : (() => {
                const existing = getFriendshipStatus(searchResult.uid);
                const isAccepted = existing?.status === 'accepted';
                const isPending = existing?.status === 'pending';
                const iSent = isPending && existing?.fromId === uid;
                return (
                  <View style={styles.profileRow}>
                    <Avatar name={searchResult.displayName} colors={colors} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendName, { color: colors.textPrimary }]}>{searchResult.displayName}</Text>
                      <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{searchResult.userName}</Text>
                    </View>
                    {isAccepted ? (
                      <View style={[styles.statusChip, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.statusChipText, { color: colors.success }]}>{t('friends.search.alreadyFriends')}</Text>
                      </View>
                    ) : iSent ? (
                      <View style={[styles.statusChip, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.statusChipText, { color: colors.textSecondary }]}>{t('friends.search.youSent')}</Text>
                      </View>
                    ) : isPending ? (
                      <View style={[styles.statusChip, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.statusChipText, { color: colors.textSecondary }]}>{t('friends.search.requestPending')}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleSendRequest(searchResult as UserProfile)}
                        activeOpacity={0.8}
                        disabled={actionLoading === searchResult.uid}
                      >
                        {actionLoading === searchResult.uid
                          ? <ActivityIndicator size="small" color="#fff" />
                          : (
                            <View style={styles.addBtnInner}>
                              <Ionicons name="person-add-outline" size={14} color="#fff" />
                              <Text style={styles.addBtnText}>{t('friends.search.sendRequest')}</Text>
                            </View>
                          )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Tab content */}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : tab === 'friends' ? (
            <FriendsTab
              friends={acceptedFriends}
              uid={uid}
              profileCache={profileCache}
              actionLoading={actionLoading}
              onRemove={(f) => setRemoveDialog({ visible: true, friendship: f })}
              colors={colors}
              t={t}
            />
          ) : (
            <RequestsTab
              incoming={incomingRequests}
              outgoing={outgoingRequests}
              uid={uid}
              profileCache={profileCache}
              actionLoading={actionLoading}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel}
              colors={colors}
              t={t}
            />
          )}
        </ScrollView>

        <AppDialog
          visible={removeDialog.visible}
          type="warning"
          title={t('friends.remove.dialogTitle')}
          description={
            removeDialog.friendship
              ? `${t('friends.remove.dialogDescBefore')}@${
                  profileCache[
                    removeDialog.friendship.fromId === uid
                      ? removeDialog.friendship.toId
                      : removeDialog.friendship.fromId
                  ]?.userName ?? '...'
                }${t('friends.remove.dialogDescAfter')}`
              : ''
          }
          primaryLabel={t('friends.remove.confirm')}
          secondaryLabel={t('common.cancel')}
          onPrimary={handleRemoveFriend}
          onSecondary={() => setRemoveDialog({ visible: false, friendship: null })}
        />
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FriendsTab({ friends, uid, profileCache, actionLoading, onRemove, colors, t }: FriendsTabProps) {
  if (friends.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('friends.list.empty')}</Text>
        <Text style={[styles.emptySub, { color: colors.textTertiary }]}>{t('friends.list.emptySub')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
      {friends.map((f: Friendship, i: number) => {
        const otherUid = f.fromId === uid ? f.toId : f.fromId;
        const profile = profileCache[otherUid];
        return (
          <View
            key={f.id}
            style={[
              styles.friendRow,
              i < friends.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <Avatar name={profile?.displayName} colors={colors} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.friendName, { color: colors.textPrimary }]}>
                {profile?.displayName ?? '...'}
              </Text>
              <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>
                @{profile?.userName ?? '...'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onRemove(f)}
              activeOpacity={0.7}
              disabled={actionLoading === f.id}
              style={[styles.removeBtn, { backgroundColor: colors.errorLight }]}
            >
              {actionLoading === f.id
                ? <ActivityIndicator size="small" color={colors.error} />
                : <Ionicons name="person-remove-outline" size={16} color={colors.error} />}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

function RequestsTab({ incoming, outgoing, uid, profileCache, actionLoading, onAccept, onReject, onCancel, colors, t }: RequestsTabProps) {
  return (
    <>
      {/* Incoming */}
      <View style={styles.sectionLabelRow}>
        <View style={[styles.sectionLabelDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('friends.requests.incoming')}</Text>
      </View>
      {incoming.length === 0 ? (
        <View style={[styles.inlineEmpty, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.inlineEmptyText, { color: colors.textTertiary }]}>{t('friends.requests.noIncoming')}</Text>
        </View>
      ) : (
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {incoming.map((f: Friendship, i: number) => {
            const profile = profileCache[f.fromId];
            return (
              <View
                key={f.id}
                style={[
                  styles.friendRow,
                  i < incoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Avatar name={profile?.displayName} colors={colors} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.textPrimary }]}>{profile?.displayName ?? '...'}</Text>
                  <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{profile?.userName ?? '...'}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: colors.error + '60', backgroundColor: colors.errorLight }]}
                    onPress={() => onReject(f)}
                    activeOpacity={0.8}
                    disabled={!!actionLoading}
                  >
                    <Ionicons name="close-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => onAccept(f)}
                    activeOpacity={0.8}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === f.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : (
                        <View style={styles.addBtnInner}>
                          <Ionicons name="checkmark-outline" size={14} color="#fff" />
                          <Text style={styles.acceptBtnText}>{t('friends.requests.accept')}</Text>
                        </View>
                      )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Outgoing */}
      <View style={[styles.sectionLabelRow, { marginTop: 20 }]}>
        <View style={[styles.sectionLabelDot, { backgroundColor: colors.textTertiary }]} />
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('friends.requests.outgoing')}</Text>
      </View>
      {outgoing.length === 0 ? (
        <View style={[styles.inlineEmpty, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.inlineEmptyText, { color: colors.textTertiary }]}>{t('friends.requests.noOutgoing')}</Text>
        </View>
      ) : (
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {outgoing.map((f: Friendship, i: number) => {
            const profile = profileCache[f.toId];
            return (
              <View
                key={f.id}
                style={[
                  styles.friendRow,
                  i < outgoing.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Avatar name={profile?.displayName} colors={colors} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.textPrimary }]}>{profile?.displayName ?? '...'}</Text>
                  <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{profile?.userName ?? '...'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => onCancel(f)}
                  activeOpacity={0.8}
                  disabled={!!actionLoading}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('friends.requests.cancel')}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'web' ? 120 : 40 },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontSize: 14, fontFamily: Fonts.semiBold },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontFamily: Fonts.bold },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, padding: 0 },
  searchBtnWrap: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontFamily: Fonts.semiBold },

  // Search result card
  searchResultCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  notFoundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  notFoundIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notFoundText: { fontSize: 14, fontFamily: Fonts.medium },
  notFoundSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },

  // Friend info
  friendName: { fontSize: 14, fontFamily: Fonts.semiBold },
  friendUserName: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },

  // Status chips
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusChipText: { fontSize: 12, fontFamily: Fonts.semiBold },

  // Add / action buttons
  addBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.semiBold },

  // Empty states
  emptyState: { alignItems: 'center', paddingTop: 72, gap: 12 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.semiBold, textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 19 },

  // Inline empty (requests tab)
  inlineEmpty: {
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4,
  },
  inlineEmptyText: { fontSize: 13, fontFamily: Fonts.regular },

  // List card
  listCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },

  // Remove button (icon only, rounded)
  removeBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  // Request action buttons
  requestActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  acceptBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.semiBold },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  cancelBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },

  // Section labels (requests tab)
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabelDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.5 },
});
