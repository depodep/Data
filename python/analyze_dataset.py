#!/usr/bin/env python
"""analyze_dataset.py

Usage: python analyze_dataset.py <input_csv>
Prints JSON stats to stdout.
"""

from __future__ import annotations

import csv
import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


TARGET_TREND_COLUMNS = ['Quiz Score', 'Midterm Score', 'Final Score', 'Attendance']


def parse_numeric(value: Any) -> Optional[float]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith('%'):
        text = text[:-1].strip()
    try:
        return float(text)
    except ValueError:
        return None


def normalize_header(value: Any) -> str:
    return ''.join(ch.lower() for ch in str(value) if ch.isalnum())


def find_header(headers: Sequence[str], candidates: Sequence[str]) -> Optional[str]:
    header_keys = {normalize_header(column): column for column in headers}
    for candidate in candidates:
        found = header_keys.get(normalize_header(candidate))
        if found:
            return found
    return None


def load_rows(input_path: Path) -> Tuple[List[str], List[Dict[str, Any]]]:
    with input_path.open(newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        headers = reader.fieldnames or []
        rows = [row for row in reader]
    return headers, rows


def clean_numeric_series(values: Iterable[Any]) -> List[float]:
    return [float(value) for value in values if value is not None]


def summarize_series(values: Sequence[Any]) -> Dict[str, Any]:
    clean = clean_numeric_series(values)
    if not clean:
        return {
            'count': 0,
            'mean': None,
            'median': None,
            'mode': None,
            'minimum': None,
            'maximum': None,
            'std_dev': None,
            'variance': None,
        }

    mode_value = Counter(clean).most_common(1)[0][0]
    std_dev = statistics.stdev(clean) if len(clean) > 1 else 0.0
    variance = statistics.variance(clean) if len(clean) > 1 else 0.0

    return {
        'count': len(clean),
        'mean': statistics.mean(clean),
        'median': statistics.median(clean),
        'mode': mode_value,
        'minimum': min(clean),
        'maximum': max(clean),
        'std_dev': std_dev,
        'variance': variance,
    }


def paired_values(left: Sequence[Any], right: Sequence[Any]) -> List[Tuple[float, float]]:
    pairs: List[Tuple[float, float]] = []
    for left_value, right_value in zip(left, right):
        if left_value is None or right_value is None:
            continue
        pairs.append((float(left_value), float(right_value)))
    return pairs


def pearson_correlation(left: Sequence[Any], right: Sequence[Any]) -> float:
    pairs = paired_values(left, right)
    if len(pairs) < 2:
        return 0.0

    xs = [pair[0] for pair in pairs]
    ys = [pair[1] for pair in pairs]
    mean_x = statistics.mean(xs)
    mean_y = statistics.mean(ys)
    numerator = sum((x_value - mean_x) * (y_value - mean_y) for x_value, y_value in pairs)
    denominator = math.sqrt(
        sum((x_value - mean_x) ** 2 for x_value in xs)
        * sum((y_value - mean_y) ** 2 for y_value in ys)
    )
    return numerator / denominator if denominator else 0.0


def correlation_matrix(numeric_values: Dict[str, List[Optional[float]]], numeric_columns: Sequence[str]) -> Dict[str, Dict[str, float]]:
    matrix: Dict[str, Dict[str, float]] = {}
    for first_column in numeric_columns:
        matrix[first_column] = {}
        for second_column in numeric_columns:
            if first_column == second_column:
                matrix[first_column][second_column] = 1.0
            else:
                matrix[first_column][second_column] = pearson_correlation(
                    numeric_values[first_column],
                    numeric_values[second_column],
                )
    return matrix


def correlation_label(value: float) -> str:
    magnitude = abs(value)
    if magnitude >= 0.75:
        return 'Strong Positive' if value > 0 else 'Strong Negative'
    if magnitude >= 0.35:
        return 'Weak'
    return 'No Correlation'


def flatten_numeric_values(numeric_values: Dict[str, List[Optional[float]]], numeric_columns: Sequence[str]) -> List[float]:
    pooled: List[float] = []
    for column in numeric_columns:
        pooled.extend(clean_numeric_series(numeric_values[column]))
    return pooled


def build_moving_average(values: Sequence[float], window: int = 3) -> List[Optional[float]]:
    moving_average: List[Optional[float]] = []
    for index in range(len(values)):
        start_index = max(0, index - window + 1)
        window_values = values[start_index:index + 1]
        moving_average.append(statistics.mean(window_values) if len(window_values) == window else None)
    return moving_average


def detect_outliers(values: Sequence[float]) -> List[int]:
    if len(values) < 4:
        return []
    ordered = sorted(values)
    midpoint = len(ordered) // 2
    if len(ordered) % 2 == 0:
        lower_half = ordered[:midpoint]
        upper_half = ordered[midpoint:]
    else:
        lower_half = ordered[:midpoint]
        upper_half = ordered[midpoint + 1:]
    if not lower_half or not upper_half:
        return []
    q1 = statistics.median(lower_half)
    q3 = statistics.median(upper_half)
    iqr = q3 - q1
    if iqr == 0:
        return []
    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)
    return [index for index, value in enumerate(values) if value < lower_bound or value > upper_bound]


