# VoiceHub 🎤

Look, I love Discord as much as the next guy. But sometimes, you're mid-match in Counter Strike, you meet some decent teammates, and you just want to coordinate **right now**. You don't want to deal with friend requests, server invites, creating accounts, or "what's your tag again?".

You just want a link. You click it, they click it, and you're talking.

That's why I built **VoiceHub**.

It started simple: I needed a way to drop a link in the game chat for instant voice comms. No signup, no installation, no nonsense. Just pure, peer-to-peer voice chat.

But then I thought, *"Wouldn't it be cool if I could show them this spot on the map?"* 👉 Added **Screen Sharing**.

Then, *"I need to send you this config file real quick."* 👉 Added **File Sharing**. (Heads up though: since it's direct P2P, sending massive files might be a bit laggy depending on your connection. Perfect for configs, demos, and screenshots—maybe not for 4K movies).

## Features

*   🚫 **0% Friction:** No login, no database, no tracking.
*   ⚡ **Instant Voice:** Low latency, optimized for gaming (mono channel, high bitrate).
*   🖥️ **Screen Share:** Show your screen with one click.
*   TB **File Drop:** Drag & drop files to share directly.
*   🔒 **Room Security:** Password protect your room if you don't want randoms crashing the party.
*   🎨 **CS2 Theme:** Because that's where it was born.

## Tech Stack

Built with vanilla JavaScript and **PeerJS** for the WebRTC magic. It's lightweight and runs entirely in the browser.

## How to Run

1.  Clone it.
2.  Open `index.html` via a local server (like Live Server).
3.  **Important:** For microphone access to work over the internet, you must serve this over **HTTPS** (Vercel, Netlify, Github Pages work great).
You can test it on my live server: **https://altaykrl.com/ses/**
Enjoy the comms! 🎮

