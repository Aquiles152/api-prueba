import express from "express";
import bodyParser from "body-parser";
import cors from "cors";


let api = 'RGAPI-5511e4bb-2454-4751-b434-d26a521ea2f2';
let users = [];

let divisionesPublicas = null;


let divisiones = [];

const resetearDivisiones = () => {
  divisiones = [
  ['IRON', 'IV', []],
  ['IRON', 'III', []],
  ['IRON', 'II', []],
  ['IRON', 'I', []],
  ['BRONZE', 'IV', []],
  ['BRONZE', 'III', []],
  ['BRONZE', 'II', []],
  ['BRONZE', 'I', []],
  ['SILVER', 'IV', []], 
  ['SILVER', 'III', []],
  ['SILVER', 'II', []],
  ['SILVER', 'I', []],
  ['GOLD', 'IV', []],
  ['GOLD', 'III', []],
  ['GOLD', 'II', []],
  ['GOLD', 'I', []],
  ['PLATINUM', 'IV', []],
  ['PLATINUM', 'III', []],
  ['PLATINUM', 'II', []],
  ['PLATINUM', 'I', []],
  ['EMERALD', 'IV', []],
  ['EMERALD', 'III', []],
  ['EMERALD', 'II', []],
  ['EMERALD', 'I', []],
  ['DIAMOND', 'IV', []],
  ['DIAMOND', 'III', []],
  ['DIAMOND', 'II', []],
  ['DIAMOND', 'I', []],
  ]
}

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

async function refrescarJugadores(contadoListaRefrescar) {
  let terminado = false;
  let contador = 1;

  while (!terminado && contador < 3) {
    const tier = divisiones[contadoListaRefrescar][0];
    const rank = divisiones[contadoListaRefrescar][1];

    const perfiles = await getListadoPorRango(tier, rank, contador++);

    if (perfiles && perfiles.length) {
      console.log(tier, rank, contador, divisiones[contadoListaRefrescar][2].length);

      // 👇 Usamos for...of en lugar de forEach para que los awaits funcionen bien
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
                    divisiones[contadoListaRefrescar][2].push({
                      nick: `${datosJugador.gameName}#${datosJugador.tagLine}`,
                      fechaUltimaPartida: primeraPartida.info.gameEndTimestamp,
                      fechaUltimaPartidaString: convertirMilisegundosAFecha(
                        primeraPartida.info.gameStartTimestamp
                      ),
                      tier: perfil.tier,
                      rank: perfil.rank,
                      cantidadPartidas,
                      wins: perfil.wins,
                      losses: perfil.losses,
                      wr: parseFloat(wr.toFixed(2))
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando perfil ${perfil.puuid}:`, error);
        }
      }
    } else {
      // No hay más páginas → pasamos al siguiente rango
      // if (contadoListaRefrescar + 1 < divisiones.length) {
      //   console.log(`➡️ Pasando a ${divisiones[contadoListaRefrescar + 1][0]} ${divisiones[contadoListaRefrescar + 1][1]}`);
      //   await refrescarJugadores(contadoListaRefrescar + 1);
      // } else {
      //   console.log("✅ Todos los rangos completados");
      // }

      terminado = true;
    }
  }
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
    res.json({ divisionesPublicas: divisionesPublicas, divisiones: divisiones });
  } catch (err) {
    console.error(err);
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
    resetearDivisiones()
    console.log("reseteado", divisiones.length)
    for (let index = 0; index < divisiones.length; index++) {
      await refrescarJugadores(index)
    }
    divisionesPublicas = divisiones
  }
});





