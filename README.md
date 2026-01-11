# Ving | AI Video Generator

**Ving** is a modern, privacy-focused AI video generation platform that lets you create stunning videos using Google's Veo 3.1 and Kling AI models.

Built with a "Bring Your Own Key" (BYOK) architecture, Ving ensures your API keys never leave your browser, giving you full control and security while accessing state-of-the-art video generation capabilities.

<br>

![Ving Interface Preview](/placeholder-image.png)

<br>

## Features

- **Multi-Model Support**: Generate videos using **Google Veo 3.1** or **Kling 2.6**.
- **BYOK Privacy**: Your API keys are stored locally in your browser. No middleman server.
- **Cinematic Presets**: One-click professional prompts for advertisements, fashion, movies, and more.
- **Motion Control**: (Coming Soon) precise control over camera movement and dynamics.
- **Script to Video**: Turn your ideas into video scripts and generate matching clips.
- **Modern UI**: Sleek, dark-mode interface designed for creative workflows.

## Getting Started

### Prerequisites

- Node.js 18+ installed.
- API Keys for [Google Gemini/Veo](https://aistudio.google.com/) or Kling AI.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/takashilouis/ving.git
   cd ving
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Enter API Key**: Click the settings icon in the sidebar and enter your Google Gemini or Kling API key.
2. **Choose a Preset**: distinct categories like *Cinematic*, *Advertisement*, or *Fashion* to get started quickly.
3. **Customize**: Edit the prompt, adjust aspect ratio (16:9, 9:16), and set duration.
4. **Generate**: Click "Generate" and watch your vision come to life.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Language**: TypeScript

## License

MIT
