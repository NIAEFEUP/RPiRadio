var express = require('express'),
	readline = require('readline'),
	fs=require('fs');
	app = express(),
	port = 8080;	// Porta por defeito

var exec = require('child_process').exec,
	spawn=require('child_process').spawn,
    player=null,
    ringer=null;
   
var playStatus=0,playList=[],playHistory=[];
//playstatus, 0-> no file, 1-> playing, 2-> paused
var playMode=1;
//playmode 1->FM,2->MPG321,3->broadcast stream, to be implemented later


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
//configuracao
app.configure(function() {
    app.engine('html', require('ejs').renderFile);

    app.use(express.bodyParser({ keepExtensions: true, uploadDir: 'tmp/' }));

    //app.use(express.directory(__dirname+'/public'));

    app.use(express.static(__dirname+'/public'));

    app.set('view engine', 'ejs');

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


console.log('Escuta na porta: ' + port);
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




function play(music)
{
	console.log("playing:",music.name, music.path);
	if (playMode==1) // FM transmiter
		player=exec("avconv -i "+music.path+" -ac 1 -ar 22050 -b 352k -f wav - | sudo ./pifm - 100.0" );
	else if (playMode==2) // Audio Line Output
		player=spawn("mpg321",[music.path]); //colunas do RPI
	//this else is for testing purposes
	else player=spawn("sudo ./pifm tmp/audio.wav 100.0");
	player.on("exit",function(code,signal){
		console.log("player finish");
		var music=playList.shift();
		fs.unlink(music.path);
		playHistory.push(music.name);//.shift -> same as queue.pop, remove current file from list, add it to top of history
		if (playList.length==0)
		{
			playStatus=0;
			player=null;
		}
		else
		{ 
			play(playList[0]);
		}
	});
	playStatus=1;
}


/*
 *	Routes
 */


app.post('/ring',function (req,res) {
	if (!ringer) //do not ring if already ringing
	{
		console.log("ringing");
		if (playStatus==1)
		{
			console.log("pause for ring");
			player.kill("SIGSTOP");	
		}
		setTimeout(function(){
			ringer=spawn("mpg321",["ringdingding.mp3"]);
			ringer.on("exit",function(code,signal){
				if (playStatus==1)
				{
					player.kill("SIGCONT");
				}
				console.log("ringer exit");
				ringer=null;
			});
		},100);
	}
	var out={};
	out.status="Ringing";
	res.redirect('/');
});


app.get('/',function(req,res)
{
	res.render('index',{'playStatus':playStatus,'playList':playList,'playHistory':playHistory});
});

app.post('/play',function(req,res)
{
	var music={};
	music.name=req.files.music.name;
	music.path=req.files.music.path;
	var out={};
	
	if (!music.name||!music.name.match(/.mp3$/))
	{	
		fs.unlink(music.path);
		console.log("request not mp3");
		res.redirect('/');
		return;
		
	}
	
	console.log("added playlist ",music.name);
	if (!player)
	{
		playList.push(music);
		play(music);
		out.status="Excelent choice!";
	}
	else
	{	
		if (playList.length>25)
		{
			out.status="Queue limit reached :(";
		}
		else
		{
			playList.push(music);
			out.status="In queue, but Excelent choice!";
			out.queuePosition=playList.length;
		}
	}
	res.redirect('/');
});

//local files only
/*app.get('/play/:file',function (req,res) {
	var file=req.params.file;
	var out={};
	if (!player)
	{
		playList.push(file);
		play(file);
		out.status="Excelent choice!";
	}
	else
	{	
		if (playList.length>25)
		{
			out.status="Queue limit reached :(";
		}
		else
		{
			playList.push(file);
			out.status="In queue, but Excelent choice!";
			out.queuePosition=playList.length;
		}
	}
	respondToJSON(req,res,out,200);
});*/


app.post('/play/pause',function (req,res) {
	
	var out={};
	if (playStatus==1 )
	{
		player.kill("SIGSTOP");
		out.status="paused";
		playStatus=2;
	}
	else
	{
		out.status="no music playing";
	}
	res.redirect('/');
});

app.post('/play/resume',function (req,res) {
	
	var out={};
	if (playStatus==2 )
	{
		player.kill("SIGCONT");
		out.status="resuming";
		playStatus=1;
	}
	else
	{
		out.status="no music paused";
	}
	res.redirect('/');
});

app.post('/play/skip',function (req,res) {
	var out={};
	if (playStatus!=0&&playList.length>0)
	{
		player.kill("SIGKILL");
		out.status="skipped";
	}
	else out.status="no music to skip";
	res.redirect('/');
});

app.post('/playmode',function(req,res){ 
	var mode=Number(req.body.mode);
	if (mode&&mode>0&&mode<4) playMode=mode;
	res.redirect('/');
});

 app.all('*', function (req, res) {

	console.log('Pedido não encontrado: ' + req.path + " [" + req.method + "]");

	respondToJSON( req, res, { error: 'Página não encontrada'}, 404 );
});



rl.on("line", function(cmd) {

 	console.log(cmd );
	if (cmd=="testespawn") player=spawn("sudo ./pifm tmp/audio.wav 100.0");
  	if (cmd=="testeexec") player=exec("sudo ./pifm tmp/audio.wav 100.0");

	if (playStatus!=0 )
      {
          if (cmd=="pause")
              {

                  player.kill("SIGSTOP");
                 console.log("x");
              }
        if (cmd=="resume")
            {
                    player.kill("SIGCONT");
                    console.log("x2");
            }
      }
  if (cmd=="exit")rl.close();
});


