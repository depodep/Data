#!/usr/bin/env python
"""predict_dataset.py

Usage: python predict_dataset.py <input_csv> <target_column> <output_csv> [feature_columns_csv]
Prints JSON with metrics and path to predictions CSV.
"""
import csv
import json
import math
import random
import sys
from pathlib import Path


def parse_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def load_numeric_data(input_path, target, feature_columns=None):
    with open(input_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        headers = reader.fieldnames or []
        if target not in headers:
            return None, None, [], []
        if feature_columns is None:
            feature_columns = [col for col in headers if col != target]
        feature_columns = [col for col in feature_columns if col in headers and col != target]
        if not feature_columns:
            return headers, target, feature_columns, []

        rows = []
        for row in reader:
            target_value = parse_float(row.get(target, ''))
            feature_values = [parse_float(row.get(col, '')) for col in feature_columns]
            if target_value is None or any(value is None for value in feature_values):
                continue
            rows.append({'target': target_value, 'features': feature_values})

    return headers, target, feature_columns, rows


def train_test_split(rows, test_size=0.2, seed=42):
    if len(rows) < 2:
        return rows, []
    shuffled = list(rows)
    random.Random(seed).shuffle(shuffled)
    split_index = max(1, int(round(len(shuffled) * (1 - test_size))))
    if split_index >= len(shuffled):
        split_index = len(shuffled) - 1
    return shuffled[:split_index], shuffled[split_index:]


def fit_linear_regression(xs, ys):
    count = len(xs)
    if count == 0:
        return 0.0, 0.0
    mean_x = sum(xs) / count
    mean_y = sum(ys) / count
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denominator = sum((x - mean_x) ** 2 for x in xs)
    slope = numerator / denominator if denominator else 0.0
    intercept = mean_y - (slope * mean_x)
    return slope, intercept


def predict_linear(xs, slope, intercept):
    return [slope * x + intercept for x in xs]


def mean_squared_error(actual, predicted):
    if not actual:
        return 0.0
    return sum((a - p) ** 2 for a, p in zip(actual, predicted)) / len(actual)


def r2_score(actual, predicted):
    if not actual:
        return 0.0
    mean_actual = sum(actual) / len(actual)
    total_variance = sum((value - mean_actual) ** 2 for value in actual)
    if total_variance == 0:
        return 0.0
    residual_variance = sum((a - p) ** 2 for a, p in zip(actual, predicted))
    return 1 - (residual_variance / total_variance)


def main():
    if len(sys.argv) < 4:
        print(json.dumps({'success': False, 'message': 'Usage: predict_dataset.py <input_csv> <target_column> <output_csv> [feature_columns_csv]'}))
        return

    input_path = Path(sys.argv[1])
    target = sys.argv[2]
    output_path = Path(sys.argv[3])
    feature_columns = [column.strip() for column in sys.argv[4].split(',') if column.strip()] if len(sys.argv) > 4 else None

    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    headers, target, feature_cols, rows = load_numeric_data(input_path, target, feature_columns)
    if headers is None:
        print(json.dumps({'success': False, 'message': 'Target column not found'}))
        return
    if not rows:
        print(json.dumps({'success': False, 'message': 'No valid rows for prediction'}))
        return

    if not feature_cols:
        print(json.dumps({'success': False, 'message': 'No valid feature columns to train on'}))
        return

    if len(feature_cols) != 1:
        print(json.dumps({'success': False, 'message': 'This predictor expects a single numeric feature column'}))
        return

    xs = [row['features'][0] for row in rows]
    ys = [row['target'] for row in rows]

    train_rows, test_rows = train_test_split(rows, test_size=0.2, seed=42)
    train_x = [row['features'][0] for row in train_rows]
    train_y = [row['target'] for row in train_rows]
    test_x = [row['features'][0] for row in test_rows]
    test_y = [row['target'] for row in test_rows]

    slope, intercept = fit_linear_regression(train_x, train_y)
    preds = predict_linear(test_x, slope, intercept)

    mse = float(mean_squared_error(test_y, preds))
    r2 = float(r2_score(test_y, preds))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(feature_cols + [f'actual_{target}', f'pred_{target}'])
        for row, actual, pred in zip(test_rows, test_y, preds):
            writer.writerow([row['features'][0]] + [actual, pred])

    print(json.dumps({'success': True, 'mse': mse, 'r2': r2, 'slope': slope, 'intercept': intercept, 'predictions_path': str(output_path), 'training_rows': len(train_rows), 'testing_rows': len(test_rows)}))


if __name__ == '__main__':
    main()
