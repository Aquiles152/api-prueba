import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";


const uri = "mongodb+srv://aquileslorca15_db_user:7gkU3EGtj7DgDrd2@bduserslol.yh28l1i.mongodb.net/?appName=lol_datos?retryWrites=true&w=majority&tls=true";
let db
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    tlsAllowInvalidCertificates: true, // 👈 clave para Railway + Atlas
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    db = await client.db("lol_datos");
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.log("Error al iniciar la bd", error)
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}


let api = 'RGAPI-5511e4bb-2454-4751-b434-d26a521ea2f2';
let usuariosGlobales = [];
let listaPartidasGlobal = [];
let jugadorEnMira = { nombre: '', puuid: '', dano: 999999, tiempo: 0 }
let rangoUltimoJugador = '?'
let listaJugadores = [];

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

function jugadorExisteEnLista(jugadorSiguiente) {
  return listaJugadores.some((jugador) => jugador === jugadorSiguiente.puuid);
}

function escogerPartida(listaPartidas) {
  let siguientePartida = '';

  for (let index = 0; index < listaPartidas.length; index++) {
    const partidaActual = listaPartidas[index];

    // ⚙️ Si la partida NO está en la lista global → la usamos
    if (!listaPartidasGlobal.includes(partidaActual)) {
      listaPartidasGlobal.push(partidaActual);
      siguientePartida = partidaActual;
      break; // salimos del bucle
    }
  }

  // Si todas las partidas ya estaban en la lista global, devolvemos la primera como fallback
  return siguientePartida || listaPartidas[0];
}

function calcularPuntosRanked(tier, rank) {
  let puntos = 0;
  if (tier && rank) {
    switch (tier) {
      case 'IRON': puntos += 1; break;
      case 'BRONZE': puntos += 5; break;
      case 'SILVER': puntos += 9; break;
      case 'GOLD': puntos += 13; break;
      case 'PLATINUM': puntos += 17; break;
      case 'EMERALD': puntos += 21; break;
      case 'DIAMOND': puntos += 25; break;
      case 'MASTER': puntos += 29; break;
    }
    switch (rank) {
      case 'IV': puntos += 0; break;
      case 'III': puntos += 1; break;
      case 'II': puntos += 2; break;
      case 'I': puntos += 3; break;
    }
  }
  return puntos;
}

function traductorLinea(linea) {
  switch (linea) {
    case 'TOP': return 'TOP';
    case 'JUNGLE': return 'JUNGLA';
    case 'MIDDLE': return 'MID';
    case 'BOTTOM': return 'ADC';
    case 'UTILITY': return 'SUPPORT';
  }
  return linea;

}

function traductorTierRanked(tier) {
  switch (tier) {
    case 'IV': return '4';
    case 'III': return '3';
    case 'II': return '2';
    case 'I': return '1';
  }
  return tier;

}



// FILTROS
const cantidadMinimaPartidas = 50;
const cantidadPartidasMiradas = 3;
const cantidadMinimaDias = 2; //SE PERMITE HOY + 1 DIA


