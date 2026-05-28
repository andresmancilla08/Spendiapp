#!/bin/bash
# Pre-deploy validator: blocks git push / firebase deploy if real TS errors exist

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only run for deploy commands
if ! echo "$COMMAND" | grep -qE '(git push|firebase deploy)'; then
  exit 0
fi

cd /Users/andresmancilla/Documents/GitHub/Spendiapp

echo "Validando TypeScript..." >&2

# Run TSC, strip known Expo/RN phantom errors (missing type stubs, not real bugs)
TSC_ERRORS=$(npx tsc --noEmit 2>&1 \
  | grep "error TS" \
  | grep -v "@expo/vector-icons" \
  | grep -v "Cannot find namespace 'JSX'" \
  | grep -v "@expo/metro-config" \
  | grep -v "expo-modules-core" \
  | grep -v "getReactNativePersistence" \
  || true)

if [ -n "$TSC_ERRORS" ]; then
  COUNT=$(echo "$TSC_ERRORS" | grep -c "error TS" || true)
  MSG="DEPLOY BLOQUEADO — $COUNT error(s) TypeScript reales encontrados. Corrige antes de desplegar:\n\n$TSC_ERRORS"
  jq -n --arg msg "$MSG" '{"continue": false, "stopReason": $msg}'
  exit 0
fi

jq -n '{"continue": true, "systemMessage": "Validacion TypeScript OK — sin errores reales"}'