def compute_trend(values: Sequence[float]) -> Dict[str, Any]:
    if len(values) < 2:
        return {
            'slope': None,
            'intercept': None,
            'direction': 'insufficient_data',
            'trend_line': [],
            'moving_average': [],
            'outliers': [],
            'spikes': [],
        }

    x_values = list(range(len(values)))
    mean_x = statistics.mean(x_values)
    mean_y = statistics.mean(values)
    numerator = sum((x_value - mean_x) * (y_value - mean_y) for x_value, y_value in zip(x_values, values))
    denominator = sum((x_value - mean_x) ** 2 for x_value in x_values)
    slope = numerator / denominator if denominator else 0.0
    intercept = mean_y - (slope * mean_x)

    spread = max(values) - min(values)
    normalized_change = abs(slope) * max(len(values) - 1, 1) / spread if spread else 0.0
    if normalized_change < 0.15:
        direction = 'stable'
    elif slope > 0:
        direction = 'increasing'
    else:
        direction = 'declining'

    trend_line = [intercept + (slope * x_value) for x_value in x_values]
    moving_average = build_moving_average(values)
    outlier_indexes = detect_outliers(values)
    value_std = statistics.stdev(values) if len(values) > 1 else 0.0
    spike_threshold = max(value_std * 1.25, (spread * 0.12) if spread else 0.0)
    spikes = [
        {
            'index': index + 1,
            'value': values[index],
            'moving_average': moving_average[index],
            'delta': abs(values[index] - moving_average[index]) if moving_average[index] is not None else None,
        }
        for index in range(len(values))
        if moving_average[index] is not None and abs(values[index] - moving_average[index]) >= spike_threshold
    ]

    return {
        'slope': slope,
        'intercept': intercept,
        'direction': direction,
        'trend_line': trend_line,
        'moving_average': moving_average,
        'outliers': [
            {
                'index': index + 1,
                'value': values[index],
            }
            for index in outlier_indexes
        ],
        'spikes': spikes,
    }


