var express = require('express'),
	app = express(),
	port = 8081;	// Porta por defeito
var readline = require('readline');
var exec = require('child_process').exec,
    child;


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
	
//configuracao
app.configure(function() {
	app.use(express.bodyParser());
	app.use(function (req, res, next) {
	    res.setHeader('Server', 'RPi Radio station');

	    return next();
	});

	app.enable('trust proxy');
	app.disable('x-powered-by');

	app.use('/', app.router);
});

var args = process.argv.splice(2),
	p = null;

if (args.length > 0) {
	p = parseInt(args[0]);
	if( p )
		port = p ;

	p = null;
}


console.log('Escuta na porta: ' + port)
app.listen(port);


// Funcoes

function respondToJSON(req, res, out, statusCode) {
	var size;

	out = JSON.stringify( out );
	size = Buffer.byteLength( out, 'UTF-8' );

	res.writeHead( statusCode,
				   { 'Content-Type': 'application/json; charset=utf-8',
					 'Content-Length': size} );

	res.write( out );
	res.end();
}




/*
 *	Routes
 */
 

app.get('/ring',function (req,res) {
	child = exec('mpg321 serbiastrong.mp3 ',
		  function (error, stdout, stderr) {
   			 console.log('stdout: ' + stdout);
   			 console.log('stderr: ' + stderr);
   			 if (error !== null) {
      				console.log('exec error: ' + error);
   			 }

		});
	var out={};
	out.status="Ni0ce";
	respondToJSON(req,res,out,200);
});


 app.all('*', function (req, res) {

	console.log('Pedido não encontrado: ' + req.path + " [" + req.method + "]");

	respondToJSON( req, res, { error: 'Página não encontrada'}, 404 );
});



rl.on("line", function(cmd) {
  
  console.log(cmd );
     if (cmd=="exit")rl.close();
});


