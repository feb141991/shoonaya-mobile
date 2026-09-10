#!/usr/bin/env python3
"""
apply_observance_series_sourcing.py

Updates packages/dharma-rules/src/festivals/series-content.json with the verified
sourceRefs and flips status: 'pending_source' -> 'source_backed' for all 52 fields.
"""

import json
from pathlib import Path

def main():
    backend_root = Path("/Users/Business(C)/Sanatan Sangam/Shoonaya")
    content_path = backend_root / "packages/dharma-rules/src/festivals/series-content.json"
    sourcing_output_path = backend_root / "scripts/observance-series-sourcing-output.json"

    with open(sourcing_output_path, "r", encoding="utf-8") as f:
        sourcing_records = json.load(f)

    # Key by (slug, field)
    sourcing_map = {(r["slug"], r["field"]): r for r in sourcing_records}

    with open(content_path, "r", encoding="utf-8") as f:
        content_data = json.load(f)

    updated_count = 0

    for series_group in content_data.get("series", []):
        # Check series name
        if series_group.get("definitionKey") == "sharad-navratri":
            if series_group["name"]["status"] == "pending_source" and len(series_group["name"].get("sourceRefs", [])) > 0:
                series_group["name"]["status"] = "source_backed"
                print("Updated series name status for sharad-navratri to source_backed")

        for child in series_group.get("children", []):
            slug = child["slug"]
            for field_name in ["canonicalTitle", "deityOrTheme", "rituals", "significance"]:
                if (slug, field_name) in sourcing_map:
                    rec = sourcing_map[(slug, field_name)]
                    if rec["verdict"] == "sourced":
                        if field_name not in child:
                            continue
                        field_obj = child[field_name]
                        field_obj["status"] = "source_backed"
                        field_obj["sourceRefs"] = rec["sourceRefs"]
                        updated_count += 1

    print(f"Updated {updated_count} fields in series-content.json")

    with open(content_path, "w", encoding="utf-8") as f:
        json.dump(content_data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Saved updated series-content.json to {content_path}")

if __name__ == "__main__":
    main()
