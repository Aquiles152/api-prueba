import express from "express";
import bodyParser from "body-parser";
import cors from "cors";


let api = 'RGAPI-5511e4bb-2454-4751-b434-d26a521ea2f2';
let users = [];

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getListadoPorRango(rango, minirango, page) {
  const url = `https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${rango}/${minirango}?page=${page}&api_key=${api}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return data; // ✅ devuelve los datos correctamente
  } catch (error) {
    console.error('❌ Error obteniendo datos de Riot API:', error);
    return []; // devuelve array vacío para no romper el flujo
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
    res.json({cantidadUsuarios: users.length});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los perfiles" });
  }
});

// app.get("/books/:id", (req, res) => {
//   const data = readData();
//   const id = parseInt(req.params.id);
//   const book = data.books.find((book) => book.id === id);
//   res.json(book);
// });

// app.post("/books", (req, res) => {
//   const data = readData();
//   const body = req.body;
//   const newBook = {
//     id: data.books.length + 1,
//     ...body,
//   };
//   data.books.push(newBook);
//   writeData(data);
//   res.json(newBook);
// });

// app.put("/books/:id", (req, res) => {
//   const data = readData();
//   const body = req.body;
//   const id = parseInt(req.params.id);
//   const bookIndex = data.books.findIndex((book) => book.id === id);
//   data.books[bookIndex] = {
//     ...data.books[bookIndex],
//     ...body,
//   };
//   writeData(data);
//   res.json({ message: "Book updated successfully" });
// });

// app.delete("/books/:id", (req, res) => {
//   const data = readData();
//   const id = parseInt(req.params.id);
//   const bookIndex = data.books.findIndex((book) => book.id === id);
//   data.books.splice(bookIndex, 1);
//   writeData(data);
//   res.json({ message: "Book deleted successfully" });
// });

app.listen(3000, async () => {
  console.log("Server listening on port 3000");
  for (let index = 1; index <= 680; index++) {
    await sleep(2000);
    let perfiles = await getListadoPorRango('IRON', 'IV', index)
    console.log(perfiles)
    if (perfiles && perfiles?.length) {
      perfiles.forEach(perfil => {
        users.push(perfil);
      });
    }
    
  }
});





