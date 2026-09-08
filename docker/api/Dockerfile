FROM php:8.3-apache

RUN docker-php-ext-install mysqli pdo pdo_mysql \
    && a2enmod rewrite

COPY docker/api/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/api/docker-entrypoint.sh /usr/local/bin/vipward-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/vipward-entrypoint.sh \
    && chmod +x /usr/local/bin/vipward-entrypoint.sh

WORKDIR /var/www/html
COPY api/ /var/www/html/api/

EXPOSE 80

ENTRYPOINT ["vipward-entrypoint.sh"]
