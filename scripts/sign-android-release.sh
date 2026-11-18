#!/usr/bin/env bash
set -euo pipefail

: "${RUNNER_TEMP:?}"
: "${ANDROID_HOME:?}"
: "${ANDROID_KEYSTORE_BASE64:?}"
: "${SINU_STUUDIUM_KEYSTORE_PASSWORD:?}"
: "${SINU_STUUDIUM_KEY_ALIAS:?}"
: "${ANDROID_SIGNING_CERT_SHA256:?}"
export SINU_STUUDIUM_KEY_PASSWORD="${SINU_STUUDIUM_KEY_PASSWORD:-$SINU_STUUDIUM_KEYSTORE_PASSWORD}"

umask 077
key_directory=$(mktemp -d "$RUNNER_TEMP/android-signing.XXXXXX")
trap 'rm -rf "$key_directory"' EXIT
printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$key_directory/release.jks"
unset ANDROID_KEYSTORE_BASE64

tools="$ANDROID_HOME/build-tools/37.0.0"
"$tools/zipalign" -P 16 -f 4 .output/unsigned/app-release-unsigned.apk "$key_directory/aligned.apk"
"$tools/apksigner" sign --ks "$key_directory/release.jks" \
  --ks-key-alias "$SINU_STUUDIUM_KEY_ALIAS" \
  --ks-pass env:SINU_STUUDIUM_KEYSTORE_PASSWORD \
  --key-pass env:SINU_STUUDIUM_KEY_PASSWORD \
  --out "$key_directory/signed.apk" "$key_directory/aligned.apk"
unset SINU_STUUDIUM_KEYSTORE_PASSWORD SINU_STUUDIUM_KEY_PASSWORD
node scripts/release-android-metadata.mjs "$key_directory/signed.apk"
