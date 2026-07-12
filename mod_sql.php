<?php
$f = 'c:/xampp/htdocs/Data/sql.sql';
file_put_contents($f, "CREATE DATABASE IF NOT EXISTS data_science_hub;\n" . file_get_contents($f));
