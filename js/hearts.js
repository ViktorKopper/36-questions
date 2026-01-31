/* ================================
   Background hearts generator
   ================================ */

(function generateHearts() {
  const container = document.getElementById("hearts-bg");
  if (!container) return;

  const HEART_COUNT = 28; // uprav podľa chuti

  for (let i = 0; i < HEART_COUNT; i++) {
    const heart = document.createElement("div");
    heart.className = "heart";

    const size = Math.random() * 120 + 40; // 40px – 160px
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const opacity = Math.random() * 0.25 + 0.05;
    const brightness = Math.random() * 0.6 + 0.5;
    const rotation = Math.random() * 40 - 20;

    heart.style.width = `${size}px`;
    heart.style.height = `${size}px`;
    heart.style.left = `${x}%`;
    heart.style.top = `${y}%`;
    heart.style.opacity = opacity;
    heart.style.filter = `brightness(${brightness})`;
    heart.style.setProperty("--rot", `${rotation}deg`);

    container.appendChild(heart);
  }
})();
