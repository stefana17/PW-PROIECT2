const session = require("express-session"); //LABORATOR 11
const cookieParser = require('cookie-parser'); //LABORATOR 11
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
app.use(cookieParser()); //LABORATOR 11
const port = 6789;
const fs = require('fs');

//PENTRU CSS
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului
//este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client
//(e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în
//format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));

//Preluat din curs
app.use(session({ 
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000 // 1 ora
  }
}));

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello
//World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
//app.get('/', (req, res) => res.send('Hello World'));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția
//specificată

// Definire middleware
// variabila utilizator va fi accesibilă în toate ejs-urile
function myMiddleware(req, res, next) {
  // collect user if avanable
  var user = "";
  if (req.session.user) {
    res.locals.utilizator = req.session.user;
  }
  else {
    res.locals.utilizator = null;
  }
  // set res.locals
  next();
}

app.use('*', myMiddleware);

/*app.get('/', (req, res) => {
   res.render('index');
});*/

//variabila in care stochez produsele din baza de date
var listaProduse = [];

app.get('/', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();//baza de date
  const { utilizator } = req.cookies;
  // open database connection
  let db = new sqlite3.Database('cumparaturi.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQLite database.');

    // retrieve all objects from the 'produse' table
    db.all('SELECT * FROM produse', (err, rows) => {
      if (err) {
        res.render('index', { aux: `${utilizator}`, objects: listaProduse });
        return console.error(err.message);

      }
      listaProduse = rows;
      console.log(listaProduse);
      // render the 'index.ejs' template with the retrieved objects
      res.render('index', { aux: `${utilizator}`, objects: listaProduse });

      // close the database connection
      db.close((err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Closed the database connection.');
      });
    });
  });
});

let rawIntrebari = fs.readFileSync('intrebari.json');
const listaIntrebari = JSON.parse(rawIntrebari)["intrebari"];
//let rawUseri = fs.readFileSync('utilizatori.json');
//const listaUtilizatori = JSON.parse(rawUseri)["utilizatori"];

//PARTEA DE CHESTIONAR -> LABORATOR 10
app.get('/chestionar', (req, res) => {
  /*const listaIntrebari = [
  { 
     intrebare: 'Care din următoarele componente este responsabil pentru procesarea informațiilor într-un computer?',
  variante: ['Placa de bază', 'Procesorul', 'Placa video', 'RAM'],
  corect: 1
  },
  { 
     intrebare: 'Ce este RAM-ul?',
  variante: ['O placă grafică', 'O unitate de stocare', 'O memorie de acces aleatoriu', 'Un procesor'],
  corect: 2
  },
  { 
     intrebare: 'Ce este o unitate de sursă de alimentare?',
  variante: ['O unitate de stocare', 'O placă grafică', ' O componentă care furnizează puterea electrică necesară pentru toate componentele PC-ului', 'Un dispozitiv de ieșire'],
  corect: 2
  },
  { 
     intrebare: 'Care dintre următoarele componente este responsabil pentru gestionarea comunicării dintre diferitele componente ale unui computer?',
  variante: ['Procesorul', 'Placa de bază', 'Placa video', 'RAM'],
  corect: 1
  },
  { 
     intrebare: 'Care dintre următoarele componente este responsabil pentru gestionarea interacțiunii dintre un computer și perifericele sale, cum ar fi mouse-ul și tastatura?',
  variante: ['Procesorul', 'Placa de bază', 'Sursa de alimentație', 'Porturile de intrare/ieșire'],
  corect: 3
  },
  //...
  ];*/
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care
  //conține vectorul de întrebări
  res.render('chestionar', { intrebari: listaIntrebari });
});
app.post('/rezultat-chestionar', (req, res) => {
  var solutions = req.body;
  var corecte = 0;
  for (var index = 0; index < listaIntrebari.length; index++) {
    var current = solutions["intrebare-" + index];
    if (current == listaIntrebari[index].corect) {
      corecte++;
    }
  }
  //res.render('/rezultat-chestionar', {total: total, rezultat: corecte});
  res.redirect('/rezultat-chestionar?corecte=' + corecte);
});

app.get('/rezultat-chestionar', (req, res) => {
  var total = listaIntrebari.length;
  var corecte = req.query.corecte;
  res.render('rezultat-chestionar', { total: total, rezultat: corecte });
});

//CSS
app.get('/public/stil.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, '/public/stil.css'));
});

//PARTEA DE AUTENTIFICARE UTILIZATOR -> LABORATOR 11
app.get('/autentificare', (req, res) => {
  var displayEroare = " ";
  //res.render('autentificare');
  if (req.session.user) {
    delete req.session.user;
  }
  if (req.cookies['mesajEroare'] !== null) {
    displayEroare = req.cookies['mesajEroare']
  }
  res.clearCookie('mesajEroare').render('autentificare', { displayError: displayEroare });
});

app.post('/verificare-autentificare', (req, res) => {
  //var bodyy = req.body;
  console.log(req.body);
  //console.log(listaUtilizatori[0].parola)
  //console.log(listaUtilizatori[0].utilizator)
  let rawUseri = fs.readFileSync('utilizatori.json');
  const listaUtilizatori = JSON.parse(rawUseri)["utilizatori"];
  //se parcurge lista de utilizatori pentru a verifica că user-ul există
  for (var i = 0; i < listaUtilizatori.length; ++i) {
    if (req.body.numeUtilizator == listaUtilizatori[i].utilizator && req.body.parola == listaUtilizatori[i].parola) {
      //if(bodyy['nume'] == listaUtilizatori[0].utilizator && bodyy['parola'] == listaUtilizatori[0].parola){
      //res.redirect("/");
      //return;
      //res.cookie('nume', req.body['nume']);
      req.session.user = listaUtilizatori[i];
      delete req.session.user["parola"];
      res.clearCookie('mesajEroare');
      res.redirect('/');
      return;
    }
  }
  res.cookie('mesajEroare', 'Nume sau parolă invalidă!');
  console.log("Fail");
  //res.redirect('http://localhost:6789/');
  res.redirect('autentificare');
  //res.redirect("/autentificare");
});
/*app.post('/rezultat-chestionar', (req, res) => {
 console.log(req.body);
 res.send("formular: " + JSON.stringify(req.body));
});*/

