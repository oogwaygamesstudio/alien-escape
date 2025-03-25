document.addEventListener("keydown", function(event) {
    if (event.key === " " || event.key === "ArrowUp") {
        jump();
    }
});

function jump() {
    let dino = document.getElementById("dino");
    if (!dino.classList.contains("jump")) {
        dino.classList.add("jump");
        setTimeout(function() {
            dino.classList.remove("jump");
        }, 600); // Adjusted to match the jump duration
    }
}
