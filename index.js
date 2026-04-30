import Fastify from "fastify";
import fastifyMysql from "@fastify/mysql";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import fastifyFormbody from "@fastify/formbody";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
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

await app.register(fastifyFormbody);

await app.register(fastifyCookie, {
    secret: 'dfsdfgsdfg'
});

await app.register(fastifySession, {
    secret: 'hgtmr572guw94m10d75nqwezapf86v35nto2',
    cookie: {
        secure: false,
        // httpOnly: true,
        // sameSite: 'lax',
        // path: '/',
        // maxAge: 1000 * 60 * 60
    },
    saveUninitialized: false
});

// ---------------------------------------------------------------------------------------

// registro le rotte ---------------------------------------------------------------------

// pagina principale
app.get('/', async (req, res) => {

    // validazione utente loggato
    if(!req.session.user) {
        return res.redirect('/login.html');
    }

    // recuparo la connessione al DB
    const connection = await app.mysql.getConnection();

    // eseguo la query, il risultato sarà un array, il cui primo elemento e a sua volta
    // un array di oggetti che rappresentano le righe della query
    // le proprietà dei singoli oggetti sono il nome delle colonne
    const results = await connection.query(
        `select c.id_commessa, c.codice_prodotto, c.quantita_prevista, c.stato_commessa, 
        sum(p.pezzi_prodotti) - sum(p.pezzi_scartati) as totale_prodotti
        from commesse c left join produzione p on c.id_commessa = p.id_commessa
        group by c.id_commessa`
    ); 
    // renderizzo la pagina passando le commesse
    return res.view('commesse.ejs', {commesse: results[0]});
});


// pagina dettaglio: specificando nel path un elemento con i due punti, posso usare
// quell'elemento come parametro, in questo caso il parametro si chiama id
app.get('/commesse/:id', async (req, res) => {

    if(!req.session.user) {
        return res.redirect('/login.html');
    }


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
    const results = await connection.query('SELECT * FROM produzione WHERE id_commessa = ? AND stato_macchina = \'Running\';', [id]); 
    return res.view('dettaglio.ejs', {codice: codice, produzione: results[0]});
});


app.post('/pippo', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;
    const connection = await app.mysql.getConnection();
    const results = await connection.query(
        `SELECT * FROM utenti WHERE username = ? AND password = ?;`, [username, password]
    );

    const user = results[0][0];

    if(!user) {
        res.redirect('/unauth.html');
        return;
    }


    req.session.user = user;
    res.redirect('/');
});



// ---------------------------------------------------------------------------------------

// metto il server in ascolto ------------------------------------------------------------

await app.listen({port: 5000});

// ---------------------------------------------------------------------------------------



