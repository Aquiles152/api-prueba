import express from "express";
import bodyParser from "body-parser";
import cors from "cors";


let api = 'RGAPI-5511e4bb-2454-4751-b434-d26a521ea2f2';
let users = [];

let divisionesPublicas = null;


let divisiones = [
  ['IRON', 'IV', 1],
  ['IRON', 'III', 1],
  ['IRON', 'II', 1],
  ['IRON', 'I', 1],
  ['BRONZE', 'IV', 1],
  ['BRONZE', 'III', 1],
  ['BRONZE', 'II', 1],
  ['BRONZE', 'I', 1],
  ['SILVER', 'IV', 1],
  ['SILVER', 'III', 1],
  ['SILVER', 'II', 1],
  ['SILVER', 'I', 1],
  ['GOLD', 'IV', 1],
  ['GOLD', 'III', 1],
  ['GOLD', 'II', 1],
  ['GOLD', 'I', 1],
  ['PLATINUM', 'IV', 1],
  ['PLATINUM', 'III', 1],
  ['PLATINUM', 'II', 1],
  ['PLATINUM', 'I', 1],
  ['EMERALD', 'IV', 1],
  ['EMERALD', 'III', 1],
  ['EMERALD', 'II', 1],
  ['EMERALD', 'I', 1],
  ['DIAMOND', 'IV', 1],
  ['DIAMOND', 'III', 1],
  ['DIAMOND', 'II', 1],
  ['DIAMOND', 'I', 1],
];