//PARTEA DE BAZE DE DATE -> LABORATOR 12
//CREARE BD -> LABORATOR 12
app.get('/creare-bd', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();

  // open database connection
  let db = new sqlite3.Database('cumparaturi.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQLite database.');

    // create the 'produse' table
    db.run(`
       CREATE TABLE IF NOT EXISTS produse (
         id INTEGER PRIMARY KEY,
         nume TEXT,
         pret REAL,
        src_img TEXT
       )
     `, (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Table "produse" created.');

      // close the database connection
      db.close((err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Closed the database connection.');
      });
    });
  });

  const { utilizator } = req.cookies;
  res.redirect('/');
});

//INSERARE BD -> LABORATOR 12
app.get('/inserare-bd', (req, res) => {

  const sqlite3 = require('sqlite3').verbose();

  // open database connection
  let db = new sqlite3.Database('cumparaturi.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQLite database.');

    // create an array of objects to insert
    const objectsToInsert = [
      { nume: 'Placă de bază GIGABYTE', pret: 700, src_img: 'placadebaza.png' },
      { nume: 'Placă video OEM Nvidia', pret: 850, src_img: 'placavideo.png' },
      { nume: 'Placă sunet', pret: 350, src_img: 'placasunet.png' },
      { nume: 'Răcire CPU', pret: 250, src_img: 'racireCPU.png' },
      { nume: 'Placă I/O', pret: 100, src_img: 'placaio.png' }
    ];

    // insert objects into the 'produse' table
    objectsToInsert.forEach((obj) => {
      db.run(
        'INSERT INTO produse (nume, pret, src_img) VALUES (?, ?, ?)',
        [obj.nume, obj.pret, obj.src_img],
        function (err) {
          if (err) {
            return console.error(err.message);
          }
          console.log(`Inserted object with ID ${this.lastID}`);
        }
      );
    });

    // close the database connection
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Closed the database connection.');
    });
  });

  const { utilizator } = req.cookies;
  res.redirect('/');
});

//PARTEA DE CUMPĂRĂTURI -> LABORATOR 12
// Declare a global array to store the saved IDs
let savedObjectIDs = [];

app.post('/adauga-cos', (req, res) => {
  const idProdus = req.body.id;
  console.log(idProdus);
  // Add the ID to the global array
  savedObjectIDs.push(idProdus);
  console.log(savedObjectIDs);


  if (idProdus) {
    if (!req.session.cosCumparaturi)
      req.session.cosCumparaturi = [];

    let exist = false;

    // Verific daca perechea id-utilizator exista deja in cos
    req.session.cosCumparaturi.forEach((produsCos) => {
      if (produsCos["id"] == idProdus && produsCos["numeUtilizator"] == req.session.user.utilizator) {
        produsCos["nrProduse"]++;
        exist = true;
        return;
      }
    });

    if (exist === false) {  // Dacă nu există perechea, o adaug
      req.session.cosCumparaturi.push(
        {
          numeUtilizator: req.session.user.utilizator,
          id: idProdus,
          nrProduse: 1 //il adaug pentru prima oara
        }
      );
    }
  }
  console.log(req.session.cosCumparaturi);
  // Redirect back to the index page
  res.redirect('/');
});

//VIZUALIZARE-COȘ -> LABORATOR 12
app.get('/vizualizare-cos', (req, res) => {
  /*const sqlite3 = require('sqlite3').verbose();
  var Rows = null;
  // open database connection
  let db = new sqlite3.Database('cumparaturi.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
 
    // retrieve the saved objects from the 'produse' table based on the IDs in the global array
    const query = `SELECT * FROM produse WHERE id IN (${savedObjectIDs.join(',')})`;
    db.all(query, (err, rows) => {
      if (err) {
        console.error(err.message);
      }
      Rows = rows;
 
      // render the 'view.ejs' template with the retrieved objects
      //res.render('vizualizare-cos', { objects: rows });
 
      // close the database connection
      db.close((err) => {
        if (err) {
          console.error(err.message);
        }
        console.log('Closed the database connection.');
      });
    });
  });
  // render the 'view.ejs' template with the retrieved objects
   res.render('vizualizare-cos', { objects: Rows });*/

  //produsele utilizatorului curent
  var produseCos = [];
  //console.log(req.session.cosCumparaturi);
  console.log(listaProduse);
  if (req.session.cosCumparaturi && req.session.cosCumparaturi.length > 0) {
    req.session.cosCumparaturi.forEach((produs) => {
      if (produs.numeUtilizator == req.session.user.utilizator) {
        const i = listaProduse.find((item) => item.id == produs.id);
        console.log(i);
        i.nrProduse = produs.nrProduse;
        produseCos.push(i);
      }
    });
  }
  res.render("vizualizare-cos", { objects: produseCos });
});

/*app.get('/vizualizare-cos', (req, res) => {
  res.render('vizualizare-cos');
});*/
app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));

