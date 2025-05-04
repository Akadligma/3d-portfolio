#!/bin/bash

# Create necessary directories if they don't exist
mkdir -p src/assets/artworks

# Create placeholder artwork files
echo "Creating placeholder artwork files..."
convert -size 512x512 xc:navy -pointsize 40 -fill white -gravity center -annotate 0 "Abstract Composition #1" src/assets/artworks/placeholder-artwork-1.jpg || echo "Warning: ImageMagick not installed. Placeholder images will not be created."
convert -size 512x512 xc:teal -pointsize 40 -fill white -gravity center -annotate 0 "Serenity" src/assets/artworks/placeholder-artwork-2.jpg || echo "Not creating placeholders, continuing with setup..."
convert -size 512x512 xc:maroon -pointsize 40 -fill white -gravity center -annotate 0 "Urban Fragments" src/assets/artworks/placeholder-artwork-3.jpg

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the development server
echo "Starting development server..."
npm start