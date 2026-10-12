// ==========================================
// AVATAR
// ==========================================

let selectedAvatar =
    "😎";


const nameInput =
    document.getElementById(
        "name"
    );


const roomInput =
    document.getElementById(
        "roomCode"
    );


document
    .querySelectorAll(
        ".avatar"
    )
    .forEach(button => {


        button.onclick =
            () => {


                document
                    .querySelectorAll(
                        ".avatar"
                    )
                    .forEach(item => {


                        item.classList.remove(
                            "selected"
                        );


                    });


                button.classList.add(
                    "selected"
                );


                selectedAvatar =
                    button.textContent
                        .trim();


            };


    });


// ==========================================
// SALVAR PERFIL
// ==========================================

function saveProfile() {


    const name =
        nameInput.value.trim();


    if (!name) {


        alert(
            "Digite seu nome."
        );


        nameInput.focus();


        return false;


    }


    sessionStorage.setItem(

        "leal_profile",

        JSON.stringify({


            name:
                name.substring(
                    0,
                    24
                ),


            avatar:
                selectedAvatar


        })

    );


    return true;


}


// ==========================================
// CRIAR SALA
// ==========================================

document.getElementById(
    "create"
).onclick =
    async () => {


        if (!saveProfile()) {

            return;

        }


        const button =
            document.getElementById(
                "create"
            );


        button.disabled =
            true;


        button.textContent =
            "Criando sala...";


        try {


            const response =
                await fetch(

                    "/api/rooms",

                    {

                        method:
                            "POST"

                    }

                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {


                throw new Error(
                    data.message ||
                    "Erro ao criar sala."
                );


            }


            if (data.hostToken) {
                sessionStorage.setItem(`hl_host_token_${data.code}`, data.hostToken);
            }

            window.location.href =
                "/room/" +
                data.code;


        } catch (error) {


            console.error(
                error
            );


            alert(
                "Não foi possível criar a sala."
            );


            button.disabled =
                false;


            button.innerHTML =
    '<span class="button-icon">＋</span>' +
    '<span>Criar nova sala</span>' +
    '<span class="button-arrow">→</span>';


        }


    };


// ==========================================
// ENTRAR EM SALA
// ==========================================

document.getElementById(
    "join"
).onclick =
    async () => {


        if (!saveProfile()) {

            return;

        }


        const code =
            roomInput.value
                .trim()
                .toUpperCase();


        if (!code) {


            alert(
                "Digite o código da sala."
            );


            roomInput.focus();


            return;


        }


        try {


            const response =
                await fetch(

                    "/api/rooms/" +
                    encodeURIComponent(
                        code
                    )

                );


            if (!response.ok) {


                alert(
                    "Sala não encontrada."
                );


                return;


            }


            window.location.href =
                "/room/" +
                encodeURIComponent(
                    code
                );


        } catch (error) {


            console.error(
                error
            );


            alert(
                "Erro ao entrar na sala."
            );


        }


    };


// ==========================================
// ENTER NO CÓDIGO
// ==========================================

roomInput.addEventListener(

    "keydown",

    event => {


        if (
            event.key ===
            "Enter"
        ) {


            document
                .getElementById(
                    "join"
                )
                .click();


        }


    }

);
