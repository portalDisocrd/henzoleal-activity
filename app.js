const button = document.getElementById("startButton");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Criando sala...";

    try {
        const response = await fetch("/api/rooms", {
            method: "POST"
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error("Não foi possível criar a sala.");
        }

        window.location.href = `/room/${data.roomId}`;

    } catch (error) {
        console.error(error);

        status.textContent = "❌ Erro ao criar a sala.";

        button.disabled = false;
        button.textContent = "🎥 Criar sala";
    }
});