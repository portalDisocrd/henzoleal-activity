const path = require("path");

function registerStaticFiles({ app, express, rootDir }) {
    const publicFiles = new Map([
        ["/logo-hl.png", "logo-hl.png"],
        ["/hl-social.css", "hl-social.css"],
        ["/hl-v4.css", "hl-v4.css"],
        ["/hl-v5.css", "hl-v5.css"],
        ["/hl-v6.css", "hl-v6.css"],
        ["/hl-v7.css", "hl-v7.css"],
        ["/hl-v9.css", "hl-v9.css"],
        ["/hl-social.js", "hl-social.js"],
        ["/activity-client.js", "activity-client.js"],
        ["/home.css", "home.css"],
        ["/home.js", "home.js"],
        ["/room.css", "room.css"],
        ["/room-core.js", "room-core.js"],
        ["/activity.css", "activity.css"],
        ["/activity-room.css", "activity-room.css"],
        ["/activity-room-core.js", "activity-room-core.js"],
        ["/hl-v10.css", "hl-v10.css"],
        ["/hl-v102.css", "hl-v102.css"],
        ["/hl-v103.css", "hl-v103.css"],
        ["/hl-v10.js", "hl-v10.js"],
        ["/hl-pwa.js", "hl-pwa.js"],
        ["/home-v10.js", "home-v10.js"],
        ["/manifest.webmanifest", "manifest.webmanifest"],
        ["/sw.js", "sw.js"],
        ["/icon-192.png", "icon-192.png"],
        ["/icon-512.png", "icon-512.png"],
        ["/not-found.css", "not-found.css"]
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
