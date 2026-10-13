const path = require("path");

function registerStaticFiles({ app, express, rootDir }) {
    const publicFiles = new Map([
        ["/logo-hl.png", "logo-hl.png"],
        ["/logo-hl.webp", "logo-hl.webp"],
        ["/activity-client.js", "activity-client.js"],
        ["/home.css", "home.css"],
        ["/home.js", "home.js"],
        ["/room-core.js", "room-core.js"],
        ["/activity.css", "activity.css"],
        ["/manifest.webmanifest", "manifest.webmanifest"],
        ["/sw.js", "sw.js"],
        ["/icon-192.png", "icon-192.png"],
        ["/icon-512.png", "icon-512.png"],
        ["/not-found.css", "not-found.css"]
    ]);

    for (const [route, file] of publicFiles) {
        app.get(route, (req, res) => res.sendFile(path.join(rootDir, file)));
    }

    app.use("/styles", express.static(path.join(rootDir, "styles"), { dotfiles: "deny", index: false, maxAge: 0 }));
    app.use("/frontend", express.static(path.join(rootDir, "frontend"), { dotfiles: "deny", index: false, maxAge: 0 }));

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
