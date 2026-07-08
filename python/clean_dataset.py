#!/usr/bin/env python
"""clean_dataset.py

Usage: python clean_dataset.py <input_csv> <output_csv>
Prints a JSON summary to stdout.
"""
import sys
import json
from pathlib import Path


def detect_outliers(series):
    # simple z-score method
    try:
        import numpy as np
    except Exception:
        return 0
    arr = series.dropna().to_numpy(dtype=float)
    if arr.size == 0:
        return 0
    mean = arr.mean()
    std = arr.std()
    if std == 0:
        return 0
    z = (arr - mean) / std
    return int((abs(z) > 3).sum())


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

    try:
        import pandas as pd
        import numpy as np
    except Exception as e:
        print(json.dumps({'success': False, 'message': f'Import error: {e}'}))
        return

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    df = pd.read_csv(input_path)
    before_rows = int(len(df))

    # Trim whitespace from string columns
    str_cols = df.select_dtypes(include=['object']).columns
    for c in str_cols:
        df[c] = df[c].astype(str).str.strip()

    # Collect missing counts
    missing_before = {col: int(df[col].isna().sum()) for col in df.columns}

    removed_duplicates = 0
    if opts.get('remove_duplicates', True):
        df_before = len(df)
        df = df.drop_duplicates()
        removed_duplicates = int(df_before - len(df))

    # Handle missing values
    missing_strategy = opts.get('missing_strategy', 'none')  # none, fill_zero, fill_mean
    missing_after = {}
    if missing_strategy == 'fill_zero':
        num_cols = df.select_dtypes(include=['number']).columns
        df[num_cols] = df[num_cols].fillna(0)
    elif missing_strategy == 'fill_mean':
        num_cols = df.select_dtypes(include=['number']).columns
        for c in num_cols:
            mean = df[c].mean()
            if not (mean is None or pd.isna(mean)):
                df[c] = df[c].fillna(mean)

    missing_after = {col: int(df[col].isna().sum()) for col in df.columns}

    # Detect outliers for numeric columns
    numeric = df.select_dtypes(include=['number'])
    outliers = {col: detect_outliers(df[col]) for col in numeric.columns}

    # Save cleaned CSV
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    summary = {
        'success': True,
        'message': 'Cleaning completed',
        'before_rows': before_rows,
        'after_rows': int(len(df)),
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
