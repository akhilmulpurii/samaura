<h1 align="center">
  <br>
    <a href="https://github.com/akhilmulpurii/aperture"><img src="https://github.com/akhilmulpurii/aperture/blob/main/public/assets/logo/icon.png?raw=true" alt="APERTÚRE" width="200"></a>
  <br>
  APERTÚRE
  <br>
</h1>
<h4 align="center">A Modern, Streamlined Jellyfin Client built with Next.js</h4>

https://github.com/user-attachments/assets/a35d71e2-14bf-475f-9e54-a0cf2c7bc044

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="screenshots/series/theming.png" alt="Dark Theme" width="500">
      </td>
      <td align="center">
        <img src="screenshots/series/quick_connect.png" alt="Dark Theme" width="500">
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="screenshots/series/light.png" alt="Light Theme" width="500">
      </td>
      <td align="center">
        <img src="screenshots/series/dark.png" alt="Dark Theme" width="500">
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="screenshots/series/collections.png" alt="Dark Theme" width="500">
      </td>
      <td align="center">
        <img src="screenshots/series/player.png" alt="Dark Theme" width="500">
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="screenshots/series/details.png" alt="Dark Theme" width="500">
      </td>
      <td align="center">
        <img src="screenshots/series/profile.png" alt="Dark Theme" width="500">
      </td>
    </tr>
  </table>
</div>

---

## ✨ Overview

**APERTÚRE** is a clean, modern Jellyfin client built with **Next.js** — designed for speed, simplicity, and elegance.  
It builds upon the solid foundation of **[Finetic](https://github.com/AyaanZaveri/finetic)** while introducing extended functionality and removing unnecessary complexity.

Join Discord Community - [Discord Invite](https://discord.gg/8UrJehgqnj)

Special Thanks to **[@AyaanZaveri](https://github.com/AyaanZaveri)**, this is based on his work on finetic, but I am building it upon my personal preferences.

### 🔹 Hero Features

- **Rich Media Experience** – Native support for **Video Backdrops**, **Theme Songs**, and **Trickplay** thumbnails.
- **Smart Connectivity** – **Quick Connect** login support and intelligent **Direct Play/Transcoding** selection.
- **Advanced Library Support** – Integrated support for **Collections (Box Sets)** and Live TV (WIP).
- **Theming** – Multiple theme variations including "Cinematic Theatre Black".
- **Redesigned Playback Engine** – A seamless, rebuilt playback subsystem aligned with Jellyfin best practices for reliable and smooth streaming.
- **Hero Media Bar** – A new, visually striking "Hero" section at the top of the interface to showcase your highlighted content.
- **Smart Episodic Features** – Native support for **Intro and Outro skipping** to make binge-watching effortless (requires the [Intro Skipper plugin](https://github.com/intro-skipper/intro-skipper) on your server).
- **Mini Player** – Keep watching your content while browsing the rest of your library with the new Picture-in-Picture mode.
- ~~**Better Connectivity** – Added **Local Network Discovery** and saved server preferences to make connecting (and staying connected) easier.~~ **Note: Removed this due to inaccuracy**
- **Refined Startup** – A proper **Splash Screen** now handles initialization, ensuring the app launches smoothly and efficiently every time.
- **Seerr Integration** - Built-in support to integrate Jellyseerr or Overseerr, Once connected, requests can be made directly on the discover page or using the existing search component.

---

## 🧠 Built With

- **Frontend**: Next.js, TypeScript
- **Styling**: Tailwind v4, shadcn/ui, Framer Motion
- **State Management**: Jotai
- **Media Backend**: Jellyfin Server API, Seerr OpenAPI

---

## ⚙️ Instructions

### 🐳 Environment Variables

```env
DEFAULT_SERVER_URL=your_server_url
```


### 🐳 Run with Docker (Recommended)

Docker is the recommended way to run the app. The Docker image is directly available on Docker Hub at `akhilmulpuri/aperture-web`.

**Using Docker Compose (`docker-compose.yml`)**

```yaml
services:
  aperture:
    image: akhilmulpuri/aperture-web:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
```

```bash
docker-compose up -d
```

**Using Docker Run**

```bash
docker run -d -p 3000:3000 --name aperture-web --restart unless-stopped akhilmulpuri/aperture-web:latest
```

### 💻 Local Development

1. **Install dependencies**
   ```bash
   bun install
   ```
2. **Start the Next.js dev server**
   ```bash
   bun dev
   ```
3. Visit `http://localhost:3000` and sign in with your Jellyfin instance credentials.

Hot reloading is enabled by default, so UI changes are reflected immediately.

### Production Build

Create an optimized bundle served by any static host (Vercel, Netlify, S3, etc.):

```bash
bun build
bun preview   # optional sanity check
```

The generated assets live in `dist/`. Configure your host to fall back to `index.html` for SPA routing.

### Public HTTP Jellyfin Servers

The hosted app at `https://aperture-client.vercel.app` runs over HTTPS. Modern browsers block requests from an HTTPS site to **public** HTTP endpoints for security reasons, which means remote servers such as `http://23.x.x.x:8096` cannot be reached. To use Apertúre with a public server:

1. Add HTTPS to your Jellyfin instance (Let's Encrypt, Caddy/NGINX reverse proxy, Cloudflare tunnel, etc.), or
2. Run Apertúre locally (bun dev, Docker) over HTTP.

LAN/private IPs (192.168.x.x, 10.x.x.x, etc.) generally still work over HTTP because browsers treat them as “private network” resources, but for anything exposed to the internet you’ll need HTTPS.
