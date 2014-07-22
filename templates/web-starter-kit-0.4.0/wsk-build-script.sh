#!/bin/bash

echo "Building Web Starter Kit Project.";
cd ./web-starter-kit/;
gulp;

cd ../;

echo "Deleting files in ./www";
rm -rf ./www/*;

echo "Copying files from ./web-starter-kit/dist to ./www";
cp -r ./web-starter-kit/dist/* ./www/;
