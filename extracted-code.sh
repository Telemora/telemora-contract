#!/bin/bash

output_file="output.md"

{
    echo "### Files:"
    echo ""
} > "$output_file"

find . -type d -name "node_modules" -prune -o -type f \( -name "*.fc" -o -name "*.ts" \) -print0 | while IFS= read -r -d '' file; do
  {
          echo "- File: ${file}"
          echo ""
          echo '```typescript'
          cat "$file"
          echo '```'
          echo ""
      } >> "$output_file"
    echo "Processing: $file"
done

echo "Extraction complete. Check $output_file"
