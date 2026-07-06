# Dentify Platform

Dentify is now structured as a first-pass full-stack study platform:

- `client/` - React + Vite frontend.
- `server/` - Express API with SQLite.
- `data/` - Local SQLite database created on first server run.

## Requirements

Use the included portable Node runtime when it exists under `.tools/`. If it is missing, install Node.js LTS from https://nodejs.org and run the standard npm commands below.

## Run Locally

Recommended on this machine:

```powershell
.\start-dentify.cmd
```

Standard Node/npm fallback:

```powershell
npm install
npm run dev
```

- Frontend: http://localhost:5050
- API: http://localhost:4000
- Demo login: `demo@dentify.local`
- Demo password: `dentify123`

## Useful Commands

With the portable runtime available, `start-dentify.cmd` handles the PATH automatically for development. For one-off commands in PowerShell:

```powershell
$nodeDir = ".\.tools\node-v24.16.0-win-x64"
$env:Path = "$nodeDir;$env:Path"
npm run seed
npm run test:api
npm run build
```

## Phone Testing

Run `ipconfig`, find your IPv4 address, then open this on the phone while connected to the same Wi-Fi:

```text
http://YOUR-IP:5173
```
