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
import { sideColors } from '../../utils/friendReportColors';
import { formatMoneyAbs } from '../../utils/formatMoney';
import { initialOf, scaleTilt, type FriendReportModel, type FriendReportEntry } from '../../utils/friendReportModel';

const fmt = formatMoneyAbs;

// ── Balanza ────────────────────────────────────────────────────────────────

export function Scale({ tilt, width = 120 }: { tilt: number; width?: number }) {
  // El SVG se declara con viewBox y ancho 100%: en el eje transversal de una
  // columna flex el ancho fijo no encoge, y a 320px se salía 37px por cada lado.
  const { colors } = useTheme();
  const c = sideColors(colors);
  const half = width / 2 - 6;
  const angle = Math.max(-0.34, Math.min(0.34, tilt * 0.42));
  const dy = Math.tan(angle) * half;
  const cx = width / 2;
  const cy = 22;

  // Los platillos CUELGAN de los extremos por un tirante vertical y son cuencos
  // rellenos: los semicírculos sueltos de antes se leían como dos ganchos y nadie
  // reconocía la balanza.
  const panY = (yEnd: number) => yEnd + 11;
  const pan = (px: number, yEnd: number, color: string) => (
    <>
      <Line x1={px} y1={yEnd} x2={px} y2={panY(yEnd) - 1} stroke={color} strokeWidth={1.5} opacity={0.9} />
      <Path
        d={`M${px - 9} ${panY(yEnd)} a9 9 0 0 0 18 0 Z`}
        fill={color}
        opacity={0.92}
      />
    </>
  );

  return (
    <Svg width="100%" height={56} viewBox={`0 0 ${width} 56`} preserveAspectRatio="xMidYMid meet">
      {/* columna y base */}
      <Line x1={cx} y1={cy + 1} x2={cx} y2={cy + 20} stroke={colors.textTertiary} strokeWidth={2.5} opacity={0.5} />
      <Path
        d={`M${cx - 11} ${cy + 26} L${cx + 11} ${cy + 26} L${cx + 4} ${cy + 19} L${cx - 4} ${cy + 19} Z`}
        fill={colors.textTertiary}
        opacity={0.45}
      />
      {/* viga, mitad de cada color, con el fulcro marcado */}
      <Line x1={cx - half} y1={cy - dy} x2={cx} y2={cy} stroke={c.mineFill} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={cx} y1={cy} x2={cx + half} y2={cy + dy} stroke={c.theirsFill} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={3.2} fill={colors.textTertiary} opacity={0.8} />
      {pan(cx - half, cy - dy, c.mineFill)}
      {pan(cx + half, cy + dy, c.theirsFill)}
    </Svg>
  );
}

// ── Cabecera de personas ───────────────────────────────────────────────────

