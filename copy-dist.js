const fs = require("fs");

fs.copyFileSync(
    "dist/activity.html",
    "dist/index.html"
);

console.log("dist/index.html criado.");
