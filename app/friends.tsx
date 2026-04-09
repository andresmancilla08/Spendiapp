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

  // Estado para perfil propio (necesario para crear solicitudes)
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getUserProfile(uid).then((p) => { if (!cancelled) setMyProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [uid]);

  // Dialog eliminar amigo
  const [removeDialog, setRemoveDialog] = useState<{ visible: boolean; friendship: Friendship | null }>({
    visible: false, friendship: null,
  });

  // Cache de perfiles para mostrar datos de amigos
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

  // Cargar perfiles de amigos y solicitudes cuando cambian las listas
  useEffect(() => {
    [...acceptedFriends, ...incomingRequests, ...outgoingRequests].forEach((f) => {
      const otherUid = f.fromId === uid ? f.toId : f.fromId;
      loadProfile(otherUid);
    });
  }, [acceptedFriends, incomingRequests, outgoingRequests, uid, loadProfile]);

  const handleSearch = async () => {
    const trimmed = searchText.trim();
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

  const requestBadge = incomingRequests.length > 0 ? ` (${incomingRequests.length})` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppHeader showBack showNotifications={false} />

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(['friends', 'requests'] as Tab[]).map((t_) => (
            <TouchableOpacity
              key={t_}
              style={[styles.tab, tab === t_ && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t_)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === t_ ? colors.primary : colors.textSecondary }]}>
                {t_ === 'friends'
                  ? t('friends.tabs.friends')
                  : `${t('friends.tabs.requests')}${requestBadge}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Buscador */}
          <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('friends.search.placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : (
                <TouchableOpacity onPress={handleSearch} activeOpacity={0.7}>
                  <Text style={[styles.searchBtn, { color: colors.primary }]}>{t('friends.search.button')}</Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Resultado de búsqueda */}
          {searchResult && (
            <View style={[styles.searchResultCard, { backgroundColor: colors.surface }]}>
              {searchResult === 'not_found' ? (
                <View style={styles.notFoundRow}>
                  <Ionicons name="person-remove-outline" size={20} color={colors.textTertiary} />
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
                    <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendName, { color: colors.textPrimary }]}>{searchResult.displayName}</Text>
                      <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{searchResult.userName}</Text>
                    </View>
                    {isAccepted ? (
                      <Text style={[styles.statusChip, { color: colors.success }]}>{t('friends.search.alreadyFriends')}</Text>
                    ) : iSent ? (
                      <Text style={[styles.statusChip, { color: colors.textTertiary }]}>{t('friends.search.youSent')}</Text>
                    ) : isPending ? (
                      <Text style={[styles.statusChip, { color: colors.textTertiary }]}>{t('friends.search.requestPending')}</Text>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleSendRequest(searchResult as UserProfile)}
                        activeOpacity={0.8}
                        disabled={actionLoading === searchResult.uid}
                      >
                        {actionLoading === searchResult.uid
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.addBtnText}>{t('friends.search.sendRequest')}</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Contenido según tab */}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
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

        {/* Dialog eliminar amigo */}
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

// ── Sub-componentes ─────────────────────────────────────────────────────────

function FriendsTab({ friends, uid, profileCache, actionLoading, onRemove, colors, t }: FriendsTabProps) {
  if (friends.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t('friends.list.empty')}</Text>
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
            <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
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
              style={styles.removeBtn}
            >
              <Ionicons name="person-remove-outline" size={18} color={colors.error} />
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
      {/* Entrantes */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('friends.requests.incoming')}</Text>
      {incoming.length === 0 ? (
        <Text style={[styles.emptyInline, { color: colors.textTertiary }]}>{t('friends.requests.noIncoming')}</Text>
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
                <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.textPrimary }]}>{profile?.displayName ?? '...'}</Text>
                  <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{profile?.userName ?? '...'}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: colors.error }]}
                    onPress={() => onReject(f)}
                    activeOpacity={0.8}
                    disabled={!!actionLoading}
                  >
                    <Text style={[styles.rejectBtnText, { color: colors.error }]}>{t('friends.requests.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => onAccept(f)}
                    activeOpacity={0.8}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === f.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.acceptBtnText}>{t('friends.requests.accept')}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Enviadas */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 16 }]}>{t('friends.requests.outgoing')}</Text>
      {outgoing.length === 0 ? (
        <Text style={[styles.emptyInline, { color: colors.textTertiary }]}>{t('friends.requests.noOutgoing')}</Text>
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
                <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.textPrimary }]}>{profile?.displayName ?? '...'}</Text>
                  <Text style={[styles.friendUserName, { color: colors.textTertiary }]}> @{profile?.userName ?? '...'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
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

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'web' ? 120 : 40 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: Fonts.semiBold },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, padding: 0 },
  searchBtn: { fontSize: 14, fontFamily: Fonts.semiBold },
  searchResultCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  notFoundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  notFoundText: { fontSize: 14, fontFamily: Fonts.medium },
  notFoundSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  friendName: { fontSize: 14, fontFamily: Fonts.medium },
  friendUserName: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  statusChip: { fontSize: 12, fontFamily: Fonts.medium },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 13, fontFamily: Fonts.semiBold },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: Fonts.semiBold, textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  listCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  removeBtn: { padding: 6 },
  requestActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  acceptBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.semiBold },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5 },
  cancelBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, marginBottom: 8, marginLeft: 2 },
  emptyInline: { fontSize: 13, fontFamily: Fonts.regular, marginBottom: 8, marginLeft: 2 },
});
