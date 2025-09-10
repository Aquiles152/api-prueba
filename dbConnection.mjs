import mysql from 'mysql2/promise';

async function connect() {
  try {
    const connection = await mysql.createConnection({
      host: 'sql8.freesqldatabase.com',
      user: 'sql8798120',
      password: 'VQqmUWb64f',
      database: 'sql8798120',
    });
    console.log('Connection to MySQL established.');
    return connection;
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    throw error;
  }
}

export default connect;