// 🔹 Ejecución tipo "forkJoin" con control de page
async function buscarJugadores(puuid, rangoMedio, puuidSemilla) {
  let siguienteJugador = { nombre: '', puuid: '', dano: 999999, tiempo: 0, puntosRanked: 999 }
  listaJugadores.push(puuid)
  let res4 = await getPartidasJugador(puuid)
  if (res4) {
    let res5 = await getDatosPartida(escogerPartida(res4))
    if (res5 && res5.info) {
      for (const participante2 of res5.info.participants) {
        await sleep(200)
        const ranked = await getDatosRankedJugadorPorPuuid(participante2.puuid);
        if (ranked) {
          let tiempo = participante2.timePlayed;
          let dano = (participante2.totalDamageDealtToChampions + participante2.totalHealsOnTeammates + participante2.totalDamageShieldedOnTeammates);
          let mediaDano = (dano / tiempo);
          let flex = ranked.filter((ranked) => ranked?.queueType === 'RANKED_FLEX_SR')
          let rankedD = ranked.filter((ranked) => ranked?.queueType === 'RANKED_SOLO_5x5')
          let dataSoloQ = rankedD.length ? rankedD[0] : null;
          let dataFlex = flex.length ? flex[0] : null;

          let jugador = {
            nick: participante2.riotIdGameName + '#' + participante2.riotIdTagline,
            puuid: participante2.puuid,
            dmg: mediaDano.toFixed(1)
          }
          jugador.date = res5.info.gameCreation;
          jugador.line = participante2.individualPosition
          jugador.champ = participante2.championName;
          jugador.champId = participante2.championId;
          jugador.kda = participante2.kills + '/' + participante2.deaths + '/' + participante2.assists
          if (dataSoloQ) {
            jugador.lps = dataSoloQ?.leaguePoints
            jugador.tierSQ = dataSoloQ.tier
            jugador.rankSQ = dataSoloQ.rank
            jugador.wins = dataSoloQ.wins
            jugador.losses = dataSoloQ.losses
            jugador.winrate = parseFloat(((dataSoloQ.wins / (dataSoloQ.wins + dataSoloQ.losses)) * 100).toFixed(1));
            jugador.games = dataSoloQ.wins + dataSoloQ.losses;
            jugador.valorSQ = calcularPuntosRanked(jugador.tierSQ, jugador.rankSQ);
          }
          if (dataFlex) {
            jugador.tierF = dataFlex.tier
            jugador.rankF = dataFlex.rank
          }

          if (tiempo > 400 && comprobarFechaPartidaValidaEnRango(jugador.date, cantidadMinimaDias) && jugador.tierSQ) {
            guardarJugadorEnBD(jugador)
          }
          let puntajeMedio = rangoMedio
          let puntosRanked = jugador.valorSQ
          if (
            (!siguienteJugador.puuid ||
              Math.abs(puntosRanked - puntajeMedio) < Math.abs(siguienteJugador.puntosRanked - puntajeMedio)) &&
            !jugadorExisteEnLista(participante2) &&
            puntosRanked > 0
          ) {
            siguienteJugador = {
              nombre: `${participante2.riotIdGameName}#${participante2.riotIdTagline}`,
              puuid: participante2.puuid,
              dano: mediaDano,
              tiempo,
              puntosRanked
            };
          }
        }
      }
      if (siguienteJugador.puuid !== '') {
        jugadorEnMira = siguienteJugador;
        rangoUltimoJugador = siguienteJugador.puntosRanked + '';
        buscarJugadores(siguienteJugador.puuid, rangoMedio, puuidSemilla);

      } else {
        console.log('No se ha encontrado un nuevo siguiente Jugador, se vuelve a buscar', puuid)
        buscarJugadores(puuid, rangoMedio, puuidSemilla);
      }
    } else {
      console.log('No he encontrado ninguna partida para ver, Redirijo la busqueda', puuid)
      buscarJugadores(puuid, rangoMedio, puuidSemilla);
    }
  } else {
    console.log('EL JUGADOR QUE ESTABA BUSCANDO NO TIENE PARTIDAS', puuid)
    buscarJugadores(puuidSemilla, rangoMedio, puuidSemilla);
  }

  // const wr = cantidadPartidas > 0 ? (perfil.wins / cantidadPartidas) * 100 : 0;
  // const nuevoUsuario = {
  //   puuid: perfil.puuid,
  //   nick: `${datosJugador.gameName}#${datosJugador.tagLine}`,
  //   fechaUltimaPartida: primeraPartida.info.gameEndTimestamp,
  //   fechaUltimaPartidaString: convertirMilisegundosAFecha(primeraPartida.info.gameStartTimestamp),
  //   tier: perfil.tier,
  //   rank: perfil.rank,
  //   cantidadPartidas,
  //   wins: perfil.wins,
  //   losses: perfil.losses,
  //   wr: parseFloat(wr.toFixed(2))
  // };
}