export function People({
  model, tiltLabel, youLabel,
}: { model: FriendReportModel; tiltLabel: string; youLabel: string }) {
  const { colors } = useTheme();
  const c = sideColors(colors);
  const avatar = (letter: string, fill: string, onFill: string) => (
    <View style={[styles.avatar, { backgroundColor: fill }]}>
      <Text style={[styles.avatarText, { color: onFill }]}>{letter}</Text>
    </View>
  );

  return (
    <View style={styles.peopleRow}>
      <View style={styles.person}>
        {avatar(initialOf(model.myName), c.mineFill, c.onMine)}
        <Text style={[styles.personName, { color: colors.textPrimary }]} numberOfLines={1}>
          {model.myName.split(' ')[0]}
        </Text>
        <Text style={[styles.personMeta, { color: colors.textTertiary }]}>{youLabel}</Text>
      </View>

      <View style={styles.scaleCol}>
        <Scale tilt={scaleTilt(model.totals)} />
        <Text style={[styles.tiltLabel, { color: colors.textTertiary }]} numberOfLines={2}>
          {tiltLabel.toUpperCase()}
        </Text>
      </View>

      <View style={styles.person}>
        {avatar(initialOf(model.friendName), c.theirsFill, c.onTheirs)}
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
  model, kicker, verdict, hint,
}: { model: FriendReportModel; kicker: string; verdict: string; hint?: string }) {
  const { colors } = useTheme();
  const c = sideColors(colors);
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
  title, mine, theirs,
}: { title: string; mine: number; theirs: number }) {
  const { colors } = useTheme();
  const c = sideColors(colors);
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
            <View style={[styles.fill, { width: `${theirsPct}%`, backgroundColor: c.theirsFill }]} />
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
  entry, sentLabel, receivedLabel, dateLabel, sideLabel,
}: {
  entry: FriendReportEntry; sentLabel: string; receivedLabel: string;
  dateLabel: string; sideLabel: string;
}) {
  const { colors } = useTheme();
  const c = sideColors(colors);
  const isMine = entry.side === 'me';
  const color = isMine ? c.mine : c.theirs;
  const dot = isMine ? c.mineFill : c.theirsFill;
  const badge = entry.percentage != null
    ? `${entry.percentage}%`
    : entry.kind === 'sent' ? sentLabel : entry.kind === 'received' ? receivedLabel : '';

  // La descripción ocupa su propia línea: compartiéndola con el importe le
  // quedaban 33px a 320px de pantalla, o sea cuatro caracteres y puntos suspensivos.
  const cell = (
    <View style={[styles.entryCell, isMine ? styles.entryCellLeft : styles.entryCellRight]}>
      <Text
        style={[styles.entryDesc, { color: colors.textPrimary }, !isMine && styles.textRight]}
        numberOfLines={1}
      >
        {entry.description}
      </Text>
      <View style={[styles.entryMeta, !isMine && styles.rowReverse]}>
        <Text style={[styles.entryAmount, { color: colors.textPrimary }]} numberOfLines={1}>
          {fmt(entry.amount)}
        </Text>
        <Text style={[styles.entryDate, { color: colors.textTertiary }]} numberOfLines={1}>{dateLabel}</Text>
        {!!badge && (
          <View style={[styles.entryBadge, { backgroundColor: `${dot}22` }]}>
            <Text style={[styles.entryBadgeText, { color }]}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View
      style={styles.entryRow}
      accessible
      accessibilityLabel={`${entry.description}, ${fmt(entry.amount)}, ${dateLabel}, ${sideLabel}`}
    >
      {/* Mitades exactas: con `flex: 1` la celda cedía al ancho de su contenido y
          el punto de cada fila caía en un sitio distinto — el eje se veía torcido. */}
      <View style={styles.entryHalf}>{isMine ? cell : null}</View>
      <View style={styles.entryHalf}>{isMine ? null : cell}</View>
      <View style={styles.axisDotWrap} pointerEvents="none">
        <View style={[styles.axisDot, { backgroundColor: dot, borderColor: colors.surface }]} />
      </View>
    </View>
  );
}

/** Leyenda de los dos colores, para que nadie tenga que adivinar de quién es cada uno. */
export function Legend({ mineLabel, theirsLabel }: { mineLabel: string; theirsLabel: string }) {
  const { colors } = useTheme();
  const c = sideColors(colors);
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
  person: { flex: 1, minWidth: 72, maxWidth: 112, alignItems: 'center' },
  scaleCol: { flex: 1.1, minWidth: 84, alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontFamily: Fonts.extraBold },
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
  facingValue: { flexShrink: 1, minWidth: 62, fontSize: 11.5, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'] },
  facingValueRight: { textAlign: 'right' },
  facingTracks: { flex: 1, minWidth: 72, flexDirection: 'row', gap: 6 },
  track: { flex: 1, height: 9, borderRadius: 5, overflow: 'hidden' },
  trackLeft: { alignItems: 'flex-end' },
  fill: { height: 9, borderRadius: 5 },

  entryRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 44, position: 'relative' },
  entryHalf: { width: '50%', minWidth: 0 },
  entryCell: { minWidth: 0, paddingVertical: 5 },
  entryCellLeft: { paddingRight: 16 },
  entryCellRight: { paddingLeft: 16 },
  rowReverse: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  entryDesc: { fontSize: 12.5, fontFamily: Fonts.semiBold },
  entryAmount: { fontSize: 12.5, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'], flexShrink: 1 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  entryDate: { fontSize: 10, fontFamily: Fonts.regular },
  entryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  entryBadgeText: { fontSize: 9, fontFamily: Fonts.bold },

  axisDotWrap: { position: 'absolute', left: 0, right: 0, top: 12, alignItems: 'center' },
  axisDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, marginTop: 12 },

  social: { borderRadius: 50, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'center', marginTop: 16 },
  socialText: { fontSize: 12, fontFamily: Fonts.bold, textAlign: 'center' },
});
