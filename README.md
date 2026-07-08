# Data Science Hub — Local Dev Notes

Quick steps to run data processing features locally.

1) Create database and tables

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p data_science_hub < database/jobs.sql
mysql -u root -p data_science_hub < database/seed.sql
```

2) Install Python dependencies

```bash
pip install -r python/requirements.txt
```

3) Start worker (processes one job at a time). Run periodically or via supervisor/cron:

```bash
php workers/process_jobs.php
```

4) Submit job (example via curl):

```bash
curl -X POST -d "job_type=clean&dataset_id=123" -b cookiejar.txt http://localhost/Data/api/jobs/submit.php
```

Notes
- PHP APIs call Python scripts by invoking `python` on PATH. If your environment uses `python3` or a full path, update the `$python` variable inside the API/worker files.
- For production, run the worker continuously and add locking and retry policies.
