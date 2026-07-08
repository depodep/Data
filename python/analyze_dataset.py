#!/usr/bin/env python
"""analyze_dataset.py

Usage: python analyze_dataset.py <input_csv>
Prints JSON stats to stdout.
"""
import sys
import json
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'message': 'Usage: analyze_dataset.py <input_csv>'}))
        return

    input_path = Path(sys.argv[1])
    try:
        import pandas as pd
        import numpy as np
    except Exception as e:
        print(json.dumps({'success': False, 'message': f'Import error: {e}'}))
        return

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))

    df = pd.read_csv(input_path)
    numeric = df.select_dtypes(include=['number'])

    stats = {}
    for col in numeric.columns:
        coldata = numeric[col].dropna()
        stats[col] = {
            'count': int(coldata.count()),
            'mean': float(coldata.mean()) if not coldata.empty else None,
            'median': float(coldata.median()) if not coldata.empty else None,
            'mode': (coldata.mode().iloc[0].item() if not coldata.mode().empty else None),
            'min': float(coldata.min()) if not coldata.empty else None,
            'max': float(coldata.max()) if not coldata.empty else None,
            'std': float(coldata.std()) if not coldata.empty else None,
        }

    # correlation matrix
    corr = None
    try:
        corr = numeric.corr().fillna(0).to_dict()
    except Exception:
        corr = None

    # simple trend analysis (slope over index)
    trends = {}
    for col in numeric.columns:
        coldata = numeric[col].dropna()
        if len(coldata) >= 3:
            x = list(range(len(coldata)))
            y = coldata.values
            try:
                coef = np.polyfit(x, y, 1)
                slope = float(coef[0])
            except Exception:
                slope = 0.0
            direction = 'stable'
            if slope > 1e-6:
                direction = 'increasing'
            elif slope < -1e-6:
                direction = 'decreasing'
            trends[col] = {'slope': slope, 'direction': direction}
        else:
            trends[col] = {'slope': None, 'direction': 'insufficient_data'}

    # basic insights
    insights = []
    # missing values
    missing = (df.isnull().sum() / len(df)).to_dict()
    for k,v in missing.items():
        if v > 0.2:
            insights.append(f"Column '{k}' has high missing rate ({v:.0%})")

    # high variance columns
    try:
        variances = numeric.var().sort_values(ascending=False)
        top_var = variances.index[0] if len(variances) > 0 else None
        if top_var is not None:
            insights.append(f"Column '{top_var}' shows highest variance.")
    except Exception:
        pass

    # strong correlations
    strong = []
    if corr:
        for a, row in corr.items():
            for b, v in row.items():
                if a == b: continue
                try:
                    if abs(v) >= 0.8:
                        strong.append((a, b, float(v)))
                except Exception:
                    continue
    if strong:
        insights.append(f"Strong correlations detected: {[(a,b,round(v,2)) for a,b,v in strong][:5]}")

    result = {
        'success': True,
        'numeric_stats': stats,
        'total_rows': int(len(df)),
        'correlation': corr,
        'trends': trends,
        'insights': insights,
    }
    print(json.dumps(result))

if __name__ == '__main__':
    main()
