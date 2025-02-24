#!/bin/bash

output_file="output.md"

# Initialize the output file with a header.
cat << 'EOF' > "$output_file"
### Files:

EOF

# Find files (excluding node_modules and the specified file) and process each.
find . -type d -name "node_modules" -prune -o -type f -name "*.ts" -not -path "./contracts/imports/stdlib.fc" -print0 | while IFS= read -r -d '' file; do
    {
        # Use '--' to safely handle format strings starting with a dash.
        printf -- "- File: %s\n\n" "$file"
        ext="${file##*.}"
        if [ "$ext" = "fc" ]; then
            lang="func"
        else
            lang="typescript"
        fi
        printf -- '```%s\n' "$lang"
        cat "$file"
        printf -- '\n```\n\n'
    } >> "$output_file"
    echo "Processing: $file"
done

echo "Extraction complete. Check $output_file"
