#!/usr/bin/env python
"""predict_dataset.py

Usage: python predict_dataset.py <input_csv> <target_column> <output_csv>
Prints JSON with metrics and path to predictions CSV.
"""
import sys
import json
from pathlib import Path

def main():
    if len(sys.argv) < 4:
        print(json.dumps({'success': False, 'message': 'Usage: predict_dataset.py <input_csv> <target_column> <output_csv>'}))
        return

    input_path = Path(sys.argv[1])
    target = sys.argv[2]
    output_path = Path(sys.argv[3])

    try:
        import pandas as pd
        from sklearn.model_selection import train_test_split
        from sklearn.linear_model import LinearRegression
        from sklearn.metrics import mean_squared_error, r2_score
    except Exception as e:
        print(json.dumps({'success': False, 'message': f'Import error: {e}'}))
        return

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    df = pd.read_csv(input_path)
    if target not in df.columns:
        print(json.dumps({'success': False, 'message': 'Target column not found'}))
        return

    numeric = df.select_dtypes(include=['number']).dropna()
    if target not in numeric.columns:
        print(json.dumps({'success': False, 'message': 'Target column not numeric or missing values'}))
        return

    X = numeric.drop(columns=[target])
    y = numeric[target]
    if X.shape[1] == 0:
        print(json.dumps({'success': False, 'message': 'No features to train on'}))
        return

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = LinearRegression()
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    mse = float(mean_squared_error(y_test, preds))
    r2 = float(r2_score(y_test, preds))

    out_df = X_test.copy()
    out_df['actual_' + target] = y_test
    out_df['pred_' + target] = preds
    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_csv(output_path, index=False)

    print(json.dumps({'success': True, 'mse': mse, 'r2': r2, 'predictions_path': str(output_path)}))

if __name__ == '__main__':
    main()
