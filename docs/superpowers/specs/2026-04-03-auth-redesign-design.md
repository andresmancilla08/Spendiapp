# Auth Screens Redesign — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** `app/(auth)/login.tsx`, `app/(auth)/login-email.tsx`, `app/(auth)/register.tsx`

---

## Context

The auth screens are functional but visually flat. The goal is to apply a modern "Gradient Profundo" style (Option A) that works in both dark and light mode, using the existing color palette without changes.

---

## Design Direction: Option A — Gradient Profundo

### Core Visual Language

**Dark mode:**
- Background: `linear-gradient(150deg, #0D1A1C → #062830 → #003840)`
- 2–3 soft radial blobs (`primaryLight` color, `filter: blur`) for depth
- Text: `textPrimary` (#EEF6F8), `textSecondary` (rgba(238,246,248,0.45))
- Inputs: semi-transparent cyan tint background + cyan border

**Light mode:**
- Background: `linear-gradient(150deg, #FFFFFF → #F5F9FA → #E0F7FA)` — subtle, warm, airy
- 2–3 soft blobs using `colors.primaryLight` (#E0F7FA) with opacity for extra depth
- Text: `textPrimary` (#1A2428), `textSecondary` (#737879)
- Inputs: `inputBackground` (#F5F9FA) + `inputBorder` (#D0DDE0)

**Both modes:**
- Focus state: border changes to `colors.borderFocus` (cyan), subtle glow shadow
- Buttons: gradient `primary → primaryDark` with shadow
- Ghost button: border + semi-transparent background
- PIN boxes: `primaryLight` bg + `primary` border when filled

---

## Screen-by-Screen Spec

### 1. `login.tsx`

**Layout:** Centered flex column, full-screen

**Elements (top → bottom):**
1. `topBar` (absolute top-right): theme toggle + language selector
2. **Background layer (absolute, behind everything):**
   - Blob top-right: large circle, `primaryLight`, blur, opacity 0.5–0.7
   - Blob bottom-left: smaller circle, `secondaryLight`, blur, opacity 0.4
   - Dark mode only: gradient background on the SafeAreaView itself
3. **Header section:**
   - Logo container: rounded square (borderRadius 22), `primaryLight` bg, `primary` border (1.5px), shadow
   - Logo image inside: 80×80
   - App name: 30px, `extraBold`, `textPrimary`
   - Subtitle: 16px, `regular`, `textSecondary`, lineHeight 24
4. **Buttons section:**
   - Google button: ghost style (border `colors.border`, bg `colors.surface`), `flexDirection: row`, `logo-google` Ionicons icon
   - Divider row: lines + "o" text
   - Email button: gradient bg, `flexDirection: row`, `mail-outline` icon, shadow
5. **Register link** at bottom

**Dark mode:** SafeAreaView gets `linear-gradient(150deg, #0D1A1C → #062830 → #003840)`. Blobs: rgba cyan/teal with blur.
**Light mode:** SafeAreaView gets `linear-gradient(150deg, #FFFFFF → #F5F9FA → #E0F7FA)`. Blobs: flat `primaryLight`/`secondaryLight` with opacity.
**Implementation:** React Native `SafeAreaView` no soporta gradientes — usar `expo-linear-gradient` wrapping the screen, o un `View` absoluto detrás del contenido con los colores del tema.

---

### 2. `login-email.tsx`

**Layout:** AppHeader + KeyboardAvoidingView + ScrollView + sticky footer

**Elements:**
1. `AppHeader` (existing, unchanged)
2. **Background blob** (absolute, top-right): same blob pattern as login, smaller
3. **Header:** title (32px bold) + subtitle (16px regular)
4. **Form fields:**
   - Email input: icon wrapper (`mail-outline`), focus state (borderFocus + glow)
   - PIN section: label row with `lock-closed-outline` icon + text
   - `PinInput` component (unchanged)
5. **Footer (sticky):** "Forgot PIN" link + Continue button (gradient, 56px height)

**Dark:** Input bg `rgba(0,172,193,0.07)`, border `rgba(0,172,193,0.22)`, focus border `#00BCD4`
**Light:** Input bg `#F5F9FA`, border `#D0DDE0`, focus border `#00ACC1`

---

### 3. `register.tsx`

**Layout:** Identical structure to login-email

**Elements:**
1. `AppHeader` (existing, unchanged)
2. **Background blob** (top-right, same as login-email)
3. **Header:** title + subtitle
4. **Form fields:**
   - Name input: `person-outline` icon, focus state
   - Email input: `mail-outline` icon, focus state
   - PIN section: `lock-closed-outline` label + subtitle text + `PinInput`
5. **Footer:** Continue button (disabled/opacity until all fields valid)

---

## Implementation Notes

- Background gradient on dark mode: apply via `SafeAreaView` style (not a separate View), except for login.tsx which needs blobs too
- Blobs: absolute-positioned `View` elements with `borderRadius: 999`, no extra dependencies
- Dark mode blobs: add `style={{ ..., shadowColor: colors.primary, shadowOpacity: 0.3 }}` for a subtle glow
- Focus states: `useState` per input (`emailFocused`, `nameFocused`), passed to `borderColor` and icon color
- Gradient buttons: React Native doesn't support CSS gradients — use `backgroundColor: colors.primary` with a strong shadow to simulate depth. OR keep as flat `colors.primary` with shadow (already done).
- No new dependencies required
- All colors via `useTheme()` → `colors` — no hardcoded hex values in JSX

---

## What Does NOT Change

- `config/colors.ts` — palette untouched
- `components/PinInput.tsx` — component untouched
- `components/AppHeader.tsx` — component untouched
- `components/AppDialog.tsx` — component untouched
- All auth logic, hooks, navigation — untouched

---

## Verification

1. `npx expo run:ios` from `~/Documents/Github/Spendiapp`
2. Toggle dark/light mode from the login screen → verify both modes look correct on all 3 screens
3. Tap each input → verify cyan focus ring appears
4. Fill PIN boxes → verify `primaryLight` fill
5. Verify Continue button disables (opacity) until form is complete
6. Complete a full login and register flow to confirm logic is unchanged
