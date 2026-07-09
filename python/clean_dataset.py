#!/usr/bin/env python
"""clean_dataset.py

Usage: python clean_dataset.py <input_csv> <output_csv>
Prints a JSON summary to stdout.
"""
import csv
import json
import sys
from pathlib import Path


def parse_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def is_numeric_column(values):
    if not values:
        return False
    numeric = [parse_float(v) is not None for v in values if v != '']
    return len(numeric) >= max(1, len(values) * 0.5)


def detect_outliers(values):
    numbers = [v for v in (parse_float(x) for x in values) if v is not None]
    if len(numbers) < 2:
        return 0
    mean = sum(numbers) / len(numbers)
    variance = sum((x - mean) ** 2 for x in numbers) / len(numbers)
    std = variance ** 0.5
    if std == 0:
        return 0
    return sum(1 for x in numbers if abs((x - mean) / std) > 3)


def main():
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'message': 'Usage: clean_dataset.py <input_csv> <output_csv> [json_options]'}))
        return

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    opts = {}
    if len(sys.argv) >= 4:
        try:
            opts = json.loads(sys.argv[3])
        except Exception:
            opts = {}

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    with open(input_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)
        headers = reader.fieldnames or []

    before_rows = len(rows)
    if before_rows == 0:
        print(json.dumps({'success': False, 'message': 'No data rows found'}))
        return

    trimmed_rows = []
    for row in rows:
        cleaned = {k: (v.strip() if isinstance(v, str) else '') for k, v in row.items()}
        trimmed_rows.append(cleaned)

    missing_before = {col: 0 for col in headers}
    for row in trimmed_rows:
        for col in headers:
            if row.get(col, '') == '':
                missing_before[col] += 1

    unique_rows = []
    seen = set()
    for row in trimmed_rows:
        key = tuple(row.get(col, '') for col in headers)
        if key not in seen:
            seen.add(key)
            unique_rows.append(row)
    removed_duplicates = len(trimmed_rows) - len(unique_rows)
    result_rows = unique_rows if opts.get('remove_duplicates', True) else trimmed_rows

    num_cols = [col for col in headers if is_numeric_column([row.get(col, '') for row in result_rows])]
    missing_strategy = opts.get('missing_strategy', 'none')
    missing_after = {col: 0 for col in headers}

    if missing_strategy in ('fill_zero', 'fill_mean') and num_cols:
        for col in num_cols:
            numeric_values = [parse_float(row.get(col, '')) for row in result_rows]
            if missing_strategy == 'fill_mean':
                valid = [v for v in numeric_values if v is not None]
                replacement = sum(valid) / len(valid) if valid else 0.0
            else:
                replacement = 0.0
            for row in result_rows:
                if row.get(col, '') == '':
                    row[col] = str(replacement)

    for row in result_rows:
        for col in headers:
            if row.get(col, '') == '':
                missing_after[col] += 1

    outliers = {col: detect_outliers([row.get(col, '') for row in result_rows]) for col in num_cols}

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=headers)
        writer.writeheader()
        writer.writerows(result_rows)

    summary = {
        'success': True,
        'message': 'Cleaning completed',
        'before_rows': before_rows,
        'after_rows': len(result_rows),
        'removed_duplicates': removed_duplicates,
        'missing_before': missing_before,
        'missing_after': missing_after,
        'outliers': outliers,
        'output_path': str(output_path),
        'options': opts,
    }
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
