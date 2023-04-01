var net = require('net');
var xt = require('itoolkit');
var xtconn = new xt.iConn("*LOCAL");

var users = {};
var usersCookiesCount = 0;
var port;

function portNumber(par) {
  port = par;
}

function returnUsers() {
  return users;
};

function cb(str) {console.log(str);}

function clearCookiesArray() {
  for (autKey in users) {
    if(new Date(users[autKey].tim) < new Date()) {
      delete users[autKey];
    }
  }
  usersCookiesCount = 0;
};


function authorization(req, res, next) {
  var user = '';
  var userFull = '';
  // заглушка от ping запросов балансировщика
  if (req.connection.remoteAddress.substr(0,12)=='172.19.13.11' || req.connection.remoteAddress.substr(0,12)=='172.19.13.10') {
    next();
    return;
  }
  if (usersCookiesCount > 10) {
    clearCookiesArray();
  }
  var cookie = req.cookies['outCookie' + port];
  if (cookie === undefined || users[cookie] == undefined)
  {
    var autKey=Math.random().toString();
    autKey=autKey.substring(2,autKey.length);
    if (req.get('Authorization') == undefined) {
      res.writeHead(401, {'WWW-Authenticate': 'Negotiate'});
      res.end();
      return;
    };

    var client = new net.Socket();

    client.connect(8086, function() {
      client.write(req.get('Authorization').substring(10)+'\n');
    });

    client.on('data', function(data) {
      userFull += data;
    });

    client.on('close', function() {
      if (userFull.trim() == '') {
        console.log('KER ERR Time:' + timeConverter(Date.now()),
                  'IP:' + req.connection.remoteAddress.trim() + ' try ' + kerErrIP[req.connection.remoteAddress.trim()],
                  'URL:' + req.originalUrl,
                  "Tocken:" + req.get('Authorization').substring(10)+'\n');
        xtconn.add(xt.iCmd("OSD_REPORT/SNDMAILC TO(sshmakov@ALFABANK.RU) FROM(DevOpsServices) SUB('Kerberos error') " +
          "BODY('IP:" + req.connection.remoteAddress + " try " + kerErrIP[req.connection.remoteAddress.trim()] +
          "<br>URL:" + req.originalUrl +
          "<br>Tocken:" + req.get('Authorization').substring(10) + "') ", {exec:"cmd"}));
    	  xtconn.run(cb);
        res.end('Access deny');
        return;
      } else {
        user = userFull.split('@')[0];
        var tim = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
        console.log('KER SET Time:', timeConverter(Date.now()), ' From:', req.connection.remoteAddress, ' User:', user, ' Cookie = ' + autKey) ;
        res.cookie('outCookie' + port, autKey, { expires: tim, httpOnly: true });
        users[autKey] = {user: user, userFull: userFull, tim: tim + 1 * 60 * 1000, url: req.originalUrl};
        usersCookiesCount++;
        req.my_userFull = userFull;
        req.my_user = user;
        next();
      }
    });
  }
  else
  {
    users[cookie].url = req.originalUrl;
    req.my_userFull = users[cookie].userFull;
    req.my_user = users[cookie].user;
    next();
  }
};

function timeConverter(UNIX_timestamp) {
	var a = new Date(UNIX_timestamp);
	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var year = a.getFullYear();
	var month = months[a.getMonth()];
	var date = a.getDate();
	var hour = a.getHours();
	var min = a.getMinutes();
	var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + ('0' + hour).substr(0,2) + ':' + ('0' + min).substr(0,2) + ':' + ('0' + sec).substr(0,2);
	return time;
}//=================================================================================

module.exports.authorization = authorization;
module.exports.returnUsers = returnUsers;
module.exports.port = portNumber;
