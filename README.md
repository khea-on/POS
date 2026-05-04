# POS System Guide

This project is a React-based POS frontend for daily cashier work and admin operations.

## In-App Help

After signing in, open the `Help` page from the left menu. It explains:

- cashier workflow
- admin workflow
- invoice and checkout usage
- inventory, reports, and audit log usage
- basic operating tips for shared devices

## Main Screens

- `POS Terminal`
  Use this screen to search products, choose a size, add items to the cart, and complete checkout.
- `Dashboard`
  Shows daily sales, order totals, product totals, and summary charts.
- `Inventory Management` (`Admin`)
  Search stock, filter inventory, import or export CSV, create or edit products, and adjust stock.
- `Reports` (`Admin`)
  Shows daily sales, monthly sales, and top-selling items.
- `Audit Logs` (`Admin`)
  Shows filtered user and data activity. Audit timestamps are displayed in Cambodia time (`UTC+7`).
- `Settings`
  Update the current profile image. Admins can also manage users here.

## Cashier Workflow

1. Sign in with a valid account.
2. Open `POS Terminal`.
3. Search for a product and select the correct size.
4. Add items to the cart and verify quantity and total.
5. Press `Checkout`.
6. Use the invoice screen to review recent orders or print a receipt again if needed.
7. Log out before leaving a shared device.

## Admin Workflow

1. Review `Dashboard` for current business activity.
2. Open `Inventory Management` to update stock or maintain products.
3. Use `Reports` to check sales performance.
4. Use `Audit Logs` to review login activity or data changes.
5. Open `Settings` to manage user accounts when required.

## CSV Notes

Inventory import/export is designed around product data such as:

- `name`
- `sku`
- `imageUrl`
- `smallPrice`
- `mediumPrice`
- `largePrice`
- `stockQuantity`
- `isActive`

Before importing, confirm the headers and values are correct.

## Local Development

```bash
npm install
npm run dev
```

To run against `POSAPI_Cloud`, start the API first:

```bash
cd ../POSAPI_Cloud
dotnet run
```

Then start this frontend in cloud mode:

```bash
cd ../POS
npm run dev:cloud
```

The frontend runs on `http://localhost:5174` and proxies `/api` to `http://localhost:5022`.

## Production Build

```bash
npm run build
```
