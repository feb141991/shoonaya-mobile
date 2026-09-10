# -*- coding: utf-8 -*-
import json
import re
import sys
import os

sys.path.append('/Users/Business(C)/shoonaya-mobile/scripts')
import faithful_part1
import faithful_part2
import faithful_part3
import faithful_part4

def main():
    with open('/Users/Business(C)/Sanatan Sangam/Shoonaya/scripts/dharm-veer-english-export.json', 'r', encoding='utf-8') as f:
        english_rows = json.load(f)

    all_parts = (
        faithful_part1.PART_1 +
        faithful_part2.PART_2 +
        faithful_part3.PART_3 +
        faithful_part4.PART_4
    )

    print(f"Loaded {len(english_rows)} English rows and {len(all_parts)} translated items.")
    assert len(english_rows) == 76, f"Expected 76 English rows, got {len(english_rows)}"
    assert len(all_parts) == 76, f"Expected 76 translated parts, got {len(all_parts)}"

    part_map = {item['slug']: item for item in all_parts}

    devanagari_pattern = re.compile(r'[\u0900-\u097F]')
    gurmukhi_pattern = re.compile(r'[\u0A00-\u0A7F]')

    output_rows = []

    for idx, eng in enumerate(english_rows):
        slug = eng['slug']
        if slug not in part_map:
            raise ValueError(f"Missing translation for slug: {slug}")
        
        tr = part_map[slug]

        row = {
            "slug": slug,
            "name": eng.get("name", ""),
            "name_pa": tr.get("name_pa", ""),
            "tradition": eng.get("tradition", ""),
            "tagline": eng.get("tagline", ""),
            "tagline_local": tr.get("tagline_local", ""),
            "tagline_pa": tr.get("tagline_pa", ""),
            "journey": eng.get("journey", ""),
            "journey_local": tr.get("journey_local", ""),
            "journey_pa": tr.get("journey_pa", ""),
            "trial": eng.get("trial", ""),
            "trial_local": tr.get("trial_local", ""),
            "trial_pa": tr.get("trial_pa", ""),
            "teaching": eng.get("teaching", ""),
            "teaching_local": tr.get("teaching_local", ""),
            "teaching_pa": tr.get("teaching_pa", ""),
            "moral": eng.get("moral", ""),
            "moral_local": tr.get("moral_local", ""),
            "moral_pa": tr.get("moral_pa", ""),
            "legacy": eng.get("legacy") or "",
            "legacy_local": tr.get("legacy_local", "") if eng.get("legacy") else "",
            "legacy_pa": tr.get("legacy_pa", "") if eng.get("legacy") else "",
            "quote": eng.get("quote") or "",
            "quote_local": tr.get("quote_local", "") if eng.get("quote") else "",
            "quote_pa": tr.get("quote_pa", "") if eng.get("quote") else ""
        }

        # Verification rules
        # 1. name_pa must be Gurmukhi
        if not gurmukhi_pattern.search(row["name_pa"]):
            raise ValueError(f"[{slug}] name_pa is missing Gurmukhi characters: {row['name_pa']}")

        # 2. Check local vs pa fields
        fields_to_check = ['tagline', 'journey', 'trial', 'teaching', 'moral']
        if row['legacy']:
            fields_to_check.append('legacy')
        if row['quote']:
            fields_to_check.append('quote')

        for f_name in fields_to_check:
            loc = row[f"{f_name}_local"]
            pa = row[f"{f_name}_pa"]
            eng_text = row[f_name]

            if eng_text:
                if not loc or not devanagari_pattern.search(loc):
                    raise ValueError(f"[{slug}] {f_name}_local is missing Devanagari characters: '{loc}'")
                if not pa or not gurmukhi_pattern.search(pa):
                    raise ValueError(f"[{slug}] {f_name}_pa is missing Gurmukhi characters: '{pa}'")

                # Length check
                eng_len = len(eng_text)
                loc_len = len(loc)
                pa_len = len(pa)
                if loc_len < 0.25 * eng_len or loc_len > 3.0 * eng_len:
                    print(f"Warning: [{slug}] {f_name} Hindi length outlier: eng={eng_len}, loc={loc_len}")
                if pa_len < 0.25 * eng_len or pa_len > 3.0 * eng_len:
                    print(f"Warning: [{slug}] {f_name} Punjabi length outlier: eng={eng_len}, pa={pa_len}")

        # 3. Empty fields check
        if not row['legacy']:
            assert row['legacy_local'] == "" and row['legacy_pa'] == "", f"[{slug}] legacy should be empty"
        if not row['quote']:
            assert row['quote_local'] == "" and row['quote_pa'] == "", f"[{slug}] quote should be empty"

        output_rows.append(row)

    # Specific Spot-check verifications:
    # Sri Krishna: No Gokul, Kansa, Dwarka
    krishna = part_map['sri-krishna']
    for k in ['journey_local', 'trial_local', 'journey_pa', 'trial_pa']:
        assert 'गोकुल' not in krishna[k] and 'ਗੋਕੁਲ' not in krishna[k], "Krishna contains Gokul!"
        assert 'कंस' not in krishna[k] and 'ਕੰਸ' not in krishna[k], "Krishna contains Kansa!"
        assert 'द्वारका' not in krishna[k] and 'ਦਵਾਰਕਾ' not in krishna[k], "Krishna contains Dwarka!"

    # Sri Rama: No Ayodhya, 14 years, Ravana, Ram Rajya
    rama = part_map['sri-rama']
    for k in ['journey_local', 'trial_local', 'journey_pa', 'trial_pa']:
        assert 'अयोध्या' not in rama[k] and 'ਅਯੁੱਧਿਆ' not in rama[k], "Rama contains Ayodhya!"
        assert '14' not in rama[k] and '१४' not in rama[k] and '੧੪' not in rama[k], "Rama contains 14 years!"
        assert 'रावण' not in rama[k] and 'ਰਾਵਣ' not in rama[k], "Rama contains Ravana!"
        assert 'राम राज्य' not in rama[k] and 'ਰਾਮ ਰਾਜ' not in rama[k], "Rama contains Ram Rajya!"

    # Siddhartha Gautama: No Kapilavastu, 29 years, 6 years, Bodh Gaya
    buddha = part_map['siddhartha-gautama']
    for k in ['journey_local', 'trial_local', 'journey_pa', 'trial_pa']:
        assert 'कपिलवस्तु' not in buddha[k] and 'ਕਪਿਲਵਸਤੂ' not in buddha[k], "Buddha contains Kapilavastu!"
        assert '29' not in buddha[k] and '२९' not in buddha[k], "Buddha contains age 29!"
        assert 'बोधगया' not in buddha[k] and 'ਬੋਧਗਯਾ' not in buddha[k], "Buddha contains Bodh Gaya!"

    # Guru Gobind Singh: Verify 2 paragraphs and Panj Pyare
    ggs = part_map['guru-gobind-singh']
    assert '\n\n' in ggs['journey_local'] and '\n\n' in ggs['journey_pa'], "Guru Gobind Singh journey must have 2 paragraphs"
    assert 'पंज प्यारे' in ggs['journey_local'] or 'पांच' in ggs['journey_local']
    assert 'ਪੰਜ ਪਿਆਰੇ' in ggs['journey_pa'] or 'ਪੰਜ ਪਿਆਰਿਆਂ' in ggs['journey_pa']

    # Write output file
    out_path_mobile = '/Users/Business(C)/shoonaya-mobile/scripts/dharm-veer-translations-output.json'
    with open(out_path_mobile, 'w', encoding='utf-8') as f:
        json.dump(output_rows, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved {len(output_rows)} rows to {out_path_mobile}")

    # Also copy to Shoonaya
    out_path_shoonaya = '/Users/Business(C)/Sanatan Sangam/Shoonaya/scripts/dharm-veer-translations-output.json'
    with open(out_path_shoonaya, 'w', encoding='utf-8') as f:
        json.dump(output_rows, f, ensure_ascii=False, indent=2)
    print(f"Successfully copied {len(output_rows)} rows to {out_path_shoonaya}")

if __name__ == '__main__':
    main()
