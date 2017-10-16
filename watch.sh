#!/bin/bash

basePath=$(cd `dirname $0`; pwd)
cd ${basePath}/

./node_modules/.bin/rollup --config --watch
