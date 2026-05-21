#!/bin/bash

# Find and replace imports
find src -type f -name "*.tsx" -o -name "*.ts" | while read -r file; do
  # Replace '../constants' with something based on the file depth
  
  # For files in src/dashboard
  if [[ "$file" == src/dashboard/* ]]; then
    sed -i 's|../types|../types|g' "$file"
    sed -i 's|../constants|../constants|g' "$file"
    sed -i 's|../services/|../services/|g' "$file"
    sed -i 's|./components/auth|../auth|g' "$file"
    sed -i 's|../components/|../components/|g' "$file"
  fi
done
