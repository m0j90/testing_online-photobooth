# Use official PHP image with Apache
FROM php:8.2-apache

# Install system dependencies required for GD and other extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions (GD is needed for image handling)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql mysqli

# Enable Apache mod_rewrite for custom routing/clean URLs
RUN a2enmod rewrite

# Copy project files to Apache's default root
COPY . /var/www/html/

# Set correct ownership and permissions for PHP file writing (e.g., uploads folder)
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Configure Apache to listen on Render's dynamic $PORT (defaults to 10000)
ENV PORT=10000
EXPOSE 10000

# Update Apache port configurations dynamically at runtime
RUN sed -i 's/80/${PORT}/g' /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf

# Start Apache in the foreground
CMD ["apache2-foreground"]