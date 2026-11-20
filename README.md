# DailyDish

Run the local site with Node.js 22 or later.

```sh
npm start
```

Open [the menu](http://localhost:3000) or [Kitchen admin](http://localhost:3000/admin.html). Run `npm test` to check the cutoff, discount, stock, combo, and bulk-order rules.

For development, run `npm run dev`. Node restarts the server when the server or an imported module changes. Refresh the browser to load updated HTML, CSS, and client-side JavaScript.

The demo includes sample delivery sites, menu items, nutrition, and prices. Checkout persists demo orders locally and uses no payment or OTP services. Bulk packs use regular pricing. The included meal fees and tax are illustrative. Replace this sample data and connect the appropriate services before taking real orders.

The server stores published menus and demo orders in `.data/store.json`. Set `DAILYDISH_ADMIN_KEY` to require an admin key for publishing or `DAILYDISH_DATA_DIR` to use another data directory.
