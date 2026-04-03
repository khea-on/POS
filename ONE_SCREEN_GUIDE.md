# POS One Screen Guide

## Main Paths

- Frontend: `C:\Users\ROG\Documents\ReactJs\POS`
- Backend: `C:\Users\ROG\Documents\ReactJs\POSAPI\POSAPI`
- API IIS: `C:\inetpub\wwwroot\POSAPI`
- Web IIS: `C:\inetpub\wwwroot\POS`
- Android APK: `C:\Users\ROG\Documents\ReactJs\POS\mobile-builds\POS-debug.apk`

## 1. Run API Local

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POSAPI\POSAPI"
dotnet run --launch-profile http
```

API URL:

```text
http://192.168.1.200:5000/api
```

## 2. Run Web Local

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POS"
npm install
npm run dev -- --host 0.0.0.0
```

Phone test URL:

```text
http://192.168.1.200:5174
```

## 3. Build Web For IIS

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POS"
npm run build:iisroot
robocopy dist C:\inetpub\wwwroot\POS /MIR
iisreset
```

## 4. Publish API To IIS

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POSAPI\POSAPI"
dotnet publish POSAPI.csproj -c Release -o "C:\inetpub\wwwroot\POSAPI"
iisreset
```

## 5. Build Android APK

```powershell
cd "C:\Users\ROG\Documents\ReactJs\POS"
npm run mobile:apk
```

APK file:

```text
C:\Users\ROG\Documents\ReactJs\POS\mobile-builds\POS-debug.apk
```

## 6. Important Files

- Web API config: [`.env.iisroot`](c:/Users/ROG/Documents/ReactJs/POS/.env.iisroot)
- Mobile API config: [`.env.mobile`](c:/Users/ROG/Documents/ReactJs/POS/.env.mobile)
- Old web notes: [`note.txt`](c:/Users/ROG/Documents/ReactJs/POS/note.txt)
- Old API notes: [`allow.port`](c:/Users/ROG/Documents/ReactJs/POSAPI/allow.port)

## 7. Remember

- If server IP changes, update both `.env.iisroot` and `.env.mobile`
- `APK` installs on Android only
- iPhone should use web app in Safari, or later build an iOS app on Mac/Xcode
