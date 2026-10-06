#!/usr/bin/env bash
# Capture every reader screen on the booted iOS Simulator for before/after
# review of docs/READER_EXPERIENCE_GRAND_PLAN.md.
# Usage: scripts/reader-capture.sh <out-dir> <label>
# Opens each reader by deep link (shoonaya://), waits, saves a PNG.
set -u
OUT="$1"; LABEL="$2"; mkdir -p "$OUT"
DEV="${SIM_UDID:-booted}"
shot() { # name url
  xcrun simctl openurl "$DEV" "$2"
  sleep "${WAIT:-6}"
  xcrun simctl io "$DEV" screenshot --type=png "$OUT/${LABEL}-$1.png" >/dev/null 2>&1 && echo "saved $1"
}
shot dharm-veer   "shoonaya://dharm-veer/sri-krishna"
shot stotram      "shoonaya://bhakti/stotram/ganesha-pancharatnam"
shot katha        "shoonaya://bhakti/katha/katha-ekadashi-margashirsha-shukla"
shot vrat         "shoonaya://vrat/ekadashi"
shot festival     "shoonaya://festival/diwali"
shot panchatantra "shoonaya://bhakti/katha/panchatantra-crane-and-crab"
shot pathshala    "shoonaya://pathshala/bhagavad-gita-intro/${PATHSHALA_LESSON:-1}"
