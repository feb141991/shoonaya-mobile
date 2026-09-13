#!/usr/bin/env bash
set -euo pipefail

# Updates graphify for source code only (excluding node_modules)
/Users/princesharma/Library/Python/3.13/bin/graphify update app lib components
