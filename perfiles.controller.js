const { ObjectId } = require("mongodb");
const { connectDB } = require("./db");

// 🟢 CREATE
async function crearPerfil(db, perfil) {
  const result = await db.collection("perfiles").insertOne(perfil);
  return result.insertedId;
}

// 🔵 READ (todos)
async function obtenerPerfiles(db) {
  return await db.collection("perfiles").find().toArray();
}

// 🔵 READ (por ID)
async function obtenerPerfilPorId(db, id) {
  return await db.collection("perfiles").findOne({ _id: new ObjectId(id) });
}

// 🟠 UPDATE
async function actualizarPerfil(db, id, nuevosDatos) {
  const result = await db.collection("perfiles").updateOne(
    { _id: new ObjectId(id) },
    { $set: nuevosDatos }
  );
  return result.modifiedCount > 0;
}

// 🔴 DELETE
async function eliminarPerfil(db, id) {
  const result = await db.collection("perfiles").deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

module.exports = {
  crearPerfil,
  obtenerPerfiles,
  obtenerPerfilPorId,
  actualizarPerfil,
  eliminarPerfil,
};