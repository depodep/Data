#!/usr/bin/env python
"""visualize_dataset.py

Usage: python visualize_dataset.py <input_csv> <output_dir>
Prints JSON with generated chart paths.
"""
import csv
import json
import sys
from pathlib import Path


def read_numeric_scores(csv_path, columns):
    rows = []
    with open(csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            values = {}
            for col in columns:
                val = row.get(col, '')
                try:
                    values[col] = float(val) if val not in (None, '') else None
                except ValueError:
                    values[col] = None
            rows.append(values)
    return rows


def main():
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'message': 'Usage: visualize_dataset.py <input_csv> <output_dir>'}))
        return

    input_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])

    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except Exception as e:
        print(json.dumps({'success': False, 'message': f'Import error: {e}'}))
        return

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    score_columns = ['Quiz Score', 'Midterm Score', 'Final Score', 'Attendance']
    rows = read_numeric_scores(input_path, score_columns)
    if not rows:
        print(json.dumps({'success': False, 'message': 'No rows found'}))
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    charts = []

    for col in score_columns:
        values = [row[col] for row in rows if row[col] is not None]
        if not values:
            continue

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.hist(values, bins=10, color='#2563eb', edgecolor='#ffffff')
        ax.set_title(f'Histogram: {col}')
        ax.set_xlabel(col)
        ax.set_ylabel('Count')
        plt.tight_layout()
        chart_path = out_dir / f"{input_path.stem}_{col.replace(' ', '_').lower()}_hist.png"
        fig.savefig(chart_path)
        plt.close(fig)
        charts.append(str(chart_path))

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.boxplot(values, patch_artist=True, boxprops={'facecolor': '#0ea5e9', 'color': '#0b71c3'})
        ax.set_title(f'Box Plot: {col}')
        ax.set_ylabel(col)
        ax.set_xticks([1])
        ax.set_xticklabels([col])
        plt.tight_layout()
        chart_path = out_dir / f"{input_path.stem}_{col.replace(' ', '_').lower()}_box.png"
        fig.savefig(chart_path)
        plt.close(fig)
        charts.append(str(chart_path))

    if not charts:
        print(json.dumps({'success': False, 'message': 'No numeric score columns found for visualization'}))
        return

    print(json.dumps({'success': True, 'charts': charts}))


if __name__ == '__main__':
    main()