def build_descriptive_statistics(numeric_values: Dict[str, List[Optional[float]]], numeric_columns: Sequence[str]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for column in numeric_columns:
        summary = summarize_series(numeric_values[column])
        rows.append({
            'field': column,
            'mean': summary['mean'],
            'median': summary['median'],
            'mode': summary['mode'],
            'minimum': summary['minimum'],
            'maximum': summary['maximum'],
            'std_dev': summary['std_dev'],
            'variance': summary['variance'],
            'count': summary['count'],
        })
    return rows


def build_trend_series(rows: Sequence[Dict[str, Any]], headers: Sequence[str], target_columns: Sequence[str]) -> Dict[str, Any]:
    trends: Dict[str, Any] = {}
    for column in target_columns:
        actual_column = find_header(headers, [column, column.replace(' ', '_')])
        if not actual_column:
            continue

        values: List[float] = []
        labels: List[str] = []
        for index, row in enumerate(rows):
            value = parse_numeric(row.get(actual_column, ''))
            if value is not None:
                values.append(value)
                labels.append(str(index + 1))

        if not values:
            continue

        trend = compute_trend(values)
        summary = summarize_series(values)
        trends[actual_column] = {
            'field': actual_column,
            'labels': labels,
            'values': values,
            'moving_average': trend['moving_average'],
            'trend_line': trend['trend_line'],
            'slope': trend['slope'],
            'intercept': trend['intercept'],
            'direction': trend['direction'],
            'outliers': trend['outliers'],
            'spikes': trend['spikes'],
            'summary': summary,
        }

    return trends


def build_overall_statistics(pooled_values: Sequence[float]) -> Dict[str, Any]:
    summary = summarize_series(pooled_values)
    return {
        'mean': summary['mean'],
        'median': summary['median'],
        'mode': summary['mode'],
        'minimum': summary['minimum'],
        'maximum': summary['maximum'],
        'count': summary['count'],
    }


def build_correlation_summary(correlation: Dict[str, Dict[str, float]], numeric_columns: Sequence[str]) -> Dict[str, Any]:
    relationships: List[Dict[str, Any]] = []
    for index, first_column in enumerate(numeric_columns):
        for second_column in numeric_columns[index + 1:]:
            value = correlation[first_column][second_column]
            relationships.append({
                'first': first_column,
                'second': second_column,
                'value': value,
                'strength': correlation_label(value),
            })

    strongest = max(relationships, key=lambda item: abs(item['value'])) if relationships else None
    weakest = min(relationships, key=lambda item: abs(item['value'])) if relationships else None
    positive = [item for item in relationships if item['value'] > 0 and abs(item['value']) >= 0.35]
    negative = [item for item in relationships if item['value'] < 0 and abs(item['value']) >= 0.35]
    weak = [item for item in relationships if 0.15 <= abs(item['value']) < 0.35]
    no_correlation = [item for item in relationships if abs(item['value']) < 0.15]

    return {
        'matrix': correlation,
        'relationships': relationships,
        'strongest_relationship': strongest,
        'weakest_relationship': weakest,
        'positive_correlations': positive,
        'negative_correlations': negative,
        'weak_correlations': weak,
        'no_correlations': no_correlation,
    }


def build_insights(
    numeric_values: Dict[str, List[Optional[float]]],
    numeric_columns: Sequence[str],
    descriptive_statistics: Sequence[Dict[str, Any]],
    correlation_summary: Dict[str, Any],
    trend_analysis: Dict[str, Any],
) -> List[str]:
    insights: List[str] = []

    summary_lookup = {item['field']: item for item in descriptive_statistics}
    summary_values: List[str] = []
    for target in TARGET_TREND_COLUMNS:
        actual_column = next((column for column in numeric_columns if normalize_header(column) == normalize_header(target)), None)
        if not actual_column:
            continue
        summary = summary_lookup.get(actual_column)
        if summary and summary['mean'] is not None:
            summary_values.append(f"{actual_column}: {summary['mean']:.1f}")

    if summary_values:
        if len(summary_values) == 1:
            insights.append(f"Average {summary_values[0]}.")
        else:
            insights.append(f"Average values are {', '.join(summary_values[:-1])}, and {summary_values[-1]}.")

    final_column = next((column for column in numeric_columns if normalize_header(column) == normalize_header('Final Score')), None)
    midterm_column = next((column for column in numeric_columns if normalize_header(column) == normalize_header('Midterm Score')), None)
    attendance_column = next((column for column in numeric_columns if normalize_header(column) == normalize_header('Attendance')), None)

    performance_notes: List[str] = []
    if final_column and midterm_column:
        final_mean = summary_lookup.get(final_column, {}).get('mean')
        midterm_mean = summary_lookup.get(midterm_column, {}).get('mean')
        if final_mean is not None and midterm_mean is not None:
            if final_mean > midterm_mean:
                performance_notes.append('Final scores are generally higher than Midterm scores.')
            elif final_mean < midterm_mean:
                performance_notes.append('Midterm scores are generally higher than Final scores.')

    if attendance_column and final_column:
        attendance_final = correlation_summary['matrix'].get(attendance_column, {}).get(final_column)
        if attendance_final is not None:
            if attendance_final >= 0.35:
                performance_notes.append('Attendance has a positive correlation with Final Score, so higher attendance tends to align with better performance.')
            elif attendance_final <= -0.35:
                performance_notes.append('Attendance has a negative correlation with Final Score.')

    if performance_notes:
        insights.append(' '.join(performance_notes))

    pooled_values = flatten_numeric_values(numeric_values, numeric_columns)
    if pooled_values:
        pooled_summary = summarize_series(pooled_values)
        if pooled_summary['median'] is not None and pooled_summary['minimum'] is not None and pooled_summary['maximum'] is not None:
            insights.append(f"Numeric values range from {pooled_summary['minimum']:.1f} to {pooled_summary['maximum']:.1f}, with a median of {pooled_summary['median']:.1f}.")

    anomaly_count = sum(len(item['outliers']) + len(item['spikes']) for item in trend_analysis.values())
    if anomaly_count:
        insights.append(f"{anomaly_count} unusual anomaly points were detected across the trend analysis.")
    else:
        insights.append('No unusual anomalies detected.')

    strongest = correlation_summary.get('strongest_relationship')
    if strongest:
        insights.append(f"Strongest relationship is between {strongest['first']} and {strongest['second']} ({strongest['value']:.2f}).")

    return insights


def build_relationship_explanations(correlation_summary: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'strongest_relationship': correlation_summary.get('strongest_relationship'),
        'weakest_relationship': correlation_summary.get('weakest_relationship'),
        'positive_correlations': correlation_summary.get('positive_correlations', []),
        'negative_correlations': correlation_summary.get('negative_correlations', []),
        'weak_correlations': correlation_summary.get('weak_correlations', []),
        'no_correlations': correlation_summary.get('no_correlations', []),
    }


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'message': 'Usage: analyze_dataset.py <input_csv>'}))
        return

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(json.dumps({'success': False, 'message': 'Input file not found'}))
        return

    headers, rows = load_rows(input_path)
    if not rows:
        print(json.dumps({'success': False, 'message': 'No data rows found'}))
        return

    numeric_values: Dict[str, List[Optional[float]]] = defaultdict(list)
    for row in rows:
        for column in headers:
            numeric_values[column].append(parse_numeric(row.get(column, '')))

    numeric_columns = [column for column in headers if any(value is not None for value in numeric_values[column])]
    pooled_values = flatten_numeric_values(numeric_values, numeric_columns)
    descriptive_statistics = build_descriptive_statistics(numeric_values, numeric_columns)
    overall_statistics = build_overall_statistics(pooled_values)
    correlation = correlation_matrix(numeric_values, numeric_columns)
    correlation_summary = build_correlation_summary(correlation, numeric_columns)
    trend_analysis = build_trend_series(rows, headers, TARGET_TREND_COLUMNS)
    insights = build_insights(numeric_values, numeric_columns, descriptive_statistics, correlation_summary, trend_analysis)

    result = {
        'success': True,
        'total_rows': len(rows),
        'numeric_columns': numeric_columns,
        'overall_statistics': overall_statistics,
        'descriptive_statistics': descriptive_statistics,
        'correlation': correlation,
        'correlation_summary': build_relationship_explanations(correlation_summary),
        'trend_analysis': trend_analysis,
        'insights': insights,
        'numeric_stats': {
            item['field']: {
                'count': item['count'],
                'mean': item['mean'],
                'median': item['median'],
                'mode': item['mode'],
                'min': item['minimum'],
                'max': item['maximum'],
                'std': item['std_dev'],
                'variance': item['variance'],
            }
            for item in descriptive_statistics
        },
        'trends': {
            field: {
                'slope': data['slope'],
                'direction': data['direction'],
            }
            for field, data in trend_analysis.items()
        },
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
