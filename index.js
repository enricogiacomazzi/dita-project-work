import Fastify from "fastify";
import fastifyMysql from "@fastify/mysql";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import { join } from "desm";
import ejs from 'ejs';


// creo l'istanza di Fastify -------------------------------------------------------------

const app = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty'
        }
    }
});

// ---------------------------------------------------------------------------------------
// registro i plugins --------------------------------------------------------------------

// fastify static per gestire i contenuti statici (pagine html, css, immagini ecc...)
await app.register(fastifyStatic, {
    root: join(import.meta.url, 'assets'),
});

// fastify view per gestire le pagine dinamiche
await app.register(fastifyView, {
    engine: {
        ejs: ejs
    },
    root: join(import.meta.url, 'pages')
});

// fastify mysql per la connessione al database
const ip = 'localhost';
const username = 'root';
const password = 'password';
const dbName = 'monitoraggio_produzione';

await app.register(fastifyMysql, {
    connectionString: `mysql://${username}:${password}@${ip}/${dbName}`,
    promise: true
});

// ---------------------------------------------------------------------------------------

// registro le rotte ---------------------------------------------------------------------

// pagina rpincipale
app.get('/', async (req, res) => {
    // recuparo la connessione al DB
    const connection = await app.mysql.getConnection();
    // eseguo la query, il risultato sarà un array, il cui primo elemento e a sua volta
    // un array di oggetti che rappresentano le righe della query
    // le proprietà dei singoli oggetti sono il nome delle colonne
    const results = await connection.query('SELECT * FROM commesse;'); 
    // renderizzo la pagina passando le commesse
    return res.view('commesse.ejs', {commesse: results[0]});
});


// pagina dettaglio: specificando nel path un elemento con i due punti, posso usare
// quell'elemento come parametro, in questo caso il parametro si chiama id
app.get('/commesse/:id', async (req, res) => {
    // recupero l'id commessa
    const id = req.params.id;
    // recuparo la connessione al DB
    const connection = await app.mysql.getConnection();
    // eseguo le query in base al parametro
    // il parametro viene passato tramite ? per prevenire sql Injection

    // recupero il codice prodotto
    const tmp = await connection.query('SELECT codice_prodotto FROM commesse WHERE id_commessa = ?', [id]);
    const codice = tmp[0][0].codice_prodotto;

    // recupero le righe di produzione
    const results = await connection.query('SELECT * FROM produzione WHERE id_commessa = ?;', [id]); 
    return res.view('dettaglio.ejs', {codice: codice, produzione: results[0]});
});


// ---------------------------------------------------------------------------------------

// metto il server in ascolto ------------------------------------------------------------

await app.listen({port: 5000});

// ---------------------------------------------------------------------------------------



