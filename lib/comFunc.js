module.exports = function () {
// =============================================================================
  this.cleanString = function (input) {
  	if (input === undefined) { return ''; }
  	else {
  		var re = /(?![\x00-\x7F]|Ё|ё|[А-я])./g;
  		var output = input.replace(re, '');
  		return output;
  	}
  }
//==============================================================================
  this.timeConverter = function (UNIX_timestamp) {
  	var a = new Date(UNIX_timestamp);
  	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  	var year = a.getFullYear();
  	var month = months[a.getMonth()];
  	var date = a.getDate();
  	var hour = a.getHours();
  	var min = a.getMinutes();
  	var sec = a.getSeconds();
  	var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
  	return time;
  }
//==============================================================================
  this.sndMail = function (TO, FROM, SUBJ, BODY) {
  	TO = (TO.length > 200) ? 'mvmironov@alfabank.ru' : TO;
  	SUBJ = (SUBJ.length > 200) ? SUBJ.substring(0, 196) + ' ...' : SUBJ;
  	BODY = BODY.replace(/'/g, "''");
  	BODY = (BODY.length > 32000) ? BODY.substring(0, 31900) + ' ...<br>!!! сообщение слишком длинное и было обрезано !!!' : BODY;
  	FROM = (FROM.length > 30) ? FROM.substring(0, 26) + ' ...' : FROM;
  	var pgm = new xt.iPgm("SNDMIME", { "lib": "SHMS" });
  	pgm.addParam(TO, "200A");
  	pgm.addParam(FROM, "30A");
  	pgm.addParam(SUBJ, "200A");
  	pgm.addParam(BODY, "32000A");
  	xtconn.add(pgm);
  	xtconn.run(str => console.log(str));
  	return;
  }
//==============================================================================
  this.getProdServ = function() {
    // ping connection to LOCAL DB and reconnect if error
    var sql = "SELECT 1 FROM sysibm.sysdummy1";
    try {
      var stmt = new db.dbstmt(dbconn);
      stmt.execSync(sql, () => { });
      stmt.close();
    } catch (e) {
      console.log('getProdServ', timeConverter(Date.now()), 'Ping local connection error: ', e);
      dbconn.disconn();
      dbconn.close();
      global.dbconn = new db.dbconn();
      dbconn.conn("*LOCAL");
    }

    // заглушка для тестового режима
    if (configData.server.type.value === "TEST") {
      global.prodServer = configData.systemi.test.name;
      return;
    }
    // начальное заначение при первом подключении
    if (!global.prodServer) {
      global.prodServer = 'error';
    }
    // обновлять prodServer не чаще чем раз в 10 секунд, начальное значение при пером подключении
    if (!global.prodServerTS || Date.now() - global.prodServerTS > configData.limit.prodServerCache.value) {
      global.prodServerTS = Date.now();
    } else {
      return;
    }

    for (var i = 0; i <= configData.systemi.prod.name.length; i++) {
      if (prodServer != 'error') {
        try {
          var stmt = new db.dbstmt(dbconn);
          var sql = "SELECT " +
          "trim(tools.AR('ALFAQSYS','HAPARMDA2',41,10)) PRIMARY " +
          "FROM " + prodServer + ".sysibm.sysdummy1";
          var res = false;
          stmt.execSync(sql, function (rs) {
            if (rs.length != 0) {
              prodServer = rs[0].PRIMARY;
              res = true;
            }
          });
          stmt.close();
          if (res) return
        } catch (e) {
          console.log('getProdServ', timeConverter(Date.now()), 'Check HAPARMDA2 on server', prodServer, 'error:', e);
        }
      }
      if (configData.systemi.prod.name[i]) {
        prodServer =  configData.systemi.prod.name[i];
      } else {
        prodServer = 'error';
        console.log('getProdServ', timeConverter(Date.now()), 'Can not get server');
      }
    }
  }
//==============================================================================
  this.getDlgUser = function(key) {
  	// получаем массив делегирований
  	var dlgUser = [];
  	var stmt = new db.dbstmt(dbconn);
  	var sql = "select distinct plt.emplgn lgn " +
  		"from " + prodServer + "." + configData.library.mdm.name + ".rlsbjsbjpf ss " +
  			"join " + prodServer + "." + configData.library.mdm.name + ".FTPRSEMPPF plt on ss.rsbsjlt=plt.EMPSUBJ " +
  			"join " + prodServer + "." + configData.library.mdm.name + ".FTPRSEMPPF prt on ss.rsbsjrt=prt.EMPSUBJ " +
  		"where now() between ss.rsbbgn and ss.rsbend " +
  			"and prt.emplgn = '" + key + "'";
  	stmt.execSync(sql, function (rs, errMsg) {
  		if (rs.length != 0) {
  			for (var i = 0; i < rs.length; i++) {
  				dlgUser.push(rs[i].LGN);
  			}
  		}
  	});
  	stmt.close();
  	return dlgUser;
  }
//==============================================================================
  this.prcAs = function(cmd, paramArr) {
    return new Promise(function(resolve, reject) {
    	try {
    		var stmt = new db.dbstmt(dbconn);
    		stmt.prepare(cmd, () => {
    			stmt.bindParam(paramArr, () => {
    				stmt.execute((r) => {
              try {
                stmt.fetchAll((rs) => {
                  resolve(rs);
                  stmt.close();
                });
              } catch (e) {
                resolve(r);
              } finally {

              }
    				});
    			});
    		});
    	} catch (e) {
    		stmt.close();
        reject(new Error('ERROR!!!prcAs: ' + e));
    		console.log('ERROR!!!prcAs: ' + e);
    	}
    });
  }
//==============================================================================
  this.sqlAs = function(sql) {
  	return new Promise(function(resolve, reject) {
  		try {
  			var sqlA = new db.dbstmt(dbconn);
  			sqlA.exec(sql, function (rs) {
  				resolve(rs);
  				sqlA.close();
  				delete sqlA;
  			});
  		} catch (e) {
  			sqlA.close();
  			reject(new Error('ERROR!!!sqlAs: ' + e));
  			console.log('ERROR!!!sqlAs: ' + e);
  		}
  	});
  }
//==============================================================================
  this.nocache = function(res) {
    res.setHeader('Surrogate-Control', 'no-store')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
  }
//==============================================================================
  this.dspConfing = function () {
  var str, val;
  console.log('=------------------------------------------------------------------------------=');
  console.log('configData');
  console.log('=------------------------------------------------------------------------------=');
  for (var l1 in configData) {
    console.log('  ' + l1);
    str = '     ';
    for (var l2 in configData[l1]) {
      val = (configData[l1][l2].hasOwnProperty('name')) ? configData[l1][l2].name
          : (configData[l1][l2].hasOwnProperty('value')) ? configData[l1][l2].value
          : configData[l1][l2]
      str += l2 + '=' + val + '  ';
    }
    console.log(str);
  }
  console.log('=------------------------------------------------------------------------------=');
}
//==============================================================================
  this.sqlSync = function(sql) {

  	var sqlStm, result = "";

  	try {
  		sqlStm = new db.dbstmt(dbconn);
  		sqlStm.execSync(sql, function (rs, errMsg) {
  			if (errMsg) {
  				result = "ERROR: " + errMsg.toString();
  			} else {
  				if (rs.length != 0) {
  					result = JSON.stringify(rs);
  				}
  			}
  		});
  	} catch (e) {
  		result = "ERROR: " + e.toString();
  	}

  	sqlStm.close();
  	return result;

  }
//==============================================================================
  this.sqlS = function(sql) {

    var sqlStm, result;

    try {
      sqlStm = new db.dbstmt(dbconn);
      sqlStm.execSync(sql, function (rs, errMsg) {
        if (errMsg) {
          result = new Error('sqlS: ' + errMsg);
          sqlStm.close();
        } else {
          result = rs;
          sqlStm.close();
        }
      });
    } catch (e) {
      result = new Error('sqlS: ' + e);
      sqlStm.close();
    }
    return result;
  }
//==============================================================================
  this.actUsrs = function (my_user, usrs) {
    return new Promise(function(resolve, reject) {
      var res;
      //console.log('my_user:' + my_user, 'usrs:' + JSON.stringify(usrs));
      // только сотрудники с ролью ADMIN имеют право на просмотр пользователей.
      var sql = "select upper(URROLE) " +
      "from " + configData.library.node.name + ".UserRole " +
      "where upper(URUSER) = upper('" + my_user + "') " +
      "and URROLE in ('ADMIN')";
      var rs = sqlS(sql);
      if (rs instanceof Error) {
        res = 'Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs;
        reject(res);
      }
      if (rs.length == 0) {
        res = 'Error: ' + my_user + ' access deny. Только сотрудники с ролью ADMIN имеют право на просмотр пользователей.';
        resolve(res);
      }

      var arr = [];
      var len = Object.keys(usrs).length;
      for (var usr in usrs) {
        var strttim = timeConverter(new Date(new Date(usrs[usr].tim) - (12 * 60 * 60 * 1000)));
        var endtim = timeConverter(new Date(usrs[usr].tim));
        var sql = "SELECT " +
        "trim(US5DSC) \"fio\", " +
        "trim(US5DSC) \"obid\", " +
        "trim(IFNULL(US5BLK, 'Не определен')) \"block\", " +
        "trim(US5EML) \"email\" " +
        "FROM " + prodServer + "."+ configData.library.esa.name + ".AUUS51lf " +
        "WHERE UPPER(trim(US5MER)) LIKE upper('%\\"+ usrs[usr].user +"') " ;
        (function(username_p, userfullname_p, usr_p, strttim_p, endtim_p, url_p){
          sqlAs(sql).then(
            rs => {
              var fio = (rs[0] === undefined) ? 'нет в SM' : rs[0].fio;
              arr.push({prf: username_p, prffull: userfullname_p, coo: usr_p, fio: fio, strttim: strttim_p, endtim: endtim_p, url: url_p});
              if (arr.length == len) {
                const tbl = arr.map((con) => '<tr><td>' + con.prf + '</td><td>' + con.coo + '</td><td>' + con.fio + '</td><td>' + con.strttim + '</td><td>' + con.endtim + '</td><td>' + con.url + '</td></tr>');
                res ='<table><tr><th>Profile</th><th>Cookie</th><th>FIO</th><th>Str time</th><th>End time</th><th>URL</th></tr>' + tbl + '</table>';
                resolve(res);
              }
            },
            error => console.log('actUsrs err:' + error)
          );
        }) (usrs[usr].user, usrs[usr].userFull, usr, strttim, endtim, usrs[usr].url);
      }

    });

  }
//==============================================================================
}
