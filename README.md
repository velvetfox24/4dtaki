# 4D-Taki

Welcome to **4D-Taki**, a 4x4x4 3D Tic-Tac-Toe game with a stunning 'Cyber-Grid' aesthetic, built entirely with web technologies (HTML, CSS, JavaScript, and Three.js).

Brought to you by **4creative-innovations**  
Developed by **Zerostasis & 4Creative-Teams**

## Features

- **True 3D Gameplay:** Play on a fully interactive 4x4x4 grid. Orbit, click, and strategize in true 3D space.
- **76 Win Conditions:** Win by connecting 4 cubes in a row along any axis, face diagonal, or main 3D diagonal.
- **Cyber-Grid Aesthetic:** Immerse yourself in the dark grid. Features a glowing floor, boundary walls, and animated light cycles driving around the perimeter.
- **Multiplayer & AI Modes:** Play locally against another human, or test your skills against a CPU (with configurable difficulties).
- **Two-Step Interaction:** Click once to highlight a target and visualize its intersecting axes with translucent light ribbons; click again to confirm your move.
- **Cross-Platform Ready:** Designed to run seamlessly in the browser or be bundled into a native mobile app via [Capacitor](https://capacitorjs.com/).

## Try It Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/velvetfox24/4dtaki.git
   cd 4dtaki
   ```

2. Start a local HTTP server from the project directory:
   ```bash
   python3 -m http.server 8080
   ```
   *(Or use any other web server like Live Server or `npx serve`)*

3. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

## Development and Build (Capacitor)

The project includes a `setup.sh` script to configure NPM and Capacitor. Once configured, you can build for Android/iOS:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Sync web assets with Capacitor native platforms:
   ```bash
   npx cap sync
   ```

3. Open the Android project in Android Studio (if added):
   ```bash
   npx cap open android
   ```

## Project Structure

- `index.html` - The main entry point containing the game overlay, setup menus, and Three.js canvas container.
- `style.css` - Custom styles featuring neon glows, gradients, and custom overlays tailored to the cyber theme.
- `game.js` - The core engine driving the Three.js 3D rendering, scene management, user click raycasting, game state, win evaluation, and light cycle animations.
- `setup.sh` - Optional script for initializing a Capacitor mobile project setup.

## Roadmap Integrations
- [ ] Implement advanced AI (Minimax & Alpha-Beta Pruning) for harder difficulties.
- [ ] Integrate Firebase for persistent Win/Loss tracking and leaderboards.
- [ ] Connect LLM API to the "Get LLM Hint" system for intelligent strategic guidance.
