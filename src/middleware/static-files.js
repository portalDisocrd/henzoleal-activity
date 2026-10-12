const path = require("path");

function registerStaticFiles({ app, express, rootDir }) {
    const publicFiles = new Map([
        ["/logo-hl.png", "logo-hl.png"],
        ["/hl-social.css", "hl-social.css"],
        ["/hl-social.js", "hl-social.js"],
        ["/activity-client.js", "activity-client.js"]
    ]);

    for (const [route, file] of publicFiles) {
        app.get(route, (req, res) => res.sendFile(path.join(rootDir, file)));
    }

    app.use(
        "/sounds",
        express.static(path.join(rootDir, "sounds"), {
            dotfiles: "deny",
            index: false,
            immutable: process.env.NODE_ENV === "production",
            maxAge: process.env.NODE_ENV === "production" ? "1d" : 0
        })
    );

    app.use(
        "/assets",
        express.static(path.join(rootDir, "dist", "assets"), {
            dotfiles: "deny",
            index: false,
            immutable: process.env.NODE_ENV === "production",
            maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
        })
    );
}

module.exports = { registerStaticFiles };
