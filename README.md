# DailyDish

Run the local site with Node.js 22 or later.

```sh
npm start
```

Open [the menu](http://localhost:3000) or [Kitchen admin](http://localhost:3000/admin.html). Run `npm test` to check the cutoff, discount, stock, combo, and bulk-order rules.

For development, run `npm run dev`. Node restarts the server when the server or an imported module changes. Refresh the browser to load updated HTML, CSS, and client-side JavaScript.

The demo includes sample delivery sites, menu items, nutrition, and prices. Checkout persists demo orders locally and uses no payment or OTP services. Bulk packs use regular pricing. The included meal fees and tax are illustrative. Replace this sample data and connect the appropriate services before taking real orders.

Kitchen admin accepts any nonempty password in demo mode. Set `DAILYDISH_ADMIN_KEY` in the server environment before starting a shared or public instance to require that password. Admin sessions expire after eight hours or when the server restarts. Set `DAILYDISH_SECURE_COOKIES=1` when serving the app behind HTTPS.

The server stores published menus and demo orders in `.data/store.json` locally. Set `DAILYDISH_DATA_DIR` to use another data directory.

## Vercel demo

Deploy the repository root. The root URL serves the menu, and Kitchen admin goes through the Node server for sign-in. Set `DAILYDISH_ADMIN_KEY` in the Vercel project before sharing the demo publicly.

On Vercel, demo orders and menu changes use temporary storage. Admin sessions and saved data can reset when Vercel replaces the running instance.
