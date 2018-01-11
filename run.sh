rm compiled.json
node compile.js

rm ./static/bundle.js
#browserify -t brfs app.js -o ./static/bundle.js
watchify -t brfs app.js -o ./static/bundle.js
