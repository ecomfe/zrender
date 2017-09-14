basePath=$(cd `dirname $0`; pwd)
cd ${basePath}/../
rm -r dist

npm run prepublish
rollup -c
uglifyjs ./dist/zrender.js -m -c -o ./dist/zrender.min.js