async function getDatosJugador(puuid) {
  // 20000 CADA 10 SEGUNDOS
  const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}?api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error)
    return [];
  }
}

async function getListadoPorRango(rango, minirango, page) {
  // 50 CADA 10 SEGUNDOS // DEVUELVE 205 RESULTADOS POR PAGINA TOTAL 10.000 CADA 10 SEGUNDOS
  const url = `https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${rango}/${minirango}?page=${page}&api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error)
    return [];
  }
}

async function getPartidasJugador(puuid) {
  // 2000 CADA 10 SEGUNDOS
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=100&queue=420&type=ranked&api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error)
    return [];
  }
}


async function getDatosPartida(idPartida) {
  // 2000 CADA 10 SEGUNDOS
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/${idPartida}?api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error)
    return [];
  }
}

async function getDatosJugadorPorNombre(nombreConTag) {
  const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${nombreConTag.split('#')[0].trim()}/${nombreConTag.split('#')[1].trim()}?api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error)
    return [];
  }
}

async function getDatosRankedJugadorPorPuuid(puuid) {
  // 20.000 CADA 10 SEGUNDOS
  const url = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${api}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error)
    return [];
  }
}

async function guardarJugadorEnBD(jugador) {
  try {
    // Buscar por PUUID y actualizar o insertar
    const result = await db.collection("perfiles").updateOne(
      { puuid: jugador.puuid },  // Filtro
      { $set: jugador },         // Actualiza los campos con los nuevos datos
      { upsert: true }           // Si no existe, lo crea
    );

    if (result.upsertedCount > 0) {
      console.log(`🆕 Nuevo jugador insertado: ${jugador.nick} ${jugador.tierSQ} ${jugador.rankSQ}`);
    } else {
      console.log(`♻️ Jugador actualizado: ${jugador.nick} ${jugador.tierSQ} ${jugador.rankSQ}`);
    }
  } catch (error) {
    console.error("❌ Error al guardar jugador:", error);
  }
}


// 🟢 CREATE
async function crearPerfil(perfil) {
  const result = await db.collection("perfiles").insertOne(perfil);
  return result.insertedId;
}

// 🔵 READ (todos)
async function obtenerPerfiles() {
  return await db.collection("perfiles").find().toArray();
}

// 🔵 READ (por ID)
async function obtenerPerfilPorId(id) {
  return await db.collection("perfiles").findOne({ _id: new ObjectId(id) });
}

// 🟠 UPDATE
async function actualizarPerfil(id, nuevosDatos) {
  const result = await db.collection("perfiles").updateOne(
    { _id: new ObjectId(id) },
    { $set: nuevosDatos }
  );
  return result.modifiedCount > 0;
}

// 🔴 DELETE
async function eliminarPerfil(id) {
  const result = await db.collection("perfiles").deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}





const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to my first API with Node js!");
});


app.get("/perfiles", async (req, res) => {
  try {
    await crearPerfil({ datos: "abc" })
    res.json(usuariosGlobales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los perfiles" });
  }
});


// app.get("/perfilesFiltrados", (req, res) => {
//   try {
//     const {
//       wrLower, wrUpper,
//       nPartidasLower, nPartidasUpper,
//       rangoMinimo, rangoMaximo,
//       danoLower, danoUpper,
//       lvLower, lvUpper,
//       lpsLower, lpsUpper,
//       posicion,
//       diasMaximoBusqueda,
//       cantidadMaximaResultados, campeonId
//     } = req.query; 

//     const diasMilis = parseInt(diasMaximoBusqueda) * 24 * 60 * 60 * 1000;
//     const fechaMinima = Date.now() - diasMilis;

//     let filtrados = usuariosGlobales.filter(j => {
//       const wr = parseFloat(j.winrate || 0);
//       const games = parseInt(j.games || 0);
//       const dmg = parseFloat(j.dmg || 0);
//       const lps = parseInt(j.lps || 0);
//       const fechaPartida = parseInt(j.date || 0);
//       const tierValor = calcularPuntosRanked(j.tierSQ, j.rankSQ);

//       return (
//         wr >= parseFloat(wrLower) && wr <= parseFloat(wrUpper)
//         && games >= parseInt(nPartidasLower) && games <= parseInt(nPartidasUpper)
//         && tierValor >= parseInt(rangoMinimo) && tierValor <= parseInt(rangoMaximo)
//         && dmg >= parseFloat(danoLower) && dmg <= parseFloat(danoUpper)
//         && lps >= parseInt(lpsLower) && lps <= parseInt(lpsUpper)
//         && (!posicion || j.line?.toUpperCase() === posicion.toUpperCase())
//         && (!j.date || fechaPartida >= fechaMinima)
//         && (!campeonId || parseInt(campeonId) === 0 || j.champId === parseInt(campeonId))
//       );
//     });

//     filtrados = filtrados
//       .sort(() => Math.random() - 0.5)
//       .slice(0, parseInt(cantidadMaximaResultados) || 50);

//     res.json(filtrados);

//   } catch (error) {
//     console.error("Error filtrando perfiles:", error);
//     res.status(500).json({ error: "Error al filtrar los perfiles" });
//   }
// });


app.get("/perfilesFiltrados", async (req, res) => {

  try {
    const {
      wrLower, wrUpper,
      nPartidasLower, nPartidasUpper,
      rangoMinimo, rangoMaximo,
      danoLower, danoUpper,
      lvLower, lvUpper,
      lpsLower, lpsUpper,
      posicion,
      diasMaximoBusqueda,
      cantidadMaximaResultados, campeonId
    } = req.query;

    console.log(req.query)

    const fechaMinima = Date.now() - diasMaximoBusqueda * 24 * 60 * 60 * 1000;

    // 🔍 Filtros MongoDB directos
    const match = {
      winrate: { $gte: parseFloat(wrLower), $lte: parseFloat(wrUpper) },
      games: { $gte: parseInt(nPartidasLower), $lte: parseInt(nPartidasUpper) },
      lps: { $gte: parseInt(lpsLower), $lte: parseInt(lpsUpper) },
      valorSQ: { $gte: parseInt(rangoMinimo), $lte: parseInt(rangoMaximo) },
      date: { $gte: fechaMinima },
    };

    if (posicion) match["line"] = posicion.toUpperCase();
    if (campeonId && parseInt(campeonId) !== 0) match["champId"] = parseInt(campeonId);

    if (!db) {
      await run().catch(console.dir);
    }

    // 🔹 Traer máximo 1000 desde BD para no sobrecargar
    const candidatos = await db
      .collection("perfiles")
      .find(match)
      .sort({ fecha: -1 })
      .limit(15)
      .toArray();

    // 🔹 Si hay más de 50, elegimos aleatoriamente
    let seleccionados = candidatos;
    if (candidatos.length > cantidadMaximaResultados) {
      seleccionados = candidatos
        .sort(() => Math.random() - 0.5)
        .slice(0, cantidadMaximaResultados);
    }

    res.json(seleccionados);

  } catch (error) {
    console.error("Error filtrando perfiles:", error);
    res.status(500).json({ error: "Error al filtrar los perfiles" });
  }
});




app.listen(3001, async () => {
  console.log("Server listening on port 3000");
  let res1 = await getDatosJugadorPorNombre("QUE PASA NENG#JAJA");
  let puuid = res1.puuid;
  console.log(res1)
  await run().catch(console.dir);
  buscarJugadores(puuid, 1, puuid)
  buscarJugadores(puuid, 6, puuid)
  buscarJugadores(puuid, 11, puuid)
  buscarJugadores(puuid, 16, puuid)
  buscarJugadores(puuid, 21, puuid)
  buscarJugadores(puuid, 27, puuid)



  // buscarJugadores(puuid, 1, puuid)
  // buscarJugadores(puuid, 1, puuid)
  // buscarJugadores(puuid, 1, puuid)
  // buscarJugadores(puuid, 1, puuid)
  // buscarJugadores(puuid, 1, puuid)
  // buscarJugadores(puuid, 1, puuid)
});





