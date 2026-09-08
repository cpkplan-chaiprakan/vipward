#!/bin/sh
set -e

echo "waiting for mysql..."
i=0
until php -r '
$c = @mysqli_init();
if (!$c) { exit(1); }
mysqli_options($c, MYSQLI_OPT_CONNECT_TIMEOUT, 3);
$host = getenv("DB_HOST") ?: "db";
$user = getenv("DB_USER") ?: "";
$pass = getenv("DB_PASS") ?: "";
$name = getenv("DB_NAME") ?: "";
$port = intval(getenv("DB_PORT") ?: 3306);
if (!@mysqli_real_connect($c, $host, $user, $pass, $name, $port)) { exit(1); }
exit(0);
'; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "mysql is not ready"
    exit 1
  fi
  sleep 2
done

php /var/www/html/api/migrate.php
exec apache2-foreground
