var express = require('express'),
	app = express(),
	port = 8081;	// Porta por defeito
var readline = require('readline');
var exec = require('child_process').exec,spawn=require('child_process').spawn,
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


app.get('/play',function (req,res) {
	child=spawn("mpg321",["serbiastrong.mp3"]);
	var out={};
	out.status="Excelent choice!";
	respondToJSON(req,res,out,200);
});


app.get('/play/stop',function (req,res) {
	
	var out={};
	if (child )
	{
		child.kill("SIGSTOP");
		out.status="paused";
	}
	else
	{
		out.status="no music playing";
	}
	respondToJSON(req,res,out,200);
});

app.get('/play/resume',function (req,res) {
	
	var out={};
	if (child )
	{
		child.kill("SIGCONT");
		out.status="resuming";
	}
	else
	{
		out.status="no music playing";
	}
	respondToJSON(req,res,out,200);
});





 app.all('*', function (req, res) {

	console.log('Pedido n�o encontrado: ' + req.path + " [" + req.method + "]");

	respondToJSON( req, res, { error: 'P�gina n�o encontrada'}, 404 );
});



rl.on("line", function(cmd) {

  console.log(cmd );
  if (child )
      {
          if (cmd=="pause")
              {

                  child.kill("SIGSTOP");
                 console.log("x");
              }
        if (cmd=="resume")
            {
                    child.kill("SIGCONT");
                    console.log("x2");
            }
      }
  if (cmd=="exit")rl.close();
});


