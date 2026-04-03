# POS Mobile Project

This POS project is now prepared as a mobile-ready web app inside the existing `POS` frontend.

## What is already mobile-ready

- Responsive phone layout for the shared POS/CRM shell
- Bottom mobile navigation dock
- Safe-area spacing for iPhone/Android browsers
- Mobile-friendly CRM Attendance workflow
- Camera barcode scan improvements
- Barcode image upload with phone camera capture support
- Web app manifest, mobile icon, and service worker registration for production builds

## Backend

Keep using the existing `POSAPI` project.

You do not need a new backend language for mobile.

## Build for deployment

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POS"
npm run build:iisroot
robocopy dist C:\inetpub\wwwroot\POS /MIR
```

## Build Android APK

The Android wrapper is already created with Capacitor.

Use:

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POS"
npm run mobile:apk
```

APK output:

```text
C:\Users\ROG\Documents\ReactJs\POS\mobile-builds\POS-debug.apk
```

The Android build uses:

- portable JDK 21 in `C:\Users\ROG\Documents\ReactJs\_buildtools\jdk21`
- local Android SDK in `C:\Users\ROG\AppData\Local\Android\Sdk`

If you move this project to another PC, update those tool paths or install Java/Android tools there.

## Mobile access

- Open the deployed app from a phone browser
- Use HTTPS if you want live camera scanning
- Add the site to the home screen for app-style launching

## If you want a store app later

- Capacitor: fastest path to Android/iPhone packages using this same frontend
- React Native: best choice if you want a fully native mobile app with dedicated scanner libraries

Both options can keep the same `POSAPI` backend.

## Important mobile API setting

The mobile build uses [`.env.mobile`](c:/Users/ROG/Documents/ReactJs/POS/.env.mobile) and currently points to:

```text
http://192.168.1.200:5000/api
```

Change that file if your phone should call a different `POSAPI` server.
