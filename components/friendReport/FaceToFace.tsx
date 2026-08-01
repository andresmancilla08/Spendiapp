/**
 * Bloque "Cara a cara": la pareja como sujeto del reporte.
 *
 * Es el mismo lenguaje que dibuja el documento (`utils/generateFriendReportImage`):
 * dos identidades con color propio, una balanza que se inclina hacia quien pesa
 * más, el veredicto como tipografía dominante y los movimientos repartidos a cada
 * lado de un eje. Los dos leen del mismo modelo, así que no pueden contradecirse.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { accentInk } from '../../utils/contrast';
import { initialOf, scaleTilt, type FriendReportModel, type FriendReportEntry } from '../../utils/friendReportModel';

/** Identidad de cada lado. En claro se oscurecen para poder usarlas como texto. */
export function sideColors(isDark: boolean) {
  return {
    mine: isDark ? '#00BCD4' : '#00838F',
    theirs: isDark ? '#C0CA33' : '#7E8600',
    mineFill: isDark ? '#00BCD4' : '#00ACC1',
    theirsFill: isDark ? '#C0CA33' : '#C0CA33',
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    .format(Math.abs(n));

// ── Balanza ────────────────────────────────────────────────────────────────

export function Scale({ tilt, width = 120, isDark }: { tilt: number; width?: number; isDark: boolean }) {
  const c = sideColors(isDark);
  const { colors } = useTheme();
  const half = width / 2 - 6;
  const angle = Math.max(-0.34, Math.min(0.34, tilt * 0.42));
  const dy = Math.tan(angle) * half;
  const cx = width / 2;
  const cy = 22;

  return (
    <Svg width={width} height={52}>
      {/* mástil y base */}
      <Line x1={cx} y1={cy} x2={cx} y2={cy + 18} stroke={colors.textTertiary} strokeWidth={2} opacity={0.55} />
      <Path
        d={`M${cx - 8} ${cy + 22} L${cx + 8} ${cy + 22} L${cx + 3.5} ${cy + 17} L${cx - 3.5} ${cy + 17} Z`}
        fill={colors.textTertiary}
        opacity={0.45}
      />
      {/* viga, mitad de cada color */}
      <Line x1={cx - half} y1={cy - dy} x2={cx} y2={cy} stroke={c.mineFill} strokeWidth={3} strokeLinecap="round" />
      <Line x1={cx} y1={cy} x2={cx + half} y2={cy + dy} stroke={c.theirsFill} strokeWidth={3} strokeLinecap="round" />
      {/* platillos */}
      <Path d={`M${cx - half - 8} ${cy - dy + 5} a8 8 0 0 0 16 0`} stroke={c.mineFill} strokeWidth={2.4} fill="none" />
      <Path d={`M${cx + half - 8} ${cy + dy + 5} a8 8 0 0 0 16 0`} stroke={c.theirsFill} strokeWidth={2.4} fill="none" />
    </Svg>
  );
}

// ── Cabecera de personas ───────────────────────────────────────────────────

export function People({
  model, isDark, tiltLabel, youLabel,
}: { model: FriendReportModel; isDark: boolean; tiltLabel: string; youLabel: string }) {
  const { colors } = useTheme();
  const c = sideColors(isDark);
  const avatar = (letter: string, fill: string, onFill: string) => (
    <View style={[styles.avatar, { backgroundColor: fill }]}>
      <Text style={[styles.avatarText, { color: onFill }]}>{letter}</Text>
    </View>
  );

  return (
    <View style={styles.peopleRow}>
      <View style={styles.person}>
        {avatar(initialOf(model.myName), c.mineFill, isDark ? '#04252B' : '#FFFFFF')}
        <Text style={[styles.personName, { color: colors.textPrimary }]} numberOfLines={1}>
          {model.myName.split(' ')[0]}
        </Text>
        <Text style={[styles.personMeta, { color: colors.textTertiary }]}>{youLabel}</Text>
      </View>

      <View style={styles.scaleСol}>
        <Scale tilt={scaleTilt(model.totals)} isDark={isDark} />
        <Text style={[styles.tiltLabel, { color: colors.textTertiary }]} numberOfLines={2}>
          {tiltLabel.toUpperCase()}
        </Text>
      </View>

      <View style={styles.person}>
        {avatar(initialOf(model.friendName), c.theirsFill, '#1E2200')}
        <Text style={[styles.personName, { color: colors.textPrimary }]} numberOfLines={1}>
          {model.friendName}
        </Text>
        {!!model.friendUserName && (
          <Text style={[styles.personMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            @{model.friendUserName}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Veredicto ──────────────────────────────────────────────────────────────

export function Verdict({
  model, isDark, kicker, verdict, hint,
}: { model: FriendReportModel; isDark: boolean; kicker: string; verdict: string; hint?: string }) {
  const { colors } = useTheme();
  const c = sideColors(isDark);
  const color = model.net === 0 ? colors.textPrimary : model.net > 0 ? c.mine : c.theirs;
  const amount = fmt(model.net);
  // adjustsFontSizeToFit no existe en web: la cifra se escala por longitud.
  const size = amount.length <= 10 ? 40 : amount.length <= 13 ? 34 : 29;

  return (
    <View style={styles.verdict}>
      <Text style={[styles.verdictKicker, { color: colors.textTertiary }]}>{kicker.toUpperCase()}</Text>
      <Text style={[styles.verdictTitle, { color: colors.textPrimary }]} numberOfLines={2}>{verdict}</Text>
      <Text style={[styles.verdictAmount, { color, fontSize: size, lineHeight: Math.round(size * 1.12) }]} numberOfLines={1}>
        {amount}
      </Text>
      {!!hint && <Text style={[styles.verdictHint, { color: colors.textSecondary }]}>{hint}</Text>}
    </View>
  );
}

// ── Barras enfrentadas ─────────────────────────────────────────────────────

export function FacingBar({
  title, mine, theirs, isDark,
}: { title: string; mine: number; theirs: number; isDark: boolean }) {
  const { colors } = useTheme();
  const c = sideColors(isDark);
  const max = Math.max(mine, theirs, 1);
  const minePct = (mine / max) * 100;
  const theirsPct = (theirs / max) * 100;

  return (
    <View style={styles.facing}>
      <Text style={[styles.facingTitle, { color: colors.textTertiary }]}>{title.toUpperCase()}</Text>
      <View style={styles.facingRow}>
        <Text style={[styles.facingValue, { color: colors.textPrimary }]} numberOfLines={1}>{fmt(mine)}</Text>
        <View style={styles.facingTracks}>
          <View style={[styles.track, styles.trackLeft, { backgroundColor: colors.border }]}>
            <View style={[styles.fill, { width: `${minePct}%`, backgroundColor: c.mineFill }]} />
          </View>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View style={[styles.fillLeft, { width: `${theirsPct}%`, backgroundColor: c.theirsFill }]} />
          </View>
        </View>
        <Text style={[styles.facingValue, styles.facingValueRight, { color: colors.textPrimary }]} numberOfLines={1}>
          {fmt(theirs)}
        </Text>
      </View>
    </View>
  );
}

// ── Movimientos a cada lado del eje ────────────────────────────────────────

export function EntryRow({
  entry, isDark, sentLabel, receivedLabel, dateLabel,
}: { entry: FriendReportEntry; isDark: boolean; sentLabel: string; receivedLabel: string; dateLabel: string }) {
  const { colors } = useTheme();
  const c = sideColors(isDark);
  const isMine = entry.side === 'me';
  const color = isMine ? c.mine : c.theirs;
  const dot = isMine ? c.mineFill : c.theirsFill;
  const badge = entry.percentage != null
    ? `${entry.percentage}%`
    : entry.kind === 'sent' ? sentLabel : entry.kind === 'received' ? receivedLabel : '';

  const cell = (
    <View style={[styles.entryCell, isMine ? styles.entryCellLeft : styles.entryCellRight]}>
      <View style={[styles.entryTop, !isMine && styles.rowReverse]}>
        <Text style={[styles.entryDesc, { color: colors.textPrimary }, !isMine && styles.textRight]} numberOfLines={1}>
          {entry.description}
        </Text>
        <Text style={[styles.entryAmount, { color: colors.textPrimary }]}>{fmt(entry.amount)}</Text>
      </View>
      <View style={[styles.entryMeta, !isMine && styles.rowReverse]}>
        <Text style={[styles.entryDate, { color: colors.textTertiary }]}>{dateLabel}</Text>
        {!!badge && (
          <View style={[styles.entryBadge, { backgroundColor: `${dot}22` }]}>
            <Text style={[styles.entryBadgeText, { color }]}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.entryRow}>
      {isMine ? cell : <View style={styles.entryCell} />}
      <View style={styles.axisSlot}>
        <View style={[styles.axisLine, { backgroundColor: colors.border }]} />
        <View style={[styles.axisDot, { backgroundColor: dot, borderColor: colors.surface }]} />
      </View>
      {isMine ? <View style={styles.entryCell} /> : cell}
    </View>
  );
}

/** Leyenda de los dos colores, para que nadie tenga que adivinar de quién es cada uno. */
export function Legend({ mineLabel, theirsLabel, isDark }: { mineLabel: string; theirsLabel: string; isDark: boolean }) {
  const { colors } = useTheme();
  const c = sideColors(isDark);
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendChip, { backgroundColor: c.mineFill }]} />
        <Text style={[styles.legendText, { color: colors.textSecondary }]}>{mineLabel.toUpperCase()}</Text>
      </View>
      <View style={styles.legendItem}>
        <Text style={[styles.legendText, { color: colors.textSecondary }]}>{theirsLabel.toUpperCase()}</Text>
        <View style={[styles.legendChip, { backgroundColor: c.theirsFill }]} />
      </View>
    </View>
  );
}

export function SocialStat({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.social, { backgroundColor: colors.surfaceElevated ?? colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.socialText, { color: accentInk(colors, 'primary', colors.surface) }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  peopleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  person: { width: 92, alignItems: 'center' },
  scaleСol: { flex: 1, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontFamily: Fonts.extraBold },
  personName: { fontSize: 13, fontFamily: Fonts.bold, marginTop: 8, textAlign: 'center' },
  personMeta: { fontSize: 10.5, fontFamily: Fonts.regular, marginTop: 2 },
  tiltLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.2, textAlign: 'center', marginTop: 2 },

  verdict: { alignItems: 'center', marginTop: 18 },
  verdictKicker: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.6 },
  verdictTitle: { fontSize: 15, fontFamily: Fonts.bold, marginTop: 7, textAlign: 'center' },
  verdictAmount: { fontFamily: Fonts.extraBold, letterSpacing: -1.4, marginTop: 6, fontVariant: ['tabular-nums'] },
  verdictHint: { fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 4, textAlign: 'center' },

  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendChip: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.1 },

  facing: { marginTop: 14 },
  facingTitle: { fontSize: 8.5, fontFamily: Fonts.bold, letterSpacing: 1.2, textAlign: 'center' },
  facingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  facingValue: { width: 88, fontSize: 11.5, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'] },
  facingValueRight: { textAlign: 'right' },
  facingTracks: { flex: 1, flexDirection: 'row', gap: 6 },
  track: { flex: 1, height: 9, borderRadius: 5, overflow: 'hidden' },
  trackLeft: { alignItems: 'flex-end' },
  fill: { height: 9, borderRadius: 5 },
  fillLeft: { height: 9, borderRadius: 5 },

  entryRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 44 },
  entryCell: { flex: 1, minWidth: 0, paddingVertical: 5 },
  entryCellLeft: { paddingRight: 10 },
  entryCellRight: { paddingLeft: 10 },
  entryTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowReverse: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  entryDesc: { flex: 1, minWidth: 0, fontSize: 12.5, fontFamily: Fonts.semiBold },
  entryAmount: { fontSize: 12.5, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'] },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  entryDate: { fontSize: 10, fontFamily: Fonts.regular },
  entryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  entryBadgeText: { fontSize: 9, fontFamily: Fonts.bold },

  axisSlot: { width: 18, alignItems: 'center' },
  axisLine: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  axisDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, marginTop: 12 },

  social: { borderRadius: 50, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'center', marginTop: 16 },
  socialText: { fontSize: 12, fontFamily: Fonts.bold, textAlign: 'center' },
});