const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const convertirMilisegundosAFecha = (milisegundos) => {
  // Crear un objeto Date con los milisegundos
  const fecha = new Date(milisegundos);

  // Formatear la fecha
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const anio = fecha.getFullYear();
  const horas = fecha.getHours().toString().padStart(2, '0');
  const minutos = fecha.getMinutes().toString().padStart(2, '0');
  const segundos = fecha.getSeconds().toString().padStart(2, '0');

  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

const comprobarFechaPartidaValidaEnRango = (fechaPartidaNum, dias) => {
  const fechaActual = new Date();
  const fechaPartida = new Date(fechaPartidaNum);

  // 24 horas * 60 minutos * 60 segundos * 1000 milisegundos * número de días
  const MILISEGUNDOS_EN_UN_DIA = 24 * 60 * 60 * 1000 * dias;

  // Diferencia de tiempo en milisegundos entre hoy y la fecha de la partida
  const diferenciaTiempo = fechaActual.getTime() - fechaPartida.getTime();

  // Devuelve true si la diferencia es menor o igual al rango indicado
  return diferenciaTiempo <= MILISEGUNDOS_EN_UN_DIA;
}



// FILTROS
const cantidadMinimaPartidas = 100;
const cantidadPartidasMiradas = 3;
const cantidadMinimaDias = 7; //SE PERMITE HOY + 1 DIA


// 🔹 Ejecución tipo "forkJoin" con control de page
async function obtenerPerfilesDeTodasLasDivisiones() {
  const promesas = divisiones.map(async (division) => {
    const [tier, rank, page] = division;

    try {
      const perfiles = await getListadoPorRango(tier, rank, page);
      if (perfiles && perfiles.length > 0) {
        division[2] = page + 1;

        let usuarios = []

        for (const perfil of perfiles) {
          try {
            const cantidadPartidas = perfil.wins + perfil.losses;

            if (cantidadPartidas >= cantidadMinimaPartidas) {
              const partidasJugador = await getPartidasJugador(perfil.puuid, cantidadPartidasMiradas);

              if (partidasJugador && partidasJugador.length >= cantidadPartidasMiradas) {
                const primeraPartida = await getDatosPartida(partidasJugador[0]);

                if (primeraPartida?.info) {
                  const dentroRango = comprobarFechaPartidaValidaEnRango(
                    primeraPartida.info.gameStartTimestamp,
                    cantidadMinimaDias
                  );

                  if (dentroRango) {
                    const datosJugador = await getDatosJugador(perfil.puuid);
                    if (datosJugador) {
                      const wr = cantidadPartidas > 0 ? (perfil.wins / cantidadPartidas) * 100 : 0;
                      const nuevoUsuario = {
                        puuid: perfil.puuid,
                        nick: `${datosJugador.gameName}#${datosJugador.tagLine}`,
                        fechaUltimaPartida: primeraPartida.info.gameEndTimestamp,
                        fechaUltimaPartidaString: convertirMilisegundosAFecha(primeraPartida.info.gameStartTimestamp),
                        tier: perfil.tier,
                        rank: perfil.rank,
                        cantidadPartidas,
                        wins: perfil.wins,
                        losses: perfil.losses,
                        wr: parseFloat(wr.toFixed(2))
                      };
                      usuarios.push(nuevoUsuario)

                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error procesando perfil ${perfil.puuid}:`, error);
          }
        }
        return usuarios












      } else {
        division[2] = 1;
      }

    } catch (err) {
      console.error(`❌ Error en ${tier} ${rank} página ${page}:`, err.message);
      // reiniciamos para que vuelva a intentar desde la primera
      division[2] = 1;
      return [];
    }
  });

  const resultados = await Promise.all(promesas);
  const todosLosPerfiles = resultados.flat();

  console.log(`✅ Obtenidos ${todosLosPerfiles.length} perfiles`);
  return todosLosPerfiles;
}










async function refrescarJugadores() {


  // const tier = divisiones[contadoListaRefrescar][0];
  // const rank = divisiones[contadoListaRefrescar][1];

  // console.log(tier, rank, divisiones[contadoListaRefrescar][2], users.length);
  // const perfiles = await getListadoPorRango(tier, rank, divisiones[contadoListaRefrescar][2]++);

  let perfiles = await obtenerPerfilesDeTodasLasDivisiones()

  perfiles.forEach(perfil => {
    if (perfil && perfil.puuid) {
    const index = users.findIndex(u => u.puuid === perfil.puuid);
    if (index !== -1) {
      users[index] = perfil;
    } else {
      users.push(perfil);
    }
    }

  })
 
 
  // if (perfiles && perfiles.length) {
  //   for (const perfil of perfiles) {
  //     try {
  //       const cantidadPartidas = perfil.wins + perfil.losses;

  //       if (cantidadPartidas >= cantidadMinimaPartidas) {
  //         const partidasJugador = await getPartidasJugador(perfil.puuid, cantidadPartidasMiradas);

  //         if (partidasJugador && partidasJugador.length >= cantidadPartidasMiradas) {
  //           const primeraPartida = await getDatosPartida(partidasJugador[0]);

  //           if (primeraPartida?.info) {
  //             const dentroRango = comprobarFechaPartidaValidaEnRango(
  //               primeraPartida.info.gameStartTimestamp,
  //               cantidadMinimaDias
  //             );

  //             if (dentroRango) {
  //               const datosJugador = await getDatosJugador(perfil.puuid);
  //               if (datosJugador) {
  //                 const wr = cantidadPartidas > 0 ? (perfil.wins / cantidadPartidas) * 100 : 0;
  //                 const nuevoUsuario = {
  //                   puuid: perfil.puuid,
  //                   nick: `${datosJugador.gameName}#${datosJugador.tagLine}`,
  //                   fechaUltimaPartida: primeraPartida.info.gameEndTimestamp,
  //                   fechaUltimaPartidaString: convertirMilisegundosAFecha(primeraPartida.info.gameStartTimestamp),
  //                   tier: perfil.tier,
  //                   rank: perfil.rank,
  //                   cantidadPartidas,
  //                   wins: perfil.wins,
  //                   losses: perfil.losses,
  //                   wr: parseFloat(wr.toFixed(2))
  //                 };
  //                 const index = users.findIndex(u => u.puuid === perfil.puuid);
  //                 if (index !== -1) {
  //                   users[index] = nuevoUsuario;
  //                 } else {
  //                   users.push(nuevoUsuario);
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.error(`❌ Error procesando perfil ${perfil.puuid}:`, error);
  //     }
  //   }
  // }
}


async function getDatosJugador(puuid) {
  const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}?api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return [];
  }
}

async function getListadoPorRango(rango, minirango, page) {
  const url = `https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${rango}/${minirango}?page=${page}&api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return [];
  }
}

async function getPartidasJugador(puuid, cantidadPartidasMiradas) {
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${cantidadPartidasMiradas}&queue=420&type=ranked&api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return [];
  }
}


async function getDatosPartida(idPartida) {
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/${idPartida}?api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return [];
  }
}




const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to my first API with Node js!");
});


app.get("/perfiles", async (req, res) => {
  try {
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los perfiles" });
  }
});

app.get("/perfilesFiltrados", async (req, res) => {
  try {
    const { tier, rank } = req.query;

    if (!tier || !rank) {
      return res.status(400).json({ error: "Faltan parámetros: tier y rank son obligatorios" });
    }

    // Filtrar los usuarios que cumplan las condiciones
    const filtrados = users.filter(
      (u) => u.tier?.toUpperCase() === tier.toUpperCase() && u.rank?.toUpperCase() === rank.toUpperCase()
    );

    if (filtrados.length === 0) {
      return res.status(404).json({ message: "No se encontraron usuarios con esos parámetros" });
    }

    // Mezclar aleatoriamente y devolver 50 (o menos si hay menos)
    const mezclados = filtrados.sort(() => Math.random() - 0.5).slice(0, 50);

    res.json({
      totalEncontrados: filtrados.length,
      devueltos: mezclados.length,
      tier,
      rank,
      perfiles: mezclados
    });
  } catch (err) {
    console.error("❌ Error en /perfiles:", err);
    res.status(500).json({ error: "Error al obtener los perfiles" });
  }
});




app.listen(3000, async () => {
  console.log("Server listening on port 3000");
  // for (let index = 0; index < divisiones.length; index= index +4) {
  //   refrescarJugadores(index)
  //   refrescarJugadores(index + 1)
  //   refrescarJugadores(index + 2)
  //   await refrescarJugadores(index + 3)
  // }


  while (true) {
    await refrescarJugadores()
  }
});





