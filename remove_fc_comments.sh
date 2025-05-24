#!/bin/bash

# Find all .fc files in contracts/, excluding contracts/imports/
find contracts -type f -name "*.fc" ! -path "contracts/imports/*" | while read -r file; do
    echo "Processing $file"

    # Remove ;; and everything after it on the same line
    # Save to a temporary file, then overwrite the original
    sed 's/;;.*//' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done
