const heartsBg = document.getElementById("hearts-bg");

const HEART_COUNT = 22; // viac, ale stale chill

function createHeart() {
  const heart = document.createElement("div");
  heart.className = "heart";

  const size = rand(100, 280);
  const left = rand(-10, 100);
  const duration = rand(20, 45);
  const rotation = rand(-30, 30);
  const scale = rand(0.6, 1.2);
  const opacity = rand(0.03, 0.12); // 👈 hlavne toto

  heart.style.width = size + "px";
  heart.style.height = size + "px";
  heart.style.left = left + "vw";
  heart.style.top = "110vh";

  heart.style.setProperty("--rot", rotation + "deg");
  heart.style.setProperty("--scale", scale);
  heart.style.setProperty("--opacity", opacity);

  heart.animate(
    [
      {
        transform: `translateY(0) rotate(${rotation}deg) scale(${scale})`
      },
      {
        transform: `translateY(-140vh) rotate(${rotation}deg) scale(${scale})`
      }
    ],
    {
      duration: duration * 1000,
      easing: "linear",
      iterations: Infinity
    }
  );

  heartsBg.appendChild(heart);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// init – postupne, nech to nevybuchne naraz
for (let i = 0; i < HEART_COUNT; i++) {
  setTimeout(createHeart, i * 900);
}
