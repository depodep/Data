#!/usr/bin/env python
"""visualize_dataset.py

Usage: python visualize_dataset.py <input_csv> <output_dir>
Prints JSON with generated chart paths.
"""
import sys
import json
from pathlib import Path

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'message': 'Usage: visualize_dataset.py <input_csv> <output_dir>'}))
        return

    input_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])

    try:
        import pandas as pd
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except Exception as e:
        print(json.dumps({'success': False, 'message': f'Import error: {e}'}))
        return

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    df = pd.read_csv(input_path)
    numeric = df.select_dtypes(include=['number'])
    if numeric.shape[1] == 0:
        print(json.dumps({'success': False, 'message': 'No numeric columns to visualize'}))
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    charts = []

    # create histogram for first numeric column
    col = numeric.columns[0]
    fig = plt.figure(figsize=(6,4))
    numeric[col].dropna().hist(bins=20)
    plt.title(f'Histogram: {col}')
    plt.tight_layout()
    chart_path = out_dir / f"{input_path.stem}_{col}_hist.png"
    fig.savefig(chart_path)
    plt.close(fig)
    charts.append(str(chart_path))

    print(json.dumps({'success': True, 'charts': charts}))

if __name__ == '__main__':
    main()
