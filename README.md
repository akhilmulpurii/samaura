<h1 align="center">
  <br>
    <a href="https://github.com/akhilmulpurii/samaura"><img src="https://github.com/akhilmulpurii/samaura/blob/main/public/logo/desktop/samaura.png?raw=true" alt="SAMAURA" width="200"></a>
  <br>
  SAMAURA
  <br>
</h1>
<h4 align="center">A Modern, Streamlined Jellyfin Client built with Vite+React+Tauri</h4>

https://github.com/user-attachments/assets/07fb5741-1edf-4655-9001-6df3e2b1c72b

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="screenshots/series/light.png" alt="Light Theme" width="500">
      </td>
      <td align="center">
        <img src="screenshots/series/dark.png" alt="Dark Theme" width="500">
      </td>
      <td align="center">
        <img src="screenshots/series/collections.png" alt="Dark Theme" width="500">
      </td>
    </tr>
  </table>
</div>

---

## ✨ Overview

**SAMAURA** is a clean, modern Jellyfin client built with **Vite+React.js** — designed for speed, simplicity, and elegance.  
It builds upon the solid foundation of **[Finetic](https://github.com/AyaanZaveri/finetic)** while introducing extended functionality and removing unnecessary complexity.

Special Thanks to **[@AyaanZaveri](https://github.com/AyaanZaveri)**, this is based on his work on finetic, but I am building it upon my personal preferences.

### 🔹 What’s New in SAMAURA

- **Simplified Experience** – Removed AI dependencies for a faster, lighter client, as I personally would not use them at all.
- **Migrated to Vite** - The Entire Project is migrated into Vite + React, since Vite is much faster than webpack and we dont really need SSR features for an application like this.
- **Collections Support** – Full integration for browsing and playing box sets
- **Live TV (WIP)** – Live TV currently works partially, Channels populate but a guide and programs page must be integrated.
- **Improved Navigation & Performance** – Cleaner architecture and optimized loading
- **Theming Enhancements** – Liquid Glass like Theme coming soon
- **Using Tauri instead of Electron** – Now native apps will be based on tauri for better performance, especially with Vite + React + Tauri

---

## 🧠 Built With

- **Frontend**: React, Vite, TypeScript, Tauri
- **Styling**: Tailwind v4, shadcn/ui, Framer Motion
- **State Management**: Jotai
- **Media Backend**: Jellyfin Server